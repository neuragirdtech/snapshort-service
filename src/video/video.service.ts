import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { join, basename } from 'path';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class VideoService {
  private readonly rawPath = join(process.cwd(), 'uploads', 'raw');
  private readonly clipsPath = join(process.cwd(), 'uploads', 'clips');
  private readonly thumbPath = join(process.cwd(), 'uploads', 'thumbnails');
  
  private readonly BASE_URL = 'http://localhost:3000'; 

  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) {
    if (!existsSync(this.rawPath)) mkdirSync(this.rawPath, { recursive: true });
    if (!existsSync(this.clipsPath)) mkdirSync(this.clipsPath, { recursive: true });
    if (!existsSync(this.thumbPath)) mkdirSync(this.thumbPath, { recursive: true });
  }

  private toUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private getVideoMetadata(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, metadata) => {
        if (err) resolve({ format: { duration: 10 } });
        else resolve(metadata);
      });
    });
  }

  // MODIFIKASI: Hanya buat record awal di database
  async createInitialVideo(file: Express.Multer.File, userId: string): Promise<any> {
    const videoId = `vid-${Date.now()}`;
    const rawFileName = basename(file.path || file.filename);
    
    return this.prisma.video.create({
      data: {
        id: videoId,
        userId,
        title: file.originalname,
        url: `/uploads/raw/${rawFileName}`,
        status: 'processing' // Status awal saat masuk antrean
      }
    });
  }

  // MODIFIKASI: Fungsi ini dipicu oleh Worker (Queue)
  async processVideoJob(data: any) {
    const { videoId, rawFilePath, provider, apiKey, userPrompt, clipCount } = data;
    
    console.log(`[Worker] Started processing video: ${videoId}`);
    const metadata = await this.getVideoMetadata(rawFilePath);
    const totalDuration = metadata.format.duration || 10;

    let aiResult;
    try {
      aiResult = await this.aiService.processVideo(
        rawFilePath,
        basename(rawFilePath), 
        provider, 
        apiKey, 
        userPrompt, 
        clipCount
      );
    } catch (error) {
      console.error('AI Analysis failed, using fallback:', error.message);
      const half = totalDuration / 2;
      aiResult = {
        clips: [{ startTime: 0, endTime: Math.min(half, 10), title: "Highlight 1", viralScore: 90, subtitles: [] }]
      };
    }

    // Proses pemotongan klip
    for (const clipData of aiResult.clips) {
      const clipId = `clip-${crypto.randomUUID()}`;
      const clipFileName = `${clipId}.mp4`;
      const clipOutputPath = join(this.clipsPath, clipFileName);
      const duration = (clipData.endTime || 5) - (clipData.startTime || 0);
      
      if (duration <= 0 || clipData.startTime >= totalDuration) continue;

      await this.cutVideo(rawFilePath, clipOutputPath, clipData.startTime, Math.min(duration, totalDuration - clipData.startTime));

      // Generate Filmstrip
      const frames: string[] = [];
      const frameCount = 4;
      for (let i = 0; i < frameCount; i++) {
        const frameName = `${clipId}-f${i}.jpg`;
        const timestamp = Math.floor((duration / frameCount) * i);
        await this.generateFrame(clipOutputPath, this.thumbPath, frameName, timestamp.toString());
        frames.push(`/uploads/thumbnails/${frameName}`);
      }

      await this.prisma.clip.create({
        data: {
          id: clipId, videoId: videoId, title: clipData.title || 'Untitled Clip',
          url: `/uploads/clips/${clipFileName}`,
          thumbnail: frames.join(','),
          duration: duration, score: clipData.viralScore || 0,
          subtitles: JSON.stringify(clipData.subtitles || [])
        }
      });
    }

    // Update status video menjadi completed
    await this.prisma.video.update({
      where: { id: videoId },
      data: { status: 'completed' }
    });
    
    console.log(`[Worker] Finished processing video: ${videoId}`);
  }

  private cutVideo(input: string, output: string, start: number, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input).setStartTime(start).setDuration(duration)
        .videoCodec('libx264').outputOptions(['-preset ultrafast', '-crf 28'])
        .on('error', (err, stdout, stderr) => { console.error('FFmpeg Error:', stderr); reject(err); })
        .on('end', () => resolve()).save(output);
    });
  }

  private generateFrame(input: string, outputFolder: string, fileName: string, timestamp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input).screenshots({ timestamps: [timestamp], filename: fileName, folder: outputFolder, size: '160x?' })
        .on('end', () => resolve()).on('error', (err) => reject(err));
    });
  }

  async getUserVideos(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, include: { clips: true }
    });
    return videos.map(v => this.formatVideo(v));
  }

  async getVideoDetail(videoId: string, userId?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId }, include: { clips: true }
    });
    return video ? this.formatVideo(video) : null;
  }

  async getClipsByVideoId(videoId: string) {
    const clips = await this.prisma.clip.findMany({ where: { videoId } });
    return clips.map(c => this.formatClip(c));
  }

  async updateVideoTitle(videoId: string, title: string) {
    return this.prisma.video.update({ where: { id: videoId }, data: { title } });
  }

  private formatVideo(v: any) {
    return { ...v, url: this.toUrl(v.url), clips: (v.clips || []).map((c: any) => this.formatClip(c)) };
  }

  private formatClip(c: any) {
    const frames = c.thumbnail ? c.thumbnail.split(',') : [];
    return {
      ...c,
      url: this.toUrl(c.url),
      filmstrip: frames.length > 0 ? frames.map((t: string) => this.toUrl(t)) : [this.toUrl(c.url)]
    };
  }
}
