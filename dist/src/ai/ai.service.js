"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const server_1 = require("@google/generative-ai/server");
let AiService = class AiService {
    configService;
    genAI;
    fileManager;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('GEMINI_API_KEY') || '';
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.fileManager = new server_1.GoogleAIFileManager(apiKey);
    }
    async processVideo(filePath, fileName, userPrompt) {
        const modelName = this.configService.get('GEMINI_MODEL') ||
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
        while (file.state === 'PROCESSING') {
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map