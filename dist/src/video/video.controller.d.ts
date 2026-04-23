import { VideoService } from './video.service';
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    uploadVideo(file: Express.Multer.File, req: any): Promise<any>;
    getMyVideos(req: any): Promise<any[]>;
    getClips(id: string): Promise<any[]>;
    updateTitle(id: string, req: any): Promise<{
        id: string;
        title: string;
        url: string;
        status: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getVideoDetail(id: string, req: any): Promise<any>;
}
