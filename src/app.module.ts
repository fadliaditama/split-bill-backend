import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { OcrModule } from './ocr/ocr.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: true,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      },
    }),
    AuthModule,
    OcrModule,
    HttpModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }