import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import Anthropic from '@anthropic-ai/sdk';
import { createReadStream } from 'fs';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async processVideo(
    filePath: string, 
    fileName: string, 
    provider: string, 
    customKey?: string
  ) {
    console.log(`AI Processing with Provider: ${provider}`);

    // LOGIKA BERDASARKAN PROVIDER
    switch (provider) {
      case 'gemini':
        return this.analyzeWithGemini(filePath, fileName, customKey);
      case 'openai':
        return this.analyzeWithChatGPT(filePath, customKey);
      case 'claude':
        return this.analyzeWithClaude(filePath, customKey);
      default:
        return this.analyzeWithGemini(filePath, fileName); // Default fallback
    }
  }

  /**
   * GOOGLE GEMINI (Utama - Multimodal)
   */
  private async analyzeWithGemini(filePath: string, fileName: string, customKey?: string) {
    const key = customKey || this.configService.get<string>('GEMINI_API_KEY') || '';
    const genAI = new GoogleGenerativeAI(key);
    const fileManager = new GoogleAIFileManager(key);

    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: fileName,
    });

    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Watch this video and find 3 most viral moments (15-60s).
      Return ONLY a JSON object: 
      { "clips": [ { "title": "...", "startTime": 10.5, "endTime": 40.0, "viralScore": 95 } ] }
    `;

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: prompt },
    ]);

    return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
  }

  /**
   * CHATGPT (OpenAI)
   */
  private async analyzeWithChatGPT(filePath: string, customKey?: string) {
    const key = customKey || this.configService.get<string>('OPENAI_API_KEY') || '';
    const openai = new OpenAI({ apiKey: key });

    // 1. Transcribe (Whisper)
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
    });

    // 2. Analyze
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ 
        role: 'user', 
        content: `Analyze this transcription and find 3 viral moments. Return JSON { "clips": [...] }. Text: ${transcription.text}` 
      }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"clips": []}');
  }

  /**
   * CLAUDE (Anthropic)
   */
  private async analyzeWithClaude(filePath: string, customKey?: string) {
    // Claude butuh teks, jadi kita pinjam Whisper dulu untuk transkripsi
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
    });

    // Gunakan Claude untuk analisis teks
    const anthropicKey = customKey || this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [{ 
        role: "user", 
        content: `Identify viral clips from this text. Output JSON format. Text: ${transcription.text}` 
      }],
    });

    // Extract JSON from Claude response
    const textResponse = (msg.content[0] as any).text;
    const jsonStr = textResponse.substring(textResponse.indexOf('{'), textResponse.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr);
  }
}
