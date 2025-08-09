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
        const dbHost = configService.get<string>('DB_HOST');
        const dbPort = configService.get<string>('DB_PORT');
        const dbUser = configService.get<string>('DB_USER');
        const dbPassword = configService.get<string>('DB_PASSWORD');
        const dbName = configService.get<string>('DB_NAME');

        // Lakukan pengecekan untuk memastikan semua variabel ada
        if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
          throw new Error('Database configuration variables are not set in .env file');
        }

        return {
          type: 'postgres',
          host: dbHost,
          port: parseInt(dbPort, 10), // Tambahkan radix 10 untuk praktik terbaik
          username: dbUser,
          password: dbPassword,
          database: dbName,
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