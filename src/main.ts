import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Mengizinkan request dari aplikasi lain (seperti Angular)
  app.enableCors();

  // Konfigurasi untuk dokumentasi API (Swagger)
  const config = new DocumentBuilder()
    .setTitle('Split Bill API')
    .setDescription('API untuk registrasi, login, dan pemrosesan struk.')
    .setVersion('1.0')
    .addBearerAuth() // Penting untuk testing endpoint terproteksi
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // Akses dokumentasi di http://localhost:3000/docs

  await app.listen(3000);
}
bootstrap();