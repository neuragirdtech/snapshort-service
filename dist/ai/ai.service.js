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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const generative_ai_1 = require("@google/generative-ai");
const server_1 = require("@google/generative-ai/server");
const fs_1 = require("fs");
let AiService = class AiService {
    configService;
    openai;
    genAI;
    fileManager;
    constructor(configService) {
        this.configService = configService;
        const openaiKey = this.configService.get('OPENAI_API_KEY') || '';
        const geminiKey = this.configService.get('GEMINI_API_KEY') || '';
        this.openai = new openai_1.default({
            apiKey: openaiKey,
        });
        this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
        this.fileManager = new server_1.GoogleAIFileManager(geminiKey);
    }
    async analyzeWithGemini(filePath, fileName) {
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
    async analyzeWithChatGPTFallback(filePath) {
        console.log('Engine 2: Falling back to ChatGPT (Whisper + GPT-4o)...');
        const transcription = await this.openai.audio.transcriptions.create({
            file: (0, fs_1.createReadStream)(filePath),
            model: 'whisper-1',
        });
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
    async processVideoWithFallback(filePath, fileName) {
        try {
            return await this.analyzeWithGemini(filePath, fileName);
        }
        catch (error) {
            console.warn('Gemini failed, switching to OpenAI/ChatGPT...', error.message);
            try {
                return await this.analyzeWithChatGPTFallback(filePath);
            }
            catch (fallbackError) {
                console.error('Both AI Engines failed:', fallbackError);
                throw new common_1.InternalServerErrorException('All AI engines are currently unavailable.');
            }
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map