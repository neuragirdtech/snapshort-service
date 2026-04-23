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
exports.CloudStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const cloudinary_1 = require("cloudinary");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let CloudStorageService = class CloudStorageService {
    configService;
    s3Client;
    provider;
    constructor(configService) {
        this.configService = configService;
        this.provider =
            this.configService.get('STORAGE_PROVIDER') || 'cloudinary';
        if (this.provider === 'neo') {
            this.s3Client = new client_s3_1.S3Client({
                region: this.configService.get('NEO_REGION'),
                endpoint: this.configService.get('NEO_ENDPOINT'),
                credentials: {
                    accessKeyId: this.configService.get('NEO_ACCESS_KEY_ID') || '',
                    secretAccessKey: this.configService.get('NEO_SECRET_ACCESS_KEY') || '',
                },
                forcePathStyle: true,
            });
        }
        else {
            cloudinary_1.v2.config({
                cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
                api_key: this.configService.get('CLOUDINARY_API_KEY'),
                api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
            });
        }
    }
    async uploadFile(filePath, folder) {
        const fileName = `${folder}/${Date.now()}-${path.basename(filePath)}`;
        if (this.provider === 'neo') {
            return this.uploadToNeo(filePath, fileName);
        }
        else {
            return this.uploadToCloudinary(filePath, folder);
        }
    }
    async uploadToNeo(filePath, fileName) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const bucketName = this.configService.get('NEO_BUCKET_NAME');
            console.log(`[Storage] Uploading to NEO: ${bucketName}/${fileName}`);
            const command = new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: fileBuffer,
                ACL: 'public-read',
                ContentType: fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
            });
            await this.s3Client.send(command);
            const publicUrl = this.configService.get('NEO_PUBLIC_URL');
            return `${publicUrl}/${fileName}`;
        }
        catch (error) {
            console.error('NEO Upload Error:', error.message);
            throw new Error('Failed to upload to NEO Cloud');
        }
    }
    async uploadToCloudinary(filePath, folder) {
        try {
            const result = await cloudinary_1.v2.uploader.upload(filePath, {
                resource_type: 'auto',
                folder: `snapshort/${folder}`,
            });
            return result.secure_url;
        }
        catch (error) {
            console.error('Cloudinary Upload Error:', error.message);
            throw new Error('Failed to upload to Cloudinary');
        }
    }
};
exports.CloudStorageService = CloudStorageService;
exports.CloudStorageService = CloudStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudStorageService);
//# sourceMappingURL=cloud-storage.service.js.map