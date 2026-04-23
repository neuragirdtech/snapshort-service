import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('videos')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    @InjectQueue('video-processing') private videoQueue: Queue,
  ) {}

  @UseGuards(JwtAuthGuard)
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
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const userId = req.user.userId;
    const provider = req.headers['x-ai-provider'] as string || 'gemini';
    const apiKey = req.headers['x-api-key'] as string;
    const { prompt, clipCount } = req.body;

    const video = await this.videoService.createInitialVideo(file, userId);

    await this.videoQueue.add('process-video', {
      videoId: video.id,
      rawFilePath: file.path,
      provider,
      apiKey,
      userPrompt: prompt,
      clipCount: clipCount ? parseInt(clipCount) : 3,
    });

    return {
      message: 'Video upload successful. Processing has started in the background.',
      videoId: video.id,
      status: 'processing',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyVideos(@Request() req: any) {
    return this.videoService.getUserVideos(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/clips')
  async getClips(@Param('id') id: string) {
    return this.videoService.getClipsByVideoId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update-title')
  async updateTitle(@Param('id') id: string, @Request() req: any) {
    const { title } = req.body;
    return this.videoService.updateVideoTitle(id, title);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getVideoDetail(@Param('id') id: string, @Request() req: any) {
    return this.videoService.getVideoDetail(id, req.user.userId);
  }
}
