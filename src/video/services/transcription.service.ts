import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createReadStream } from 'fs';

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async transcribe(audioPath: string): Promise<any> {
    try {
      console.log('[Whisper] Starting transcription...');
      const response = await this.openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json', // Agar mendapatkan timestamp per kata
        timestamp_granularities: ['word', 'segment'],
      });
      console.log('[Whisper] Transcription completed.');
      return response;
    } catch (error) {
      console.error('[Whisper] Error:', error);
      throw new InternalServerErrorException('Transcription failed');
    }
  }
}
