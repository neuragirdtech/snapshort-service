export interface VideoJobData {
  videoId: string;
  rawFilePath: string;
  provider: string;
  apiKey?: string;
  userPrompt?: string;
  clipCount: number;
}

export interface UploadVideoBody {
  prompt?: string;
  clipCount?: string;
}

export interface UpdateTitleBody {
  title?: string;
}
