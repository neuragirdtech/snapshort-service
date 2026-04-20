import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Enable validation pipe with whitelisting (following DekatinAja pattern)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // Increase body limit for video uploads (following DekatinAja pattern)
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SnapCut Service is running on : ${await app.getUrl()}`);
}
bootstrap();
