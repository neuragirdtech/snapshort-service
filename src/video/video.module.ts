import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { VideoProcessor } from './video.processor';
import { AiModule } from '../ai/ai.module';
import { FfmpegService } from './services/ffmpeg.service';
import { VideoStorageService } from './services/video-storage.service';
import { CloudStorageService } from './services/cloud-storage.service';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({
      name: 'video-processing',
    }),
  ],
  providers: [
    VideoService, 
    VideoProcessor,
    FfmpegService,
    VideoStorageService,
    CloudStorageService
    // Hapus TranscriptionService dari sini
  ],
  controllers: [VideoController],
})
export class VideoModule {}
