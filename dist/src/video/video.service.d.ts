import { Video, Clip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FfmpegService } from './services/ffmpeg.service';
import { VideoStorageService } from './services/video-storage.service';
import { CloudStorageService } from './services/cloud-storage.service';
import { VideoJobData } from './video.types';
export interface FormattedClip extends Clip {
    filmstrip: string[];
}
export interface FormattedVideo extends Video {
    clips: FormattedClip[];
}
export declare class VideoService {
    private prisma;
    private aiService;
    private ffmpegService;
    private storageService;
    private cloudStorageService;
    constructor(prisma: PrismaService, aiService: AiService, ffmpegService: FfmpegService, storageService: VideoStorageService, cloudStorageService: CloudStorageService);
    createInitialVideo(file: Express.Multer.File, userId: string): Promise<Video>;
    processVideoJob(data: VideoJobData): Promise<void>;
    private processClip;
    private generateClipFrames;
    getUserVideos(userId: string): Promise<FormattedVideo[]>;
    getVideoDetail(videoId: string, userId?: string): Promise<FormattedVideo | null>;
    getClipsByVideoId(videoId: string): Promise<FormattedClip[]>;
    updateVideoTitle(videoId: string, title: string): Promise<Video>;
    private formatVideo;
    private formatClip;
}
