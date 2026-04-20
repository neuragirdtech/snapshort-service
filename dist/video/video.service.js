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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const ffmpeg = __importStar(require("fluent-ffmpeg"));
const path_1 = require("path");
const fs_1 = require("fs");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let VideoService = class VideoService {
    prisma;
    aiService;
    rawPath = (0, path_1.join)(process.cwd(), 'uploads', 'raw');
    clipsPath = (0, path_1.join)(process.cwd(), 'uploads', 'clips');
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        if (!(0, fs_1.existsSync)(this.rawPath))
            (0, fs_1.mkdirSync)(this.rawPath, { recursive: true });
        if (!(0, fs_1.existsSync)(this.clipsPath))
            (0, fs_1.mkdirSync)(this.clipsPath, { recursive: true });
    }
    async processVideo(file, userId = 'mock-user-id', provider = 'gemini', apiKey) {
        let user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            user = await this.prisma.user.findFirst();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.credits <= 0) {
            throw new common_1.ForbiddenException('Not enough credits.');
        }
        const duration = await this.getVideoDuration(file.path);
        if (duration > 600) {
            if ((0, fs_1.existsSync)(file.path))
                (0, fs_1.unlinkSync)(file.path);
            throw new common_1.BadRequestException('Video duration exceeds 10 minutes limit.');
        }
        const dateStr = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const video = await this.prisma.video.create({
            data: {
                title: `${file.originalname} (${dateStr})`,
                url: `uploads/raw/${file.filename}`,
                status: 'processing',
                userId: user.id,
            },
        });
        try {
            console.log(`Step 1: AI Analyzing video with ${provider}...`);
            const analysis = await this.aiService.processVideo(file.path, file.originalname, provider, apiKey);
            const suggestedClips = analysis.clips || [];
            console.log('Step 2: Cutting clips with FFmpeg...');
            const processedClips = [];
            for (const clipInfo of suggestedClips) {
                const clipFileName = `clip-${video.id}-${Date.now()}.mp4`;
                const clipOutputPath = (0, path_1.join)(this.clipsPath, clipFileName);
                await this.cutVideo(file.path, clipOutputPath, clipInfo.startTime, clipInfo.endTime);
                const savedClip = await this.prisma.clip.create({
                    data: {
                        videoId: video.id,
                        title: clipInfo.title,
                        url: `uploads/clips/${clipFileName}`,
                        duration: Math.round(clipInfo.endTime - clipInfo.startTime),
                        score: clipInfo.viralScore || 0,
                        subtitles: '',
                    },
                });
                processedClips.push(savedClip);
            }
            await this.prisma.video.update({
                where: { id: video.id },
                data: { status: 'completed' },
            });
            await this.prisma.user.update({
                where: { id: user.id },
                data: { credits: { decrement: 1 } },
            });
            return processedClips;
        }
        catch (error) {
            console.error('Video Processing Error:', error);
            await this.prisma.video.update({
                where: { id: video.id },
                data: { status: 'failed' },
            });
            throw new common_1.InternalServerErrorException(`Failed to process video with ${provider}`);
        }
    }
    getVideoDuration(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err)
                    return reject(err);
                resolve(metadata.format.duration || 0);
            });
        });
    }
    cutVideo(input, output, start, end) {
        return new Promise((resolve, reject) => {
            const duration = end - start;
            const command = ffmpeg(input);
            command
                .setStartTime(start)
                .setDuration(duration)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                '-pix_fmt yuv420p',
                '-profile:v baseline',
                '-level 3.0',
                '-movflags +faststart'
            ])
                .size('720x1280')
                .aspect('9:16')
                .autopad('#000000')
                .output(output)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });
    }
    async getClipsByVideoId(videoId) {
        return this.prisma.clip.findMany({
            where: { videoId }
        });
    }
    async getUserVideos(userId) {
        return this.prisma.video.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                clips: true
            }
        });
    }
    async updateVideoTitle(videoId, title) {
        return this.prisma.video.update({
            where: { id: videoId },
            data: { title },
        });
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], VideoService);
//# sourceMappingURL=video.service.js.map