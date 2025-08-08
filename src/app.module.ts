import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { OcrModule } from './ocr/ocr.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433, // Gunakan port 5433 sesuai docker-compose.yml
      username: 'user',
      password: 'password',
      database: 'splitbill',
      autoLoadEntities: true, // Otomatis memuat semua file *.entity.ts
      synchronize: true, // Otomatis membuat tabel DB (hanya untuk development!)
    }),
    AuthModule,
    OcrModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }