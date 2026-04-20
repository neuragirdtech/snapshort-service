import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Clip } from '@prisma/client';

@Injectable()
export class VideoService {
  private readonly rawPath = join(process.cwd(), 'uploads', 'raw');
  private readonly clipsPath = join(process.cwd(), 'uploads', 'clips');

  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) {
    if (!existsSync(this.rawPath)) mkdirSync(this.rawPath, { recursive: true });
    if (!existsSync(this.clipsPath)) mkdirSync(this.clipsPath, { recursive: true });
  }

  async processVideo(file: Express.Multer.File, userId: string = 'mock-user-id') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    if (user.credits <= 0) {
      throw new ForbiddenException('Not enough credits. Please upgrade your plan.');
    }

    const video = await this.prisma.video.create({
      data: {
        title: file.originalname,
        url: file.path,
        status: 'processing',
        userId: userId,
      },
    });

    try {
      // Use Gemini 1.5 Flash - Faster & Cheaper
      console.log('AI logic: Gemini 1.5 Flash active.');
      const suggestedClips = await this.aiService.analyzeVideoWithGemini(file.path, file.originalname);

      console.log('Cutting clips with FFmpeg...');
      const processedClips: Clip[] = [];

      for (const clipInfo of suggestedClips) {
        const clipFileName = `clip-${video.id}-${Date.now()}.mp4`;
        const clipOutputPath = join(this.clipsPath, clipFileName);

        await this.cutVideo(file.path, clipOutputPath, clipInfo.startTime, clipInfo.endTime);

        const savedClip = await this.prisma.clip.create({
          data: {
            videoId: video.id,
            title: clipInfo.title,
            url: clipOutputPath,
            duration: Math.round(clipInfo.endTime - clipInfo.startTime),
            score: clipInfo.viralScore || 0,
            subtitles: clipInfo.transcription || '', // Gemini provides snippet transcription
          },
        });
        processedClips.push(savedClip);
      }

      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed' },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      });

      return processedClips;

    } catch (error) {
      console.error('Video Processing Error:', error);
      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'failed' },
      });
      throw new InternalServerErrorException('Failed to process video with Gemini AI');
    }
  }

  private cutVideo(input: string, output: string, start: number, end: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = end - start;
      const command = (ffmpeg as any)(input);
      command
        .setStartTime(start)
        .setDuration(duration)
        .size('720x1280') 
        .aspect('9:16')
        .autopad()
        .output(output)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run();
    });
  }

  async getClipsByVideoId(videoId: string) {
    return this.prisma.clip.findMany({
      where: { videoId }
    });
  }
}
