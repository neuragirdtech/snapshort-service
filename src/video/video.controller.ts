import { Controller, Post, UseInterceptors, UploadedFile, Get, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VideoService } from './video.service';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: './uploads/raw',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.videoService.processVideo(file);
  }

  @Get(':id/clips')
  async getClips(@Param('id') id: string) {
    return this.videoService['getMockClips']();
  }
}
