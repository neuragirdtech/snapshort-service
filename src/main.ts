import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  // AGAR FILE UPLOADS BISA DIAKSES VIA URL
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
