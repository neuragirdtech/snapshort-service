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
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const fs_1 = require("fs");
let AiService = class AiService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    async processVideo(filePath, fileName, provider, customKey) {
        console.log(`AI Processing with Provider: ${provider}`);
        switch (provider) {
            case 'gemini':
                return this.analyzeWithGemini(filePath, fileName, customKey);
            case 'openai':
                return this.analyzeWithChatGPT(filePath, customKey);
            case 'claude':
                return this.analyzeWithClaude(filePath, customKey);
            default:
                return this.analyzeWithGemini(filePath, fileName);
        }
    }
    async analyzeWithGemini(filePath, fileName, customKey) {
        const key = customKey || this.configService.get('GEMINI_API_KEY') || '';
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
    async analyzeWithChatGPT(filePath, customKey) {
        const key = customKey || this.configService.get('OPENAI_API_KEY') || '';
        const openai = new openai_1.default({ apiKey: key });
        const transcription = await openai.audio.transcriptions.create({
            file: (0, fs_1.createReadStream)(filePath),
            model: 'whisper-1',
        });
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
    async analyzeWithClaude(filePath, customKey) {
        const openaiKey = this.configService.get('OPENAI_API_KEY') || '';
        const openai = new openai_1.default({ apiKey: openaiKey });
        const transcription = await openai.audio.transcriptions.create({
            file: (0, fs_1.createReadStream)(filePath),
            model: 'whisper-1',
        });
        const anthropicKey = customKey || this.configService.get('ANTHROPIC_API_KEY') || '';
        const anthropic = new sdk_1.default({ apiKey: anthropicKey });
        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: [{
                    role: "user",
                    content: `Identify viral clips from this text. Output JSON format. Text: ${transcription.text}`
                }],
        });
        const textResponse = msg.content[0].text;
        const jsonStr = textResponse.substring(textResponse.indexOf('{'), textResponse.lastIndexOf('}') + 1);
        return JSON.parse(jsonStr);
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map