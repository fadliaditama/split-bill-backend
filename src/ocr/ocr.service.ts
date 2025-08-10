import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException, UnauthorizedException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Bill } from './entities/bill.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TesseractFix } from './tesseract-fix';

@Injectable()
export class OcrService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OcrService.name);
    private supabase: SupabaseClient;

    constructor(
        @InjectRepository(Bill)
        private billsRepository: Repository<Bill>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase configuration missing');
            throw new Error('Supabase URL and Key must be provided in .env file');
        }

        try {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.logger.log('Supabase client initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Supabase client:', error);
            throw new Error('Failed to initialize Supabase client');
        }
    }

    async onModuleInit() {
        try {
            this.logger.log('Initializing Tesseract worker...');
            await TesseractFix.preload();
            this.logger.log('Tesseract worker initialized successfully');
        } catch (error) {
            this.logger.error('Failed to preload Tesseract worker:', error);
            // Don't throw error here, service can still work without OCR
        }
    }

    async onModuleDestroy() {
        try {
            this.logger.log('Cleaning up Tesseract worker...');
            await TesseractFix.cleanup();
            this.logger.log('Tesseract worker cleaned up successfully');
        } catch (error) {
            this.logger.error('Error during Tesseract cleanup:', error);
        }
    }

    async getBillsForUser(user: User): Promise<Bill[]> {
        try {
            const bills = await this.billsRepository.find({
                where: { user: { id: user.id } },
                order: { createdAt: 'DESC' },
            });
            this.logger.log(`Retrieved ${bills.length} bills for user ${user.id}`);
            return bills;
        } catch (error) {
            this.logger.error(`Error retrieving bills for user ${user.id}:`, error);
            throw new InternalServerErrorException('Gagal mengambil daftar tagihan.');
        }
    }

    async getBillById(billId: string, userId: string): Promise<any> {
        try {
            const bill = await this.billsRepository.findOne({
                where: { id: billId },
                relations: ['user'],
            });

            if (!bill) {
                this.logger.warn(`Bill with ID ${billId} not found`);
                throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
            }

            if (bill.user.id !== userId) {
                this.logger.warn(`User ${userId} attempted to access bill ${billId} owned by user ${bill.user.id}`);
                throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
            }

            const { user: userData, ...billDetails } = bill;
            this.logger.log(`Bill ${billId} retrieved successfully for user ${userId}`);
            return billDetails;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Error retrieving bill ${billId}:`, error);
            throw new InternalServerErrorException('Gagal mengambil detail tagihan.');
        }
    }

    async processAndSaveBill(imageBuffer: Buffer, user: User): Promise<any> {
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new BadRequestException('Buffer gambar tidak boleh kosong.');
        }

        if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit
            throw new BadRequestException('Ukuran gambar terlalu besar. Maksimal 10MB.');
        }

        this.logger.log(`Starting bill processing for user ${user.id}`);

        try {
            // 1. Unggah gambar ke Supabase
            this.logger.log('Uploading image to Supabase...');
            const imageUrl = await this.uploadToSupabase(imageBuffer, user.id);
            this.logger.log('Image uploaded successfully');

            // 2. Lanjutkan proses OCR dan AI dengan TesseractFix
            this.logger.log('Starting OCR processing...');
            const rawText = await TesseractFix.recognizeText(imageBuffer);
            this.logger.log('OCR completed, extracting data with AI...');

            const parsedData = await this.extractDataWithGemini(rawText);
            this.logger.log('AI data extraction completed');

            // 3. Siapkan data untuk disimpan
            const billData: Partial<Bill> = {
                items: parsedData.items,
                total: parsedData.total,
                storeName: parsedData.storeName,
                storeLocation: parsedData.location,
                imageUrl: imageUrl,
                rawText: rawText,
                user: user,
            };

            if (parsedData.date) {
                billData.purchaseDate = new Date(parsedData.date);
            }

            const bill = this.billsRepository.create(billData);

            const savedBill = await this.billsRepository.save(bill);
            const { user: userData, ...billDetails } = savedBill;

            this.logger.log(`Bill processed and saved successfully with ID: ${savedBill.id}`);
            return billDetails;
        } catch (error) {
            this.logger.error(`Error processing bill for user ${user.id}:`, error);

            // Cleanup: hapus gambar yang sudah diupload jika ada error
            if (error instanceof Error && error.message.includes('upload')) {
                this.logger.warn('Skipping cleanup as upload failed');
            }

            throw error;
        }
    }

    private async uploadToSupabase(buffer: Buffer, userId: string): Promise<string> {
        const bucketName = 'receipt-images';
        const fileName = `public/${userId}/${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;

        this.logger.log(`Uploading file ${fileName} to bucket ${bucketName}`);

        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) {
                this.logger.error('Supabase upload error:', error);
                throw new InternalServerErrorException('Gagal mengunggah gambar ke storage.');
            }

            const { data: { publicUrl } } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(data.path);

            this.logger.log(`File uploaded successfully: ${publicUrl}`);
            return publicUrl;
        } catch (error) {
            this.logger.error('Error in uploadToSupabase:', error);
            if (error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Gagal mengunggah gambar ke storage.');
        }
    }

    private async extractDataWithGemini(
        text: string,
    ): Promise<{
        items: any[];
        total: number;
        storeName: string;
        location: string;
        date: string | null;
        tax: number;
        serviceCharge: number;
    }> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            this.logger.error('Gemini API key not configured');
            throw new InternalServerErrorException('Konfigurasi API key tidak lengkap.');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `
            Analisis teks dari struk belanja ini dan ekstrak informasi berikut ke dalam format JSON yang valid:
            1. "storeName": Nama toko atau merchant (contoh: "INDOMARET").
            2. "location": Alamat atau lokasi cabang dari toko (contoh: "CIDATAR - KAB GARUT").
            3. "date": Tanggal transaksi dalam format YYYY-MM-DD (contoh: "2020-11-07").
            4. "items": Sebuah array objek, di mana setiap objek berisi "name" (string), "quantity" (number), dan "price" (number, harga total untuk item itu).
            5. "total": Sebuah number yang merupakan total akhir dari struk.
            6. "tax": Jumlah total pajak (PPN/PB1). Jika tidak ada, kembalikan 0.
            7. "serviceCharge": Jumlah total biaya servis. Jika tidak ada, kembalikan 0.
            Jika salah satu informasi (storeName, location, date) tidak ditemukan, kembalikan nilai null untuk key tersebut.
            Hanya kembalikan objek JSON, tanpa penjelasan tambahan atau markdown formatting.
            Teks struk:
            ---
            ${text}
            ---
        `;

        try {
            this.logger.log('Sending request to Gemini API...');
            const response = await firstValueFrom(
                this.httpService.post(url, { contents: [{ parts: [{ text: prompt }] }] }),
            );

            if (!response.data.candidates || response.data.candidates.length === 0) {
                this.logger.error('Gemini API returned no candidates');
                throw new InternalServerErrorException('AI tidak dapat memproses teks dari struk ini.');
            }

            const jsonString = response.data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            const parsedData = JSON.parse(jsonString);

            this.logger.log('Gemini API response parsed successfully');
            return parsedData;
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                const status = error.response.status;
                const data = error.response.data.error;

                this.logger.error(`Gemini API error - Status: ${status}, Data:`, data);

                if (status === 400) throw new BadRequestException(`API Key tidak valid atau salah format.`);
                if (status === 503) throw new ServiceUnavailableException('Model AI sedang sibuk. Coba lagi.');
            }

            if (error instanceof SyntaxError) {
                this.logger.error('Failed to parse Gemini API response as JSON:', error);
                throw new InternalServerErrorException('Response dari AI tidak valid. Coba lagi.');
            }

            this.logger.error('Error communicating with Gemini API:', error);
            throw new InternalServerErrorException('Gagal berkomunikasi dengan layanan AI.');
        }
    }

    async saveSplitDetails(
        billId: string,
        saveData: { splitDetails: any, total: number },
        userId: string
    ): Promise<Bill> {
        try {
            const bill = await this.billsRepository.findOneBy({ id: billId });
            if (!bill) {
                this.logger.warn(`Bill with ID ${billId} not found for split details update`);
                throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
            }

            const billWithOwner = await this.billsRepository.findOne({ where: { id: billId }, relations: ['user'] });
            if (!billWithOwner || billWithOwner.user.id !== userId) {
                this.logger.warn(`User ${userId} attempted to update split details for bill ${billId} owned by user ${billWithOwner?.user.id}`);
                throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
            }

            bill.splitDetails = saveData.splitDetails;
            bill.total = saveData.total;

            const updatedBill = await this.billsRepository.save(bill);
            this.logger.log(`Split details updated successfully for bill ${billId}`);
            return updatedBill;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Error updating split details for bill ${billId}:`, error);
            throw new InternalServerErrorException('Gagal menyimpan detail split bill.');
        }
    }

    async deleteBill(billId: string, userId: string): Promise<{ message: string }> {
        this.logger.log(`User ${userId} attempting to delete bill ${billId}`);

        try {
            // 1. Verifikasi kepemilikan tagihan
            const bill = await this.billsRepository.findOne({
                where: { id: billId },
                relations: ['user'],
            });

            if (!bill) {
                this.logger.warn(`Bill with ID ${billId} not found for deletion`);
                throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
            }

            if (bill.user.id !== userId) {
                this.logger.warn(`User ${userId} attempted to delete bill ${billId} owned by user ${bill.user.id}`);
                throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
            }

            // 2. Hapus gambar dari Supabase Storage (jika ada)
            if (bill.imageUrl) {
                try {
                    this.logger.log(`Deleting image from storage for bill ${billId}`);
                    const filePath = bill.imageUrl.substring(bill.imageUrl.indexOf('public/'));
                    const bucketName = 'receipt-images';

                    await this.supabase.storage.from(bucketName).remove([filePath]);
                    this.logger.log(`Image deleted successfully from storage`);
                } catch (storageError) {
                    this.logger.error(`Failed to delete image from storage for bill ${billId}:`, storageError);
                    // Tetap lanjutkan meskipun gagal hapus file
                }
            }

            // 3. Hapus data dari database PostgreSQL
            await this.billsRepository.remove(bill);
            this.logger.log(`Bill ${billId} deleted successfully from database`);

            return { message: 'Transaksi berhasil dihapus.' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Error deleting bill ${billId}:`, error);
            throw new InternalServerErrorException('Gagal menghapus tagihan.');
        }
    }
}