import { BadRequestException, Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createWorker } from 'tesseract.js';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Bill } from '../ocr/entities/bill.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class OcrService {
    // Injeksi HttpService untuk melakukan panggilan API
    constructor(
        @InjectRepository(Bill)
        private billsRepository: Repository<Bill>,
        private readonly httpService: HttpService, // Tambahkan ini
    ) { }

    async getBillsForUser(user: User): Promise<Bill[]> {
        // Mencari semua 'bill' di database yang memiliki 'userId' yang sama
        // dengan id pengguna yang sedang login, diurutkan dari yang terbaru.
        return this.billsRepository.find({
            where: {
                user: {
                    id: user.id,
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    // Ganti logika lama dengan yang ini
    async processAndSaveBill(imageBuffer: Buffer, user: User): Promise<any> { // Ubah return type ke any
        const worker = await createWorker('ind');
        const ret = await worker.recognize(imageBuffer);
        const rawText = ret.data.text;
        await worker.terminate();

        const parsedData = await this.extractDataWithGemini(rawText);

        const billData: Partial<Bill> = {
            items: parsedData.items,
            total: parsedData.total,
            storeName: parsedData.storeName,
            storeLocation: parsedData.location,
            rawText: rawText,
            user: user,
        };

        if (parsedData.date) {
            billData.purchaseDate = new Date(parsedData.date);
        }

        const bill = this.billsRepository.create(billData);

        try {
            const savedBill = await this.billsRepository.save(bill);

            // --- INI PERBAIKANNYA ---
            // 1. Destructure 'user' dan simpan sisa propertinya di 'billDetails'
            const { user, ...billDetails } = savedBill;

            // 2. Kembalikan objek baru yang tidak mengandung properti 'user'
            return billDetails;
            // ------------------------

        } catch (error) {
            console.error('Error saving bill:', error);
            throw new InternalServerErrorException('Gagal menyimpan struk ke database.');
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
    }> {
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCPy6M4CUmQ_WMAyn364B8qundtbvUwARQ';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `
      Analisis teks dari struk belanja ini dan ekstrak informasi berikut ke dalam format JSON yang valid:
      1. "storeName": Nama toko atau merchant (contoh: "INDOMARET").
      2. "location": Alamat atau lokasi cabang dari toko (contoh: "CIDATAR - KAB GARUT").
      3. "date": Tanggal transaksi dalam format YYYY-MM-DD (contoh: "2020-11-07").
      4. "items": Sebuah array objek, di mana setiap objek berisi "name" (string), "quantity" (number), dan "price" (number, harga total untuk item itu).
      5. "total": Sebuah number yang merupakan total akhir dari struk.

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

            // Cek jika Gemini tidak bisa memproses (safety reasons, dll)
            if (!response.data.candidates || response.data.candidates.length === 0) {
                console.error('Gemini response blocked or empty:', response.data);
                throw new InternalServerErrorException('AI tidak dapat memproses teks dari struk ini.');
            }

            const jsonString = response.data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonString);

        } catch (error) {
            // Tangani error dari Axios (panggilan HTTP)
            if (error instanceof AxiosError && error.response) {
                const status = error.response.status;
                const data = error.response.data.error;
                console.error(`Error dari Gemini API (Status: ${status}):`, data.message);

                if (status === 400 && data.status === 'INVALID_ARGUMENT') {
                    throw new BadRequestException(`API Key tidak valid atau salah format. Pastikan sudah benar.`);
                }
                if (status === 503 || data.status === 'UNAVAILABLE') {
                    throw new ServiceUnavailableException('Model AI sedang sibuk (overloaded). Coba lagi beberapa saat.');
                }
            }

            // Error umum lainnya
            console.error('Terjadi error saat memanggil Gemini API:', error);
            throw new InternalServerErrorException('Gagal berkomunikasi dengan layanan AI.');
        }
    }
}