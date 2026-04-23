import { Injectable } from '@nestjs/common';
import { join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class VideoStorageService {
  private readonly BASE_URL = 'http://localhost:3000';
  
  readonly rawPath = join(process.cwd(), 'uploads', 'raw');
  readonly clipsPath = join(process.cwd(), 'uploads', 'clips');
  readonly thumbPath = join(process.cwd(), 'uploads', 'thumbnails');

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    [this.rawPath, this.clipsPath, this.thumbPath].forEach(path => {
      if (!existsSync(path)) mkdirSync(path, { recursive: true });
    });
  }

  toUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  getFileName(path: string): string {
    return basename(path);
  }
}
