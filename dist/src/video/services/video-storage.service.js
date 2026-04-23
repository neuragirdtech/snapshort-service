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
exports.VideoStorageService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
let VideoStorageService = class VideoStorageService {
    BASE_URL = 'http://localhost:3000';
    rawPath = (0, path_1.join)(process.cwd(), 'uploads', 'raw');
    clipsPath = (0, path_1.join)(process.cwd(), 'uploads', 'clips');
    thumbPath = (0, path_1.join)(process.cwd(), 'uploads', 'thumbnails');
    constructor() {
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.rawPath, this.clipsPath, this.thumbPath].forEach(path => {
            if (!(0, fs_1.existsSync)(path))
                (0, fs_1.mkdirSync)(path, { recursive: true });
        });
    }
    toUrl(path) {
        if (!path)
            return '';
        if (path.startsWith('http'))
            return path;
        return `${this.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    getFileName(path) {
        return (0, path_1.basename)(path);
    }
};
exports.VideoStorageService = VideoStorageService;
exports.VideoStorageService = VideoStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], VideoStorageService);
//# sourceMappingURL=video-storage.service.js.map