import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private configService;
    private openai;
    private genAI;
    private fileManager;
    constructor(configService: ConfigService);
    analyzeWithGemini(filePath: string, fileName: string): Promise<any>;
    analyzeWithChatGPTFallback(filePath: string): Promise<any>;
    processVideoWithFallback(filePath: string, fileName: string): Promise<any>;
}
