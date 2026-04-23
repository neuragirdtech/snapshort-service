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
exports.VideoProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const video_service_1 = require("./video.service");
let VideoProcessor = class VideoProcessor extends bullmq_1.WorkerHost {
    videoService;
    constructor(videoService) {
        super();
        this.videoService = videoService;
    }
    async process(job) {
        console.log(`[Queue] Processing job ${job.id} for video: ${job.data.videoId}`);
        try {
            await this.videoService.processVideoJob(job.data);
            console.log(`[Queue] Job ${job.id} completed successfully.`);
        }
        catch (error) {
            console.error(`[Queue] Job ${job.id} failed:`, error.message);
            throw error;
        }
    }
};
exports.VideoProcessor = VideoProcessor;
exports.VideoProcessor = VideoProcessor = __decorate([
    (0, bullmq_1.Processor)('video-processing'),
    __metadata("design:paramtypes", [video_service_1.VideoService])
], VideoProcessor);
//# sourceMappingURL=video.processor.js.map