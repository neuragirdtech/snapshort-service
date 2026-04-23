"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = require("path");
const fs_1 = require("fs");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let VideoService = class VideoService {
    prisma;
    aiService;
    rawPath = (0, path_1.join)(process.cwd(), 'uploads', 'raw');
    clipsPath = (0, path_1.join)(process.cwd(), 'uploads', 'clips');
    thumbPath = (0, path_1.join)(process.cwd(), 'uploads', 'thumbnails');
    BASE_URL = 'http://localhost:3000';
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        if (!(0, fs_1.existsSync)(this.rawPath))
            (0, fs_1.mkdirSync)(this.rawPath, { recursive: true });
        if (!(0, fs_1.existsSync)(this.clipsPath))
            (0, fs_1.mkdirSync)(this.clipsPath, { recursive: true });
        if (!(0, fs_1.existsSync)(this.thumbPath))
            (0, fs_1.mkdirSync)(this.thumbPath, { recursive: true });
    }
    toUrl(path) {
        if (!path)
            return '';
        if (path.startsWith('http'))
            return path;
        return `${this.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    getVideoMetadata(path) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(path, (err, metadata) => {
                if (err)
                    resolve({ format: { duration: 10 } });
                else
                    resolve(metadata);
            });
        });
    }
    async processVideo(file, userId, provider = 'gemini', apiKey, userPrompt, clipCount = 3, aspectRatio = '9:16', subtitleColor = 'yellow') {
        const videoId = `vid-${Date.now()}`;
        const rawFileName = `${videoId}-${file.originalname}`;
        const rawFilePath = (0, path_1.join)(this.rawPath, rawFileName);
        if (file.buffer)
            (0, fs_1.writeFileSync)(rawFilePath, file.buffer);
        else if (file.path)
            (0, fs_1.copyFileSync)(file.path, rawFilePath);
        const metadata = await this.getVideoMetadata(rawFilePath);
        const totalDuration = metadata.format.duration || 10;
        let aiResult;
        try {
            console.log(`Starting AI Analysis with ${provider}...`);
            aiResult = await this.aiService.processVideo(rawFilePath, (0, path_1.basename)(rawFilePath), provider, apiKey, userPrompt, clipCount);
        }
        catch (error) {
            console.error('AI Analysis failed, using fallback mock data:', error.message);
            const half = totalDuration / 2;
            aiResult = {
                clips: [
                    {
                        startTime: 0, endTime: Math.min(half, 10), title: "Highlight 1", viralScore: 90,
                        subtitles: [{ id: 't1', time: 0.5, duration: 3, text: "AI Analysis unavailable." }]
                    }
                ]
            };
        }
        const videoRecord = await this.prisma.video.create({
            data: {
                id: videoId, userId, title: file.originalname,
                url: `/uploads/raw/${rawFileName}`, status: 'completed'
            }
        });
        for (const clipData of aiResult.clips) {
            const clipId = `clip-${crypto.randomUUID()}`;
            const clipFileName = `${clipId}.mp4`;
            const clipOutputPath = (0, path_1.join)(this.clipsPath, clipFileName);
            const duration = (clipData.endTime || 5) - (clipData.startTime || 0);
            if (duration <= 0 || clipData.startTime >= totalDuration)
                continue;
            await this.cutVideo(rawFilePath, clipOutputPath, clipData.startTime, Math.min(duration, totalDuration - clipData.startTime));
            const frames = [];
            const frameCount = 4;
            for (let i = 0; i < frameCount; i++) {
                const frameName = `${clipId}-f${i}.jpg`;
                const timestamp = Math.floor((duration / frameCount) * i);
                await this.generateFrame(clipOutputPath, this.thumbPath, frameName, timestamp.toString());
                frames.push(`/uploads/thumbnails/${frameName}`);
            }
            await this.prisma.clip.create({
                data: {
                    id: clipId, videoId: videoRecord.id, title: clipData.title || 'Untitled Clip',
                    url: `/uploads/clips/${clipFileName}`,
                    thumbnail: frames.join(','),
                    duration: duration, score: clipData.viralScore || 0,
                    subtitles: JSON.stringify(clipData.subtitles || [])
                }
            });
        }
        return this.getVideoDetail(videoRecord.id);
    }
    cutVideo(input, output, start, duration) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(input).setStartTime(start).setDuration(duration)
                .videoCodec('libx264').outputOptions(['-preset ultrafast', '-crf 28'])
                .on('error', (err, stdout, stderr) => { console.error('FFmpeg Error:', stderr); reject(err); })
                .on('end', () => resolve()).save(output);
        });
    }
    generateFrame(input, outputFolder, fileName, timestamp) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(input).screenshots({ timestamps: [timestamp], filename: fileName, folder: outputFolder, size: '160x?' })
                .on('end', () => resolve()).on('error', (err) => reject(err));
        });
    }
    async getUserVideos(userId) {
        const videos = await this.prisma.video.findMany({
            where: { userId }, orderBy: { createdAt: 'desc' }, include: { clips: true }
        });
        return videos.map(v => this.formatVideo(v));
    }
    async getVideoDetail(videoId, userId) {
        const video = await this.prisma.video.findUnique({
            where: { id: videoId }, include: { clips: true }
        });
        return video ? this.formatVideo(video) : null;
    }
    async getClipsByVideoId(videoId) {
        const clips = await this.prisma.clip.findMany({ where: { videoId } });
        return clips.map(c => this.formatClip(c));
    }
    async updateVideoTitle(videoId, title) {
        return this.prisma.video.update({ where: { id: videoId }, data: { title } });
    }
    formatVideo(v) {
        return { ...v, url: this.toUrl(v.url), clips: v.clips.map((c) => this.formatClip(c)) };
    }
    formatClip(c) {
        const frames = c.thumbnail ? c.thumbnail.split(',') : [];
        return {
            ...c,
            url: this.toUrl(c.url),
            filmstrip: frames.length > 0 ? frames.map((t) => this.toUrl(t)) : [this.toUrl(c.url)]
        };
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], VideoService);
//# sourceMappingURL=video.service.js.map