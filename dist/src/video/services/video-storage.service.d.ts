export declare class VideoStorageService {
    private readonly BASE_URL;
    readonly rawPath: string;
    readonly clipsPath: string;
    readonly thumbPath: string;
    constructor();
    private ensureDirectories;
    toUrl(path: string | null): string;
    getFileName(path: string): string;
}
