import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private configService;
    private genAI;
    constructor(configService: ConfigService);
    processVideo(filePath: string, fileName: string, provider?: string, apiKey?: string, userPrompt?: string, clipCount?: number): Promise<any>;
    private buildFinalPrompt;
}
