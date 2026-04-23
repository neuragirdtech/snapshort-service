import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { VideoProcessor } from './video.processor'; // Import Processor baru
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({
      name: 'video-processing',
    }),
  ],
  providers: [VideoService, VideoProcessor], // Tambahkan Processor di sini
  controllers: [VideoController],
})
export class VideoModule {}
