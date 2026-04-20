import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

  async analyzeVideoWithGemini(filePath: string, fileName: string) {
    try {
      console.log('Uploading video to Gemini File API...');
      const uploadResult = await this.fileManager.uploadFile(filePath, {
        mimeType: 'video/mp4',
        displayName: fileName,
      });

      console.log(`Uploaded file: ${uploadResult.file.displayName} as ${uploadResult.file.uri}`);

      // Wait for the video to be processed by Gemini (crucial step)
      let file = await this.fileManager.getFile(uploadResult.file.name);
      while (file.state === 'PROCESSING') {
        process.stdout.write('.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await this.fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === 'FAILED') {
        throw new Error('Video processing failed on Gemini side');
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are a professional social media video editor.
        Watch this video and find 3 most viral moments (short clips, 15-60 seconds each).
        The result MUST be a JSON array of objects with the following keys:
        - title: a catchy headline
        - startTime: the start time in seconds
        - endTime: the end time in seconds
        - reasoning: why this part is viral
        - viralScore: score from 0-100
        - transcription: the transcription of what is said in this clip
        
        Return ONLY the JSON array. Do not include markdown code blocks.
      `;

      console.log('Gemini is analyzing the video...');
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
        { text: prompt },
      ]);

      const responseText = result.response.text();
      // Clean up markdown if AI includes it
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      throw new InternalServerErrorException('Failed to analyze video with Gemini');
    }
  }
}
