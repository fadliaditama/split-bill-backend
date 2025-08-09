import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { OcrModule } from './ocr/ocr.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'), // <-- Membaca dari environment variable
        autoLoadEntities: true,
        synchronize: true, // Untuk development, pertimbangkan untuk false di produksi nanti
        ssl: {
          rejectUnauthorized: false, // Diperlukan untuk koneksi ke Supabase/cloud DB
        },
      }),
    }),
    AuthModule,
    OcrModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }