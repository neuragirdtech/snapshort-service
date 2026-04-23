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
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('GEMINI_API_KEY') || '';
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async processVideo(filePath, fileName, provider = 'gemini', apiKey, userPrompt, clipCount = 3) {
        const key = apiKey || this.configService.get('GEMINI_API_KEY') || '';
        if (!key) {
            throw new common_1.InternalServerErrorException('Google AI API Key is missing in .env (GEMINI_API_KEY)');
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(key);
        const fileManager = new server_1.GoogleAIFileManager(key);
        const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType: 'video/mp4',
            displayName: fileName,
        });
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
        }
        catch (e) {
            console.error('JSON Parse Error:', rawText);
            throw new common_1.InternalServerErrorException('AI response was truncated or invalid');
        }
    }
    buildFinalPrompt(userPrompt, clipCount) {
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map