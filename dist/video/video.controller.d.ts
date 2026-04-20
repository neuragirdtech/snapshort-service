import { VideoService } from './video.service';
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    uploadVideo(file: Express.Multer.File, req: any): Promise<{
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
    getClips(id: string): Promise<{
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
