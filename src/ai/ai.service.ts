import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    // Sesuaikan dengan nama variabel di .env Anda: GEMINI_API_KEY
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processVideo(
    filePath: string,
    fileName: string,
    provider: string = 'gemini',
    apiKey?: string,
    userPrompt?: string,
    clipCount: number = 3,
  ) {
    // Ambil dari parameter atau dari .env (GEMINI_API_KEY)
    const key = apiKey || this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!key) {
      throw new InternalServerErrorException('Google AI API Key is missing in .env (GEMINI_API_KEY)');
    }

    const genAI = new GoogleGenerativeAI(key);
    const fileManager = new GoogleAIFileManager(key);

    // Upload video ke Gemini File API
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: fileName,
    });

    // Tunggu sampai Gemini selesai memproses video
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const finalPrompt = this.buildFinalPrompt(userPrompt || '', clipCount);

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: finalPrompt },
    ]);

    const response = await result.response;
    const rawText = response.text().trim();

    try {
      return JSON.parse(rawText);
    } catch (e) {
      console.error('JSON Parse Error:', rawText);
      throw new InternalServerErrorException('AI response was truncated or invalid');
    }
  }

  private buildFinalPrompt(userPrompt: string, clipCount: number): string {
    return `
      Analyze this video and identify ${clipCount} most viral and interesting clips.
      Focus on this topic: "${userPrompt || 'any interesting highlights'}".
      
      Return ONLY a JSON object in this format:
      {
        "clips": [
          {
            "startTime": number,
            "endTime": number,
            "title": "string",
            "viralScore": number,
            "subtitles": [
              { "time": number, "text": "string" }
            ]
          }
        ]
      }
    `;
  }
}
