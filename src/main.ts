import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Konfigurasi CORS yang lebih spesifik
  app.enableCors({
    origin: '*', // Izinkan semua origin, atau ganti dengan URL frontend Anda untuk keamanan
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Split Bill API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const customOptions = {
    // Memberitahu Swagger UI untuk memuat aset dari CDN online, bukan dari path lokal
    // Ini menyelesaikan masalah 404 di Vercel
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
    ],
  };

  // Gunakan opsi kustomisasi ini saat setup Swagger
  SwaggerModule.setup('docs', app, document, customOptions);

  // Port tidak perlu didefinisikan secara eksplisit, Vercel akan menanganinya
  await app.listen(process.env.PORT || 3000);
}
bootstrap();