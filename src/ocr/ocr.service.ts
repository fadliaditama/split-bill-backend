import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Bill, BillStatus } from './entities/bill.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import FormData = require('form-data');

@Injectable()
export class OcrService {
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
            throw new Error('Supabase URL and Key must be provided in .env file');
        }
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async processAndSaveBill(imageBuffer: Buffer, user: User): Promise<any> {
        const imageUrl = await this.uploadToSupabase(imageBuffer, user.id);

        try {
            const rawText = await this.getTextFromImageWithOcrSpace(imageUrl);
            const parsedData = await this.extractDataWithGemini(rawText);
            
            if (!parsedData || !parsedData.items || parsedData.items.length === 0 || !parsedData.total || parsedData.total <= 0) {
                throw new Error('AI parsing returned invalid data (no items or zero total).');
            }

            const billData: Partial<Bill> = {
                items: parsedData.items,
                total: parsedData.total,
                storeName: parsedData.storeName,
                storeLocation: parsedData.location,
                imageUrl: imageUrl,
                rawText: rawText,
                user: user,
                status: BillStatus.COMPLETED,
            };
            if (parsedData.date) {
                billData.purchaseDate = new Date(parsedData.date);
            }

            const bill = this.billsRepository.create(billData);
            const savedBill = await this.billsRepository.save(bill);
            const { user: _, ...billDetails } = savedBill;
            return billDetails;

        } catch (error) {
            console.error('Gagal memproses struk:', error.message);
            const bill = this.billsRepository.create({
                user: user,
                imageUrl: imageUrl,
                status: BillStatus.FAILED,
                rawText: `Gagal memproses struk: ${error.message}`,
                items: [],
                total: 0,
            });
            await this.billsRepository.save(bill);
            throw new InternalServerErrorException('Gagal memproses struk setelah diunggah.');
        }
    }

    private async getTextFromImageWithOcrSpace(imageUrl: string): Promise<string> {
        const apiKey = this.configService.get<string>('OCR_SPACE_API_KEY');
        if (!apiKey) {
            throw new InternalServerErrorException('OCR.space API Key not configured in .env file.');
        }

        const formData = new FormData();
        formData.append('url', imageUrl);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2');

        try {
            const response = await firstValueFrom(
                this.httpService.post('https://api.ocr.space/parse/image', formData, {
                    headers: {
                        'apikey': apiKey,
                        ...formData.getHeaders(),
                    },
                }),
            );

            if (response.data.IsErroredOnProcessing || !response.data.ParsedResults?.[0]?.ParsedText) {
                throw new Error(response.data.ErrorMessage?.[0] || 'Gagal melakukan OCR pada gambar.');
            }
            
            return response.data.ParsedResults[0].ParsedText;
        } catch (error) {
            // Log error yang lebih detail untuk diagnosis
            if (error instanceof AxiosError) {
                console.error('Axios Error when calling OCR.space API:', error.message);
            } else {
                console.error('Unknown Error when calling OCR.space API:', error);
            }
            throw new InternalServerErrorException('Gagal berkomunikasi dengan layanan OCR.');
        }
    }

    private async uploadToSupabase(buffer: Buffer, userId: string): Promise<string> {
        const bucketName = 'receipt-images';
        const fileName = `public/${userId}/${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;
        const { data, error } = await this.supabase.storage.from(bucketName).upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });
        if (error) {
            throw new InternalServerErrorException('Gagal mengunggah gambar ke storage.');
        }
        const { data: { publicUrl } } = this.supabase.storage.from(bucketName).getPublicUrl(data.path);
        return publicUrl;
    }

    private async extractDataWithGemini(text: string): Promise<{ items: any[]; total: number; storeName: string; location: string; date: string | null; tax: number; serviceCharge: number; }> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const prompt = `
            Analisis teks dari struk belanja ini dan ekstrak informasi berikut ke dalam format JSON yang valid:
            1. "storeName": Nama toko atau merchant.
            2. "location": Alamat atau lokasi cabang dari toko.
            3. "date": Tanggal transaksi dalam format YYYY-MM-DD.
            4. "items": Sebuah array objek. Untuk setiap item, ekstrak:
                - "name": Nama lengkap barang.
                - "quantity": Jumlah barang yang dibeli.
                - "price": Harga total untuk item tersebut (kuantitas dikali harga satuan). PENTING: Selalu ambil angka paling kanan di baris item sebagai harga totalnya.
            5. "tax": Jumlah total pajak (PPN/PB1). Jika tidak ada, kembalikan 0.
            6. "serviceCharge": Jumlah total biaya servis. Jika tidak ada, kembalikan 0.
            7. "total": Total akhir dari struk.

            Jika salah satu informasi tidak ditemukan, kembalikan nilai null untuk key tersebut.
            Hanya kembalikan objek JSON, tanpa penjelasan tambahan atau markdown formatting.

            Teks struk:
            ---
            ${text}
            ---
        `;
        try {
            const response = await firstValueFrom(this.httpService.post(url, { contents: [{ parts: [{ text: prompt }] }] }));
            if (!response.data.candidates || response.data.candidates.length === 0) {
                throw new InternalServerErrorException('AI tidak dapat memproses teks dari struk ini.');
            }
            const jsonString = response.data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                const status = error.response.status;
                const data = error.response.data.error;
                if (status === 400) throw new BadRequestException(`API Key tidak valid atau salah format.`);
                if (status === 503) throw new ServiceUnavailableException('Model AI sedang sibuk. Coba lagi.');
            }
            throw new InternalServerErrorException('Gagal berkomunikasi dengan layanan AI.');
        }
    }

    async getBillsForUser(user: User): Promise<Bill[]> {
        return this.billsRepository.find({ where: { user: { id: user.id } }, order: { createdAt: 'DESC' } });
    }

    async getBillById(billId: string, userId: string): Promise<any> {
        const bill = await this.billsRepository.findOne({ where: { id: billId }, relations: ['user'] });
        if (!bill) { throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`); }
        if (bill.user.id !== userId) { throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.'); }
        const { user, ...billDetails } = bill;
        return billDetails;
    }

    async saveSplitDetails(billId: string, saveData: { splitDetails: any; total: number }, userId: string): Promise<Bill> {
        const bill = await this.billsRepository.findOne({ where: { id: billId }, relations: ['user'] });
        if (!bill) { throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`); }
        if (bill.user.id !== userId) { throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.'); }
        bill.splitDetails = saveData.splitDetails;
        bill.total = saveData.total;
        return this.billsRepository.save(bill);
    }

    async deleteBill(billId: string, userId: string): Promise<{ message: string }> {
        const bill = await this.billsRepository.findOne({ where: { id: billId }, relations: ['user'] });
        if (!bill) { throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`); }
        if (bill.user.id !== userId) { throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.'); }
        if (bill.imageUrl) {
            try {
                const filePath = bill.imageUrl.substring(bill.imageUrl.indexOf('public/'));
                await this.supabase.storage.from('receipt-images').remove([filePath]);
            } catch (storageError) {
                console.error('Gagal menghapus file dari storage:', storageError);
            }
        }
        await this.billsRepository.remove(bill);
        return { message: 'Transaksi berhasil dihapus.' };
    }
}