import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { createReadStream } from 'fs';

@Injectable()
export class AiService {
  private openai: OpenAI; // Direct OpenAI (ChatGPT)
  private genAI: GoogleGenerativeAI; // Gemini
  private fileManager: GoogleAIFileManager;

  constructor(private configService: ConfigService) {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    
    // Client untuk OpenAI Asli
    this.openai = new OpenAI({
      apiKey: openaiKey,
    });

    // Client untuk Gemini
    this.genAI = new GoogleGenerativeAI(geminiKey);
    this.fileManager = new GoogleAIFileManager(geminiKey);
  }

  /**
   * Strategi Utama: Gunakan Gemini untuk analisis video multimodal
   */
  async analyzeWithGemini(filePath: string, fileName: string) {
    console.log('Engine 1: Analyzing with Gemini...');
    const uploadResult = await this.fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: fileName,
    });

    let file = await this.fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await this.fileManager.getFile(uploadResult.file.name);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Watch this video and find 3 most viral moments (15-60s).
      Return ONLY a JSON object: 
      { "clips": [ { "title": "...", "startTime": 10.5, "endTime": 40.0, "reasoning": "...", "viralScore": 95 } ] }
    `;

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: prompt },
    ]);

    return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
  }

  /**
   * Strategi Cadangan: Transkripsi Whisper + Analisis GPT-4o-mini
   */
  async analyzeWithChatGPTFallback(filePath: string) {
    console.log('Engine 2: Falling back to ChatGPT (Whisper + GPT-4o)...');
    
    // 1. Transkripsi Audio
    const transcription = await this.openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
    });

    // 2. Analisis Teks dengan GPT-4o-mini
    const prompt = `
      Analyze this transcription and find 3 viral moments (15-60s).
      Transcription: ${transcription.text}
      Return ONLY a JSON object with a "clips" key containing an array.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"clips": []}');
  }

  /**
   * Fungsi Pintar yang otomatis pindah ke ChatGPT jika Gemini gagal
   */
  async processVideoWithFallback(filePath: string, fileName: string) {
    try {
      // Coba Gemini dulu
      return await this.analyzeWithGemini(filePath, fileName);
    } catch (error) {
      console.warn('Gemini failed, switching to OpenAI/ChatGPT...', error.message);
      try {
        // Jika Gemini error, pindah ke ChatGPT
        return await this.analyzeWithChatGPTFallback(filePath);
      } catch (fallbackError) {
        console.error('Both AI Engines failed:', fallbackError);
        throw new InternalServerErrorException('All AI engines are currently unavailable.');
      }
    }
  }
}
