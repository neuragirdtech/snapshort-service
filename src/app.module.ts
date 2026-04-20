import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { VideoModule } from './video/video.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Load environment variables globally (following DekatinAja pattern)
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VideoModule,
    AiModule,
  ],
})
export class AppModule {}
