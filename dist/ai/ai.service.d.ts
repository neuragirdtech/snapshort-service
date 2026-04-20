import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private configService;
    constructor(configService: ConfigService);
    processVideo(filePath: string, fileName: string, provider: string, customKey?: string): Promise<any>;
    private analyzeWithGemini;
    private analyzeWithChatGPT;
    private analyzeWithClaude;
}
