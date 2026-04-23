import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private configService;
    private genAI;
    private fileManager;
    constructor(configService: ConfigService);
    processVideo(filePath: string, fileName: string, userPrompt?: string): Promise<any>;
}
