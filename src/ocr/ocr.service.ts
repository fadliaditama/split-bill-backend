import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createWorker } from 'tesseract.js';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Bill } from '../ocr/entities/bill.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OcrService {
    // Injeksi HttpService untuk melakukan panggilan API
    constructor(
        @InjectRepository(Bill)
        private billsRepository: Repository<Bill>,
        private readonly httpService: HttpService, // Tambahkan ini
    ) { }

    // Ganti logika lama dengan yang ini
    async processAndSaveBill(imageBuffer: Buffer, user: User): Promise<Bill> {
        // 1. Tetap gunakan Tesseract untuk mendapatkan teks mentah
        const worker = await createWorker('ind');
        const ret = await worker.recognize(imageBuffer);
        const rawText = ret.data.text;
        await worker.terminate();

        // 2. Panggil Gemini untuk mem-parsing teks mentah
        const parsedData = await this.extractDataWithGemini(rawText);

        // 3. Simpan ke Database
        const bill = this.billsRepository.create({
            items: parsedData.items,
            total: parsedData.total,
            rawText: rawText,
            user: user,
        });
        await this.billsRepository.save(bill);
        return bill;
    }

    private async extractDataWithGemini(text: string): Promise<{ items: any[]; total: number }> {
        const apiKey = 'AIzaSyCPy6M4CUmQ_WMAyn364B8qundtbvUwARQ'; // Simpan ini di environment variable
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `
      Tolong analisis teks dari struk belanja ini dan ekstrak informasi berikut ke dalam format JSON yang valid:
      1. "items": sebuah array objek, di mana setiap objek berisi "name" (string), "quantity" (number), dan "price" (number, harga total untuk item itu).
      2. "total": sebuah number yang merupakan total akhir dari struk.
      Hanya kembalikan objek JSON, tanpa penjelasan tambahan.

      Teks struk:
      ---
      ${text}
      ---
    `;

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            );

            // Ekstrak dan parse JSON dari respons Gemini
            const jsonString = response.data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonString);

        } catch (error) {
            console.error('Error saat memanggil Gemini API:', error.response?.data);
            throw new InternalServerErrorException('Gagal memproses data dengan AI.');
        }
    }
}