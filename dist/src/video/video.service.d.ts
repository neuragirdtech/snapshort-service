import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class VideoService {
    private prisma;
    private aiService;
    private readonly rawPath;
    private readonly clipsPath;
    private readonly thumbPath;
    private readonly BASE_URL;
    constructor(prisma: PrismaService, aiService: AiService);
    private toUrl;
    private getVideoMetadata;
    processVideo(file: Express.Multer.File, userId: string, provider?: string, apiKey?: string, userPrompt?: string, clipCount?: number, aspectRatio?: string, subtitleColor?: string): Promise<any>;
    private cutVideo;
    private generateFrame;
    getUserVideos(userId: string): Promise<any[]>;
    getVideoDetail(videoId: string, userId?: string): Promise<any>;
    getClipsByVideoId(videoId: string): Promise<any[]>;
    updateVideoTitle(videoId: string, title: string): Promise<{
        id: string;
        title: string;
        url: string;
        status: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private formatVideo;
    private formatClip;
}
