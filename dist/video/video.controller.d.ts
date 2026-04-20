import { VideoService } from './video.service';
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    uploadVideo(file: Express.Multer.File): Promise<never[]>;
    getClips(id: string): Promise<any>;
}
