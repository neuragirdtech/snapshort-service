import { ConfigService } from '@nestjs/config';
export declare class CloudStorageService {
    private configService;
    private s3Client;
    private provider;
    constructor(configService: ConfigService);
    uploadFile(filePath: string, folder: string): Promise<string>;
    private uploadToNeo;
    private uploadToCloudinary;
}
