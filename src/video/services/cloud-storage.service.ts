import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudStorageService {
  private s3Client: any;
  private provider: string;

  constructor(private configService: ConfigService) {
    this.provider =
      this.configService.get<string>('STORAGE_PROVIDER') || 'cloudinary';

    if (this.provider === 'neo') {
      this.s3Client = new S3Client({
        region: this.configService.get('NEO_REGION'),
        endpoint: this.configService.get('NEO_ENDPOINT'),
        credentials: {
          accessKeyId: this.configService.get('NEO_ACCESS_KEY_ID') || '',
          secretAccessKey:
            this.configService.get('NEO_SECRET_ACCESS_KEY') || '',
        },
        forcePathStyle: true, // Sangat penting untuk beberapa provider S3 lokal
      });
    } else {
      cloudinary.config({
        cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
        api_key: this.configService.get('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
      });
    }
  }

  async uploadFile(filePath: string, folder: string): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${path.basename(filePath)}`;

    if (this.provider === 'neo') {
      return this.uploadToNeo(filePath, fileName);
    } else {
      return this.uploadToCloudinary(filePath, folder);
    }
  }

  private async uploadToNeo(
    filePath: string,
    fileName: string,
  ): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const bucketName = this.configService.get('NEO_BUCKET_NAME');

      console.log(`[Storage] Uploading to NEO: ${bucketName}/${fileName}`);

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ACL: 'public-read',
        ContentType: fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
      });

      await this.s3Client.send(command);

      const publicUrl = this.configService.get('NEO_PUBLIC_URL');
      return `${publicUrl}/${fileName}`;
    } catch (error) {
      console.error('NEO Upload Error:', error.message);
      throw new Error('Failed to upload to NEO Cloud');
    }
  }

  private async uploadToCloudinary(
    filePath: string,
    folder: string,
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: `snapshort/${folder}`,
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error.message);
      throw new Error('Failed to upload to Cloudinary');
    }
  }
}
