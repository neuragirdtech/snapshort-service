import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
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

  async processVideo(
    file: Express.Multer.File, 
    userId: string = 'mock-user-id',
    provider: string = 'gemini',
    apiKey?: string
  ) {
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) user = await this.prisma.user.findFirst();
    if (!user) throw new NotFoundException('User not found');
    
    if (user.credits <= 0) {
      throw new ForbiddenException('Not enough credits.');
    }

    // CEK DURASI VIDEO (MAKSIMAL 10 MENIT)
    const duration = await this.getVideoDuration(file.path);
    if (duration > 600) {
      if (existsSync(file.path)) unlinkSync(file.path);
      throw new BadRequestException('Video duration exceeds 10 minutes limit.');
    }

    const dateStr = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const video = await this.prisma.video.create({
      data: {
        title: `${file.originalname} (${dateStr})`,
        url: `uploads/raw/${file.filename}`, 
        status: 'processing',
        userId: user.id,
      },
    });

    try {
      // MENGGUNAKAN UNIFIED AI ENGINE
      console.log(`Step 1: AI Analyzing video with ${provider}...`);
      const analysis = await this.aiService.processVideo(
        file.path, 
        file.originalname,
        provider,
        apiKey
      );
      
      const suggestedClips = analysis.clips || [];

      console.log('Step 2: Cutting clips with FFmpeg...');
      const processedClips: Clip[] = [];

      for (const clipInfo of suggestedClips) {
        const clipFileName = `clip-${video.id}-${Date.now()}.mp4`;
        const clipOutputPath = join(this.clipsPath, clipFileName);

        await this.cutVideo(file.path, clipOutputPath, clipInfo.startTime, clipInfo.endTime);

        const savedClip = await this.prisma.clip.create({
          data: {
            videoId: video.id,
            title: clipInfo.title,
            url: `uploads/clips/${clipFileName}`, 
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
      throw new InternalServerErrorException(`Failed to process video with ${provider}`);
    }
  }

  private getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration || 0);
      });
    });
  }

  private cutVideo(input: string, output: string, start: number, end: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = end - start;
      const command = (ffmpeg as any)(input);
      command
        .setStartTime(start)
        .setDuration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-profile:v baseline', 
          '-level 3.0',
          '-movflags +faststart' 
        ])
        .size('720x1280') 
        .aspect('9:16')
        .autopad('#000000')
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

  async getUserVideos(userId: string) {
    return this.prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        clips: true
      }
    });
  }

  async updateVideoTitle(videoId: string, title: string) {
    return this.prisma.video.update({
      where: { id: videoId },
      data: { title },
    });
  }
}
