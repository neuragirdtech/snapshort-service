import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { VideoService } from './video.service';

@Processor('video-processing')
export class VideoProcessor extends WorkerHost {
  constructor(private readonly videoService: VideoService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`[Queue] Processing job ${job.id} for video: ${job.data.videoId}`);
    
    try {
      await this.videoService.processVideoJob(job.data);
      console.log(`[Queue] Job ${job.id} completed successfully.`);
    } catch (error) {
      console.error(`[Queue] Job ${job.id} failed:`, error.message);
      throw error; 
    }
  }
}
