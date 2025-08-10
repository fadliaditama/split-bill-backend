# Split Bill Backend

Backend API untuk aplikasi split bill yang memungkinkan pengguna mengunggah struk belanja, melakukan OCR, dan membagi tagihan dengan AI.

## Fitur Utama

- 🔐 **Authentication & Authorization** - JWT-based auth dengan user management
- 📸 **Image Upload** - Upload gambar struk ke Supabase Storage
- 🔍 **OCR Processing** - Ekstraksi teks dari gambar menggunakan Tesseract.js
- 🤖 **AI Data Extraction** - Parsing data struk menggunakan Google Gemini AI
- 💰 **Bill Management** - CRUD operations untuk tagihan
- 👥 **Split Bill** - Fitur untuk membagi tagihan antar pengguna
- 🗄️ **Database** - PostgreSQL dengan TypeORM

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Storage**: Supabase Storage
- **OCR**: Tesseract.js
- **AI**: Google Gemini API
- **Authentication**: JWT
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase account
- Google Gemini API key

## Environment Variables

Buat file `.env` di root directory dengan konfigurasi berikut:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/split_bill_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Application Configuration
PORT=3000
NODE_ENV=development
```

## Setup Project

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Pastikan PostgreSQL database sudah berjalan dan buat database baru:

```sql
CREATE DATABASE split_bill_db;
```

### 3. Supabase Setup

1. Buat project baru di [Supabase](https://supabase.com)
2. Buat bucket storage dengan nama `receipt-images`
3. Set bucket policy untuk public access
4. Copy URL dan anon key ke file `.env`

### 4. Gemini API Setup

1. Dapatkan API key dari [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Copy API key ke file `.env`

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register user baru
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile

### OCR & Bills

- `POST /ocr/upload` - Upload dan proses struk
- `GET /ocr/bills` - Get semua tagihan user
- `GET /ocr/bills/:id` - Get detail tagihan
- `PUT /ocr/bills/:id/split` - Update split details
- `DELETE /ocr/bills/:id` - Hapus tagihan

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data transfer objects
│   ├── entities/        # User entity
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── ocr/                 # OCR & Bill management module
│   ├── entities/        # Bill entity
│   ├── ocr.controller.ts
│   ├── ocr.service.ts
│   ├── ocr.module.ts
│   └── tesseract-fix.ts # Tesseract wrapper
├── app.controller.ts     # Main app controller
├── app.service.ts        # Main app service
├── app.module.ts         # Root module
└── main.ts              # Application entry point
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Vercel

Project ini sudah dikonfigurasi untuk deployment di Vercel dengan file `vercel.json`.

### Environment Variables di Production

Pastikan semua environment variables sudah diset di dashboard Vercel:

- `DATABASE_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`

## Troubleshooting

### OCR Issues

- Pastikan Tesseract worker sudah ter-load dengan benar
- Check log untuk error messages
- Pastikan gambar yang diupload valid dan readable

### Supabase Issues

- Verify bucket `receipt-images` sudah dibuat
- Check bucket policies untuk public access
- Verify API keys sudah benar

### Gemini API Issues

- Check API key validity
- Verify quota dan rate limits
- Check network connectivity

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.
