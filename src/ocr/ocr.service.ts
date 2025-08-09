import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createWorker } from 'tesseract.js';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Bill } from './entities/bill.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

    async getBillsForUser(user: User): Promise<Bill[]> {
        return this.billsRepository.find({
            where: { user: { id: user.id } },
            order: { createdAt: 'DESC' },
        });
    }

    async getBillById(billId: string, userId: string): Promise<any> { // Ubah return type ke any
        const bill = await this.billsRepository.findOne({
            where: { id: billId },
            relations: ['user'],
        });

        if (!bill) {
            throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
        }

        if (bill.user.id !== userId) {
            throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
        }

        const { user, ...billDetails } = bill;
        return billDetails;
    }

    async processAndSaveBill(imageBuffer: Buffer, user: User): Promise<any> {
        // 1. Unggah gambar ke Supabase
        const imageUrl = await this.uploadToSupabase(imageBuffer, user.id);

        // 2. Lanjutkan proses OCR dan AI
        const worker = await createWorker('ind');
        const ret = await worker.recognize(imageBuffer);
        const rawText = ret.data.text;
        await worker.terminate();
        const parsedData = await this.extractDataWithGemini(rawText);

        // 3. Siapkan data untuk disimpan
        const billData: Partial<Bill> = {
            items: parsedData.items,
            total: parsedData.total,
            storeName: parsedData.storeName,
            storeLocation: parsedData.location,
            imageUrl: imageUrl, // <-- Simpan URL dari Supabase
            rawText: rawText,
            user: user,
        };
        if (parsedData.date) {
            billData.purchaseDate = new Date(parsedData.date);
        }

        const bill = this.billsRepository.create(billData);

        try {
            const savedBill = await this.billsRepository.save(bill);
            const { user, ...billDetails } = savedBill;
            return billDetails;
        } catch (error) {
            console.error('Error saving bill:', error);
            throw new InternalServerErrorException('Gagal menyimpan struk ke database.');
        }
    }

    private async uploadToSupabase(buffer: Buffer, userId: string): Promise<string> {
        // Nama bucket harus sama dengan yang Anda buat di dashboard Supabase
        const bucketName = 'receipt-images'; 
        const fileName = `public/${userId}/${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;

        const { data, error } = await this.supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) {
            console.error('Error uploading to Supabase:', error);
            throw new InternalServerErrorException('Gagal mengunggah gambar ke storage.');
        }

        const { data: { publicUrl } } = this.supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);

        return publicUrl;
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
            const response = await firstValueFrom(
                this.httpService.post(url, { contents: [{ parts: [{ text: prompt }] }] }),
            );
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

    async saveSplitDetails(
        billId: string, 
        saveData: { splitDetails: any, total: number },
        userId: string
      ): Promise<Bill> {
        const bill = await this.billsRepository.findOneBy({ id: billId });
        if (!bill) {
          throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
        }
    
        const billWithOwner = await this.billsRepository.findOne({ where: { id: billId }, relations: ['user'] });
        if (!billWithOwner || billWithOwner.user.id !== userId) {
          throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
        }
    
        bill.splitDetails = saveData.splitDetails;
        bill.total = saveData.total;
    
        return this.billsRepository.save(bill);
      }

      async deleteBill(billId: string, userId: string): Promise<{ message: string }> {
        // 1. Verifikasi kepemilikan tagihan
        const bill = await this.billsRepository.findOne({
          where: { id: billId },
          relations: ['user'],
        });
    
        if (!bill) {
          throw new NotFoundException(`Tagihan dengan ID "${billId}" tidak ditemukan.`);
        }
    
        if (bill.user.id !== userId) {
          throw new UnauthorizedException('Anda tidak memiliki akses ke tagihan ini.');
        }
    
        // 2. Hapus gambar dari Supabase Storage (jika ada)
        if (bill.imageUrl) {
          try {
            // Ekstrak path file dari URL. Contoh: public/userId/filename.jpg
            const filePath = bill.imageUrl.substring(bill.imageUrl.indexOf('public/'));
            const bucketName = 'receipt-images';
            
            await this.supabase.storage.from(bucketName).remove([filePath]);
          } catch (storageError) {
            // Tetap lanjutkan meskipun gagal hapus file, tapi catat errornya
            console.error('Gagal menghapus file dari storage:', storageError);
          }
        }
    
        // 3. Hapus data dari database PostgreSQL
        await this.billsRepository.remove(bill);
    
        return { message: 'Transaksi berhasil dihapus.' };
      }
}