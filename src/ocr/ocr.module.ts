import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from '../ocr/entities/bill.entity';
import { AuthModule } from '../auth/auth.module'; // <-- Impor AuthModule
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Bill]), AuthModule, HttpModule], // <-- Tambahkan AuthModule
  controllers: [OcrController],
  providers: [OcrService],
})
export class OcrModule { }