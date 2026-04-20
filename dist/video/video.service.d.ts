import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class VideoService {
    private prisma;
    private aiService;
    private readonly rawPath;
    private readonly clipsPath;
    constructor(prisma: PrismaService, aiService: AiService);
    processVideo(file: Express.Multer.File, userId?: string): Promise<{
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
}
