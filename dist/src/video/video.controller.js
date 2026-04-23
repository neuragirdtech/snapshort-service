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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const video_service_1 = require("./video.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let VideoController = class VideoController {
    videoService;
    videoQueue;
    constructor(videoService, videoQueue) {
        this.videoService = videoService;
        this.videoQueue = videoQueue;
    }
    async uploadVideo(file, req) {
        const userId = req.user.userId;
        const provider = req.headers['x-ai-provider'] || 'gemini';
        const apiKey = req.headers['x-api-key'];
        const body = req.body;
        const prompt = body.prompt || '';
        const clipCount = body.clipCount ? parseInt(body.clipCount) : 3;
        const video = await this.videoService.createInitialVideo(file, userId);
        await this.videoQueue.add('process-video', {
            videoId: video.id,
            rawFilePath: file.path,
            provider,
            apiKey,
            userPrompt: prompt,
            clipCount: clipCount,
        });
        return {
            message: 'Video upload successful. Processing has started in the background.',
            videoId: video.id,
            status: 'processing',
        };
    }
    async getMyVideos(req) {
        return this.videoService.getUserVideos(req.user.userId);
    }
    async getClips(id) {
        return this.videoService.getClipsByVideoId(id);
    }
    async updateTitle(id, req) {
        const body = req.body;
        const title = body.title || 'Untitled';
        return this.videoService.updateVideoTitle(id, title);
    }
    async getVideoStatus(id, req) {
        const video = await this.videoService.getVideoDetail(id, req.user.userId);
        return { status: video?.status || 'not_found' };
    }
    async getVideoDetail(id, req) {
        return this.videoService.getVideoDetail(id, req.user.userId);
    }
};
exports.VideoController = VideoController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/raw',
            filename: (req, file, cb) => {
                const randomName = Array(32)
                    .fill(null)
                    .map(() => Math.round(Math.random() * 16).toString(16))
                    .join('');
                cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "uploadVideo", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getMyVideos", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/clips'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getClips", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/update-title'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "updateTitle", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getVideoStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "getVideoDetail", null);
exports.VideoController = VideoController = __decorate([
    (0, common_1.Controller)('videos'),
    __param(1, (0, bullmq_1.InjectQueue)('video-processing')),
    __metadata("design:paramtypes", [video_service_1.VideoService,
        bullmq_2.Queue])
], VideoController);
//# sourceMappingURL=video.controller.js.map