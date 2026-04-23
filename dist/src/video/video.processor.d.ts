import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { VideoService } from './video.service';
import { VideoJobData } from './video.types';
export declare class VideoProcessor extends WorkerHost {
    private readonly videoService;
    constructor(videoService: VideoService);
    process(job: Job<VideoJobData, any, string>): Promise<any>;
}
