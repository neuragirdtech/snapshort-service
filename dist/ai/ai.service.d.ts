import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
export declare class AiService {
    private configService;
    private openai;
    constructor(configService: ConfigService);
    transcribeVideo(filePath: string): Promise<OpenAI.Audio.Transcriptions.TranscriptionVerbose & {
        _request_id?: string | null;
    }>;
    analyzeTranscription(transcription: any): Promise<any>;
}
