import { ConfigService } from '@nestjs/config';
export declare class TranscriptionService {
    private configService;
    private openai;
    constructor(configService: ConfigService);
    transcribe(audioPath: string): Promise<any>;
}
