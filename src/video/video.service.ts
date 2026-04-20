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
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) user = await this.prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');
    
    if (user.credits <= 0) {
      throw new ForbiddenException('Not enough credits.');
    }

    const video = await this.prisma.video.create({
      data: {
        title: file.originalname,
        url: file.path,
        status: 'processing',
        userId: user.id,
      },
    });

    try {
      // MENGGUNAKAN AI HYBRID DENGAN FALLBACK
      console.log('Step 1: AI Analyzing video (Gemini with ChatGPT Fallback)...');
      const analysis = await this.aiService.processVideoWithFallback(file.path, file.originalname);
      const suggestedClips = analysis.clips || [];

      console.log('Step 2: Cutting clips with FFmpeg...');
      const processedClips: Clip[] = [];

      for (const clipInfo of suggestedClips) {
        const clipFileName = `clip-${video.id}-${Date.now()}.mp4`;
        const clipOutputPath = join(this.clipsPath, clipFileName);

        // Potong video menjadi format vertikal 9:16
        await this.cutVideo(file.path, clipOutputPath, clipInfo.startTime, clipInfo.endTime);

        const savedClip = await this.prisma.clip.create({
          data: {
            videoId: video.id,
            title: clipInfo.title,
            url: clipOutputPath,
            duration: Math.round(clipInfo.endTime - clipInfo.startTime),
            score: clipInfo.viralScore || 0,
            subtitles: '', 
          },
        });
        processedClips.push(savedClip);
      }

      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed' },
      });

      // Kurangi kredit user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      });

      return processedClips;

    } catch (error) {
      console.error('Video Processing Error:', error);
      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'failed' },
      });
      throw new InternalServerErrorException('Failed to process video with Hybrid AI');
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
        .autopad('#000000') // Memberi black bar jika video asli landscape
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
