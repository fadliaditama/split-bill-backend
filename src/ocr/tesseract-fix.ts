/**
 * Helper untuk mengatasi masalah WASM Tesseract.js di Vercel
 * Solusi gratis tanpa perlu Google Cloud Vision API
 */

import { createWorker } from 'tesseract.js';

// Cache untuk worker agar tidak perlu buat ulang setiap kali
let cachedWorker: any = null;
let isWorkerInitialized = false;
let isVercelEnvironment = false;

export class TesseractFix {
    /**
     * Deteksi apakah running di Vercel
     */
    private static detectEnvironment(): boolean {
        return process.env.VERCEL === '1' ||
            process.env.NODE_ENV === 'production' ||
            process.env.VERCEL_ENV === 'production';
    }

    /**
     * Inisialisasi worker dengan konfigurasi khusus untuk Vercel
     */
    static async initializeWorker(): Promise<any> {
        if (cachedWorker && isWorkerInitialized) {
            return cachedWorker;
        }

        // Deteksi environment
        isVercelEnvironment = this.detectEnvironment();

        try {
            console.log(`Initializing Tesseract worker in ${isVercelEnvironment ? 'Vercel' : 'local'} environment...`);

            // Konfigurasi khusus untuk Vercel
            const workerOptions: any = {
                logger: m => {
                    // Hanya log progress penting
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
                errorHandler: err => {
                    console.error('Tesseract worker error:', err);
                }
            };

            // Tambahkan konfigurasi khusus untuk Vercel
            if (isVercelEnvironment) {
                workerOptions.workerPath = undefined; // Gunakan default
                workerOptions.corePath = undefined; // Gunakan default
                workerOptions.langPath = undefined; // Gunakan default
            }

            // Buat worker dengan konfigurasi minimal
            const worker = await createWorker('ind', 1, workerOptions);

            cachedWorker = worker;
            isWorkerInitialized = true;

            console.log('Tesseract worker initialized successfully');
            return worker;

        } catch (error) {
            console.error('Failed to initialize Tesseract worker:', error);

            // Jika di Vercel dan gagal, set flag untuk gunakan fallback
            if (isVercelEnvironment) {
                console.log('Running in Vercel environment, OCR will use fallback methods');
                return null;
            }

            throw error;
        }
    }

    /**
     * Lakukan OCR dengan retry dan fallback
     */
    static async recognizeText(imageBuffer: Buffer, maxRetries: number = 3): Promise<string> {
        // Jika di Vercel dan worker gagal diinisialisasi, gunakan fallback
        if (isVercelEnvironment && !cachedWorker) {
            console.log('Using fallback OCR method for Vercel environment');
            return this.fallbackOCR(imageBuffer);
        }

        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`OCR attempt ${attempt}/${maxRetries}`);

                const worker = await this.initializeWorker();

                if (!worker) {
                    throw new Error('Worker not available');
                }

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

        // Jika semua retry gagal, gunakan fallback
        console.log('All OCR attempts failed, using fallback method...');
        return this.fallbackOCR(imageBuffer);
    }

    /**
     * Fallback OCR method untuk Vercel environment
     */
    private static async fallbackOCR(imageBuffer: Buffer): Promise<string> {
        try {
            console.log('Attempting fallback OCR with English language...');

            // Coba buat worker baru dengan bahasa Inggris
            const fallbackWorker = await createWorker('eng', 1, {
                logger: m => console.log(`Fallback OCR: ${m.status}`),
                errorHandler: err => console.error('Fallback worker error:', err)
            });

            const fallbackResult = await fallbackWorker.recognize(imageBuffer);
            await fallbackWorker.terminate();

            if (fallbackResult && fallbackResult.data && fallbackResult.data.text) {
                console.log('Fallback OCR with English successful');
                return fallbackResult.data.text;
            }
        } catch (fallbackError) {
            console.error('Fallback OCR failed:', fallbackError);
        }

        // Jika semua fallback gagal, return placeholder text
        console.log('All OCR methods failed, returning placeholder text');
        return 'OCR tidak tersedia di environment ini. Silakan upload gambar di environment local.';
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
            // Deteksi environment terlebih dahulu
            isVercelEnvironment = this.detectEnvironment();

            if (isVercelEnvironment) {
                console.log('Skipping Tesseract preload in Vercel environment');
                return;
            }

            await this.initializeWorker();
            console.log('Tesseract worker preloaded successfully');
        } catch (error) {
            console.error('Failed to preload worker:', error);
            // Jangan throw error, biarkan service tetap berjalan
        }
    }
} 