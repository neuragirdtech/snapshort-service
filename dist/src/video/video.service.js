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
const path_1 = require("path");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const ffmpeg_service_1 = require("./services/ffmpeg.service");
const video_storage_service_1 = require("./services/video-storage.service");
const cloud_storage_service_1 = require("./services/cloud-storage.service");
let VideoService = class VideoService {
    prisma;
    aiService;
    ffmpegService;
    storageService;
    cloudStorageService;
    constructor(prisma, aiService, ffmpegService, storageService, cloudStorageService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.ffmpegService = ffmpegService;
        this.storageService = storageService;
        this.cloudStorageService = cloudStorageService;
    }
    async createInitialVideo(file, userId) {
        const videoId = `vid-${Date.now()}`;
        const cloudUrl = await this.cloudStorageService.uploadFile(file.path || file.filename, 'raw-videos');
        return this.prisma.video.create({
            data: {
                id: videoId,
                userId,
                title: file.originalname,
                url: cloudUrl,
                status: 'processing',
            },
        });
    }
    async processVideoJob(data) {
        const { videoId, rawFilePath, userPrompt } = data;
        console.log(`[Worker] Started real AI processing for video: ${videoId}`);
        try {
            const aiResult = await this.aiService.processVideo(rawFilePath, this.storageService.getFileName(rawFilePath), userPrompt);
            console.log(`[Worker] AI Analysis complete. Found ${aiResult.clips.length} clips.`);
            for (const clipData of aiResult.clips) {
                try {
                    await this.processClip(videoId, rawFilePath, clipData);
                }
                catch (err) {
                    console.error(`[Worker] Failed to process clip:`, err.message);
                }
            }
            await this.prisma.video.update({
                where: { id: videoId },
                data: { status: 'completed' },
            });
            console.log(`[Worker] Finished processing video: ${videoId}`);
        }
        catch (error) {
            console.error(`[Worker] AI Processing failed:`, error.message);
            await this.prisma.video.update({
                where: { id: videoId },
                data: { status: 'failed' },
            });
            throw error;
        }
    }
    async processClip(videoId, rawFilePath, clipData) {
        const clipId = `clip-${crypto.randomUUID()}`;
        const clipFileName = `${clipId}.mp4`;
        const clipOutputPath = (0, path_1.join)(this.storageService.clipsPath, clipFileName);
        const startTime = clipData.startTime || 0;
        const endTime = clipData.endTime || startTime + 5;
        const duration = endTime - startTime;
        if (duration <= 0)
            return;
        await this.ffmpegService.cutVideo(rawFilePath, clipOutputPath, startTime, duration);
        const cloudClipUrl = await this.cloudStorageService.uploadFile(clipOutputPath, 'clips');
        const framePaths = await this.generateClipFrames(clipId, clipOutputPath, duration);
        const cloudFrameUrls = await Promise.all(framePaths.map((p) => this.cloudStorageService.uploadFile(p, 'thumbnails')));
        await this.prisma.clip.create({
            data: {
                id: clipId,
                videoId: videoId,
                title: clipData.title || 'Untitled Clip',
                url: cloudClipUrl,
                thumbnail: cloudFrameUrls.join(','),
                duration: duration,
                score: clipData.viralScore || 0,
                subtitles: JSON.stringify(clipData.subtitles || []),
            },
        });
    }
    async generateClipFrames(clipId, path, duration) {
        const frameName = `${clipId}-thumb.jpg`;
        const timestamp = duration > 1 ? '1' : (duration / 2).toString();
        const framePath = (0, path_1.join)(this.storageService.thumbPath, frameName);
        await this.ffmpegService.generateFrame(path, this.storageService.thumbPath, frameName, timestamp);
        return [framePath];
    }
    async getUserVideos(userId) {
        const videos = await this.prisma.video.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { clips: true },
        });
        return videos.map((v) => this.formatVideo(v));
    }
    async getVideoDetail(videoId, userId) {
        const video = await this.prisma.video.findFirst({
            where: {
                id: videoId,
                ...(userId ? { userId } : {}),
            },
            include: { clips: true },
        });
        return video ? this.formatVideo(video) : null;
    }
    async getClipsByVideoId(videoId) {
        const clips = await this.prisma.clip.findMany({ where: { videoId } });
        return clips.map((c) => this.formatClip(c));
    }
    async updateVideoTitle(videoId, title) {
        return this.prisma.video.update({
            where: { id: videoId },
            data: { title },
        });
    }
    formatVideo(v) {
        return { ...v, clips: (v.clips || []).map((c) => this.formatClip(c)) };
    }
    formatClip(c) {
        const cloudUrls = c.thumbnail ? c.thumbnail.split(',') : [];
        return { ...c, filmstrip: cloudUrls.length > 0 ? cloudUrls : [c.url] };
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        ffmpeg_service_1.FfmpegService,
        video_storage_service_1.VideoStorageService,
        cloud_storage_service_1.CloudStorageService])
], VideoService);
//# sourceMappingURL=video.service.js.map