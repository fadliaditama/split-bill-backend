import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  SwaggerModule.setup('docs', app, document);

  // Port tidak perlu didefinisikan secara eksplisit, Vercel akan menanganinya
  await app.listen(process.env.PORT || 3000);
}
bootstrap();