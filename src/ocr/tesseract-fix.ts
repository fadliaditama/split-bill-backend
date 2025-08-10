/**
 * Helper untuk mengatasi masalah WASM Tesseract.js di Vercel
 * Solusi gratis tanpa perlu Google Cloud Vision API
 */

import { createWorker } from 'tesseract.js';

// Cache untuk worker agar tidak perlu buat ulang setiap kali
let cachedWorker: any = null;
let isWorkerInitialized = false;

export class TesseractFix {
    /**
     * Inisialisasi worker dengan konfigurasi khusus untuk Vercel
     */
    static async initializeWorker(): Promise<any> {
        if (cachedWorker && isWorkerInitialized) {
            return cachedWorker;
        }

        try {
            console.log('Initializing Tesseract worker...');

            // Buat worker dengan konfigurasi minimal
            const worker = await createWorker('ind', 1, {
                logger: m => {
                    // Hanya log progress penting
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
                errorHandler: err => {
                    console.error('Tesseract worker error:', err);
                }
            });

            cachedWorker = worker;
            isWorkerInitialized = true;

            console.log('Tesseract worker initialized successfully');
            return worker;

        } catch (error) {
            console.error('Failed to initialize Tesseract worker:', error);
            throw error;
        }
    }

    /**
     * Lakukan OCR dengan retry dan fallback
     */
    static async recognizeText(imageBuffer: Buffer, maxRetries: number = 3): Promise<string> {
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`OCR attempt ${attempt}/${maxRetries}`);

                const worker = await this.initializeWorker();

                // Lakukan OCR dengan timeout
                const result = await Promise.race([
                    worker.recognize(imageBuffer),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('OCR timeout')), 20000)
                    )
                ]);

                if (result && result.data && result.data.text) {
                    console.log(`OCR successful on attempt ${attempt}`);
                    return result.data.text;
                } else {
                    throw new Error('OCR result is empty');
                }

            } catch (error) {
                lastError = error;
                console.error(`OCR attempt ${attempt} failed:`, error.message);

                // Reset worker jika ada error
                if (cachedWorker) {
                    try {
                        await cachedWorker.terminate();
                        cachedWorker = null;
                        isWorkerInitialized = false;
                    } catch (terminateError) {
                        console.error('Error terminating worker:', terminateError);
                    }
                }

                // Tunggu sebentar sebelum retry
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        // Jika semua retry gagal, coba dengan bahasa Inggris sebagai fallback terakhir
        try {
            console.log('Trying final fallback with English language...');
            const fallbackWorker = await createWorker('eng');

            const fallbackResult = await fallbackWorker.recognize(imageBuffer);
            await fallbackWorker.terminate();

            if (fallbackResult && fallbackResult.data && fallbackResult.data.text) {
                console.log('Fallback OCR with English successful');
                return fallbackResult.data.text;
            }
        } catch (fallbackError) {
            console.error('Final fallback also failed:', fallbackError);
        }

        // Jika semua gagal, throw error
        throw new Error(`OCR failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Cleanup worker
     */
    static async cleanup(): Promise<void> {
        if (cachedWorker) {
            try {
                await cachedWorker.terminate();
                cachedWorker = null;
                isWorkerInitialized = false;
                console.log('Tesseract worker cleaned up');
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        }
    }

    /**
     * Preload worker untuk performa yang lebih baik
     */
    static async preload(): Promise<void> {
        try {
            await this.initializeWorker();
            console.log('Tesseract worker preloaded successfully');
        } catch (error) {
            console.error('Failed to preload worker:', error);
        }
    }
} 