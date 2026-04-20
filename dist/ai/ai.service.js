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
const fs_1 = require("fs");
let AiService = class AiService {
    configService;
    openai;
    constructor(configService) {
        this.configService = configService;
        this.openai = new openai_1.default({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }
    async transcribeVideo(filePath) {
        try {
            const translation = await this.openai.audio.transcriptions.create({
                file: (0, fs_1.createReadStream)(filePath),
                model: 'whisper-1',
                response_format: 'verbose_json',
                timestamp_granularities: ['segment'],
            });
            return translation;
        }
        catch (error) {
            console.error('Whisper Transcription Error:', error);
            throw new common_1.InternalServerErrorException('Failed to transcribe video');
        }
    }
    async analyzeTranscription(transcription) {
        try {
            const prompt = `
        You are a viral video editor. Analyze the following transcription segments and identify 3 potential viral short clips (each 15-60 seconds).
        For each clip, provide:
        1. A catchy title.
        2. Start time (seconds).
        3. End time (seconds).
        4. A brief explanation of why it will go viral.
        
        Transcription: ${JSON.stringify(transcription.segments)}
        
        Return ONLY a JSON array of objects with keys: title, startTime, endTime, viralScore (0-100), reasoning.
      `;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });
            const content = response.choices[0].message.content;
            return JSON.parse(content);
        }
        catch (error) {
            console.error('GPT Analysis Error:', error);
            throw new common_1.InternalServerErrorException('Failed to analyze video content');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map