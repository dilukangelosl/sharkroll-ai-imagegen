export interface GameData {
  id: string;
  name: string;
  providerName: string;
  gameThumbnail: string;
  [key: string]: any;
}

export interface ProcessingStatus {
  id: string;
  status: 'idle' | 'downloading' | 'generating' | 'compositing' | 'complete' | 'error';
  originalImageBase64?: string;
  cleanedImageBase64?: string;
  finalImageBase64?: string;
  error?: string;
}

export interface AppSettings {
  width: number;
  height: number;
  enhancePrompt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  width: 1080,
  height: 1920,
  enhancePrompt: "Remove all logos, text, and UI overlays from this game thumbnail. Recreate the scene to fit a vertical portrait format (9:16 aspect ratio). Extend the background seamlessly to fill the top and bottom. Center the main character or object. Maintain the original art style, color palette, and high-quality aesthetics. Do not add any text."
};