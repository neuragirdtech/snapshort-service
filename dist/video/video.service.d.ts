import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class VideoService {
    private prisma;
    private aiService;
    private readonly rawPath;
    private readonly clipsPath;
    constructor(prisma: PrismaService, aiService: AiService);
    processVideo(file: Express.Multer.File, userId?: string, provider?: string, apiKey?: string): Promise<{
        id: string;
        videoId: string;
        title: string;
        url: string;
        duration: number;
        score: number;
        subtitles: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private getVideoDuration;
    private cutVideo;
    getClipsByVideoId(videoId: string): Promise<{
        id: string;
        videoId: string;
        title: string;
        url: string;
        duration: number;
        score: number;
        subtitles: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getUserVideos(userId: string): Promise<({
        clips: {
            id: string;
            videoId: string;
            title: string;
            url: string;
            duration: number;
            score: number;
            subtitles: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        title: string;
        url: string;
        status: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateVideoTitle(videoId: string, title: string): Promise<{
        id: string;
        title: string;
        url: string;
        status: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
