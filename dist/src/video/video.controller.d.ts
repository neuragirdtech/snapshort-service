import { Queue } from 'bullmq';
import { Request } from 'express';
import { Video } from '@prisma/client';
import { VideoService, FormattedVideo, FormattedClip } from './video.service';
import { VideoJobData } from './video.types';
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        email?: string;
    };
}
export declare class VideoController {
    private readonly videoService;
    private videoQueue;
    constructor(videoService: VideoService, videoQueue: Queue<VideoJobData>);
    uploadVideo(file: Express.Multer.File, req: AuthenticatedRequest): Promise<{
        message: string;
        videoId: string;
        status: string;
    }>;
    getMyVideos(req: AuthenticatedRequest): Promise<FormattedVideo[]>;
    getClips(id: string): Promise<FormattedClip[]>;
    updateTitle(id: string, req: AuthenticatedRequest): Promise<Video>;
    getVideoStatus(id: string, req: AuthenticatedRequest): Promise<{
        status: string;
    }>;
    getVideoDetail(id: string, req: AuthenticatedRequest): Promise<FormattedVideo | null>;
}
export {};
