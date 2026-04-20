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
    getMyVideos(req: any): Promise<({
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
    updateTitle(id: string, req: any): Promise<{
        id: string;
        title: string;
        url: string;
        status: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getVideoDetail(id: string, req: any): Promise<{
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
    }>;
}
