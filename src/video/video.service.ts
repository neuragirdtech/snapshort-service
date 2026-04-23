import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as crypto from 'crypto';
import { Video, Clip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FfmpegService } from './services/ffmpeg.service';
import { VideoStorageService } from './services/video-storage.service';
import { CloudStorageService } from './services/cloud-storage.service';
import { VideoJobData } from './video.types';

export interface FormattedClip extends Clip {
  filmstrip: string[];
}

export interface FormattedVideo extends Video {
  clips: FormattedClip[];
}

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private ffmpegService: FfmpegService,
    private storageService: VideoStorageService,
    private cloudStorageService: CloudStorageService,
  ) {}

  async createInitialVideo(
    file: Express.Multer.File,
    userId: string,
  ): Promise<Video> {
    const videoId = `vid-${Date.now()}`;
    const cloudUrl = await this.cloudStorageService.uploadFile(
      file.path || file.filename,
      'raw-videos',
    );

    return this.prisma.video.create({
      data: {
        id: videoId,
        userId,
        title: file.originalname,
        url: cloudUrl,
        status: 'processing',
      },
    });
  }

  async processVideoJob(data: VideoJobData): Promise<void> {
    const { videoId, rawFilePath, userPrompt } = data;

    console.log(`[Worker] Started real AI processing for video: ${videoId}`);

    try {
      // PANGGILAN AI ASLI (Gemini)
      const aiResult = await this.aiService.processVideo(
        rawFilePath,
        this.storageService.getFileName(rawFilePath),
        userPrompt,
      );

      console.log(
        `[Worker] AI Analysis complete. Found ${aiResult.clips.length} clips.`,
      );

      for (const clipData of aiResult.clips) {
        try {
          await this.processClip(videoId, rawFilePath, clipData);
        } catch (err) {
          console.error(`[Worker] Failed to process clip:`, err.message);
        }
      }

      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'completed' },
      });

      console.log(`[Worker] Finished processing video: ${videoId}`);
    } catch (error) {
      console.error(`[Worker] AI Processing failed:`, error.message);
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  private async processClip(
    videoId: string,
    rawFilePath: string,
    clipData: any,
  ): Promise<void> {
    const clipId = `clip-${crypto.randomUUID()}`;
    const clipFileName = `${clipId}.mp4`;
    const clipOutputPath = join(this.storageService.clipsPath, clipFileName);

    // Pastikan durasi minimal 1 detik
    const startTime = clipData.startTime || 0;
    const endTime = clipData.endTime || startTime + 5;
    const duration = endTime - startTime;

    if (duration <= 0) return;

    await this.ffmpegService.cutVideo(
      rawFilePath,
      clipOutputPath,
      startTime,
      duration,
    );

    const cloudClipUrl = await this.cloudStorageService.uploadFile(
      clipOutputPath,
      'clips',
    );
    const framePaths = await this.generateClipFrames(
      clipId,
      clipOutputPath,
      duration,
    );
    const cloudFrameUrls = await Promise.all(
      framePaths.map((p) =>
        this.cloudStorageService.uploadFile(p, 'thumbnails'),
      ),
    );

    await this.prisma.clip.create({
      data: {
        id: clipId,
        videoId: videoId,
        title: clipData.title || 'Untitled Clip',
        url: cloudClipUrl,
        thumbnail: cloudFrameUrls.join(','),
        duration: duration,
        score: clipData.viralScore || 0,
        subtitles: JSON.stringify(clipData.subtitles || []),
      },
    });
  }

  private async generateClipFrames(
    clipId: string,
    path: string,
    duration: number,
  ): Promise<string[]> {
    const frameName = `${clipId}-thumb.jpg`;
    const timestamp = duration > 1 ? '1' : (duration / 2).toString();
    const framePath = join(this.storageService.thumbPath, frameName);

    await this.ffmpegService.generateFrame(
      path,
      this.storageService.thumbPath,
      frameName,
      timestamp,
    );
    return [framePath];
  }

  async getUserVideos(userId: string): Promise<FormattedVideo[]> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { clips: true },
    });
    return (videos as any[]).map((v) => this.formatVideo(v));
  }

  async getVideoDetail(
    videoId: string,
    userId?: string,
  ): Promise<FormattedVideo | null> {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        ...(userId ? { userId } : {}),
      },
      include: { clips: true },
    });
    return video ? this.formatVideo(video as any) : null;
  }

  async getClipsByVideoId(videoId: string): Promise<FormattedClip[]> {
    const clips = await this.prisma.clip.findMany({ where: { videoId } });
    return clips.map((c) => this.formatClip(c));
  }

  async updateVideoTitle(videoId: string, title: string): Promise<Video> {
    return this.prisma.video.update({
      where: { id: videoId },
      data: { title },
    });
  }

  private formatVideo(v: any): FormattedVideo {
    return { ...v, clips: (v.clips || []).map((c: any) => this.formatClip(c)) };
  }

  private formatClip(c: Clip): FormattedClip {
    const cloudUrls = c.thumbnail ? c.thumbnail.split(',') : [];
    return { ...c, filmstrip: cloudUrls.length > 0 ? cloudUrls : [c.url] };
  }
}
