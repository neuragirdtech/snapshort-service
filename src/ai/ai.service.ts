import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
  }

  async processVideo(
    filePath: string,
    fileName: string,
    userPrompt?: string,
  ): Promise<any> {
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') ||
      'gemini-3-flash-preview';

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    console.log(`[AI] Uploading video to Gemini (Model: ${modelName})...`);
    const uploadResult = await this.fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: fileName,
    });

    let file = await this.fileManager.getFile(uploadResult.file.name);
    while ((file.state as any) === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await this.fileManager.getFile(uploadResult.file.name);
    }

    const prompt = `
      You are an elite AI Video Editor. Your goal is to transform long videos into viral social media shorts (TikTok/Reels).

      TASK:
      1. ANALYZE the video content (visuals and audio).
      2. CATEGORIZE the video: Is it a "Talking Head" (educational/vlog), "Action/Dance", or "Family/Candid"?
      3. EXTRACT all the most engaging and viral moments you can find (usually 2-5 clips).
      4. FOR TALKING VIDEOS: Provide verbatim word-level subtitles. Keep the original language (Javanese, Indonesian, English, etc.).
      5. FOR NON-TALKING/CANDID VIDEOS: Provide "Storytelling Captions" that describe the mood or action (e.g., "The perfect chef! 🍳", "Pure happiness ❤️").
      
      ${userPrompt ? `USER INSTRUCTION: ${userPrompt}` : ''}

      OUTPUT FORMAT (JSON ONLY):
      {
        "clips": [
          {
            "startTime": number (seconds),
            "endTime": number (seconds),
            "title": "Short catchy title",
            "viralScore": number (1-100),
            "subtitles": [
              { "time": number (offset from clip start), "duration": number, "text": "string" }
            ]
          }
        ]
      }
    `;

    console.log(`[AI] Analyzing video using ${modelName}...`);
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        },
      },
      { text: prompt },
    ]);

    const response = JSON.parse(result.response.text());
    await this.fileManager.deleteFile(uploadResult.file.name);

    return response;
  }
}
