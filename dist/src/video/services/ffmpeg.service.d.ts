export declare class FfmpegService {
    getVideoMetadata(path: string): Promise<any>;
    extractAudio(videoPath: string, outputFolder: string): Promise<string>;
    cutVideo(input: string, output: string, start: number, duration: number): Promise<void>;
    generateFrame(input: string, outputFolder: string, fileName: string, timestamp: string): Promise<void>;
}
