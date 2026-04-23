import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  UseGuards,
  Request as Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { Video } from '@prisma/client';
import { VideoService, FormattedVideo, FormattedClip } from './video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadVideoBody, UpdateTitleBody, VideoJobData } from './video.types';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email?: string;
  };
}

@Controller('videos')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    @InjectQueue('video-processing') private videoQueue: Queue<VideoJobData>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads/raw',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string; videoId: string; status: string }> {
    const userId = req.user.userId;
    const provider = (req.headers['x-ai-provider'] as string) || 'gemini';
    const apiKey = req.headers['x-api-key'] as string;
    
    const body = req.body as UploadVideoBody;
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
      message:
        'Video upload successful. Processing has started in the background.',
      videoId: video.id,
      status: 'processing',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyVideos(@Req() req: AuthenticatedRequest): Promise<FormattedVideo[]> {
    return this.videoService.getUserVideos(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/clips')
  async getClips(@Param('id') id: string): Promise<FormattedClip[]> {
    return this.videoService.getClipsByVideoId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update-title')
  async updateTitle(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Video> {
    const body = req.body as UpdateTitleBody;
    const title = body.title || 'Untitled';
    return this.videoService.updateVideoTitle(id, title);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getVideoStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ status: string }> {
    const video = await this.videoService.getVideoDetail(id, req.user.userId);
    return { status: video?.status || 'not_found' };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getVideoDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FormattedVideo | null> {
    return this.videoService.getVideoDetail(id, req.user.userId);
  }
}
