import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';

@Injectable()
export class FfmpegService {
  getVideoMetadata(path: string): Promise<any> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(path, (err, metadata) => {
        if (err) resolve({ format: { duration: 10 } });
        else resolve(metadata);
      });
    });
  }

  // FUNGSI BARU: Mengambil audio dari video (format mp3)
  extractAudio(videoPath: string, outputFolder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioPath = join(outputFolder, `${Date.now()}.mp3`);
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('error', (err) => reject(err))
        .on('end', () => resolve(audioPath))
        .save(audioPath);
    });
  }

  cutVideo(input: string, output: string, start: number, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .setStartTime(start)
        .setDuration(duration)
        .videoCodec('libx264')
        .outputOptions(['-preset ultrafast', '-crf 28'])
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg Error:', stderr);
          reject(err);
        })
        .on('end', () => resolve())
        .save(output);
    });
  }

  generateFrame(input: string, outputFolder: string, fileName: string, timestamp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .screenshots({
          timestamps: [timestamp],
          filename: fileName,
          folder: outputFolder,
          size: '480x?',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }
}
