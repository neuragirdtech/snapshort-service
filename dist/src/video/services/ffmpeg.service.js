"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfmpegService = void 0;
const common_1 = require("@nestjs/common");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = require("path");
let FfmpegService = class FfmpegService {
    getVideoMetadata(path) {
        return new Promise((resolve) => {
            fluent_ffmpeg_1.default.ffprobe(path, (err, metadata) => {
                if (err)
                    resolve({ format: { duration: 10 } });
                else
                    resolve(metadata);
            });
        });
    }
    extractAudio(videoPath, outputFolder) {
        return new Promise((resolve, reject) => {
            const audioPath = (0, path_1.join)(outputFolder, `${Date.now()}.mp3`);
            (0, fluent_ffmpeg_1.default)(videoPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .on('error', (err) => reject(err))
                .on('end', () => resolve(audioPath))
                .save(audioPath);
        });
    }
    cutVideo(input, output, start, duration) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(input)
                .setStartTime(start)
                .setDuration(duration)
                .videoCodec('libx264')
                .outputOptions(['-preset ultrafast', '-crf 28'])
                .on('error', (err, stdout, stderr) => {
                console.error('FFmpeg Error:', stderr);
                reject(err);
            })
                .on('end', () => resolve())
                .save(output);
        });
    }
    generateFrame(input, outputFolder, fileName, timestamp) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(input)
                .screenshots({
                timestamps: [timestamp],
                filename: fileName,
                folder: outputFolder,
                size: '480x?',
            })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }
};
exports.FfmpegService = FfmpegService;
exports.FfmpegService = FfmpegService = __decorate([
    (0, common_1.Injectable)()
], FfmpegService);
//# sourceMappingURL=ffmpeg.service.js.map