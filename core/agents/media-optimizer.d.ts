export interface OptimizeImageInput {
  buffer: Buffer;
  mimeType: string;
  baseName: string;
}

export interface OptimizeImageResult {
  url: string;
  originalFile?: string;
  variants: {
    thumb25?: string;
    thumb300?: string;
    medium800?: string;
    original?: string;
    originalFile?: string;
    'thumb-25': string;
    'thumb-300': string;
    'medium-800': string;
    'original-webp': string;
  };
  storedIn?: string;
  year: string;
  month: string;
  engine: 'sharp-webp' | 'native-disk-fallback';
}

export interface MediaSweepResult {
  scannedFiles: number;
  optimizedFiles: number;
  generatedVariants: number;
}

export function optimizeAndStoreImageBuffer(
  params: OptimizeImageInput
): Promise<OptimizeImageResult>;

export function ensureSiblingWebpVariants(
  absImagePath: string
): Promise<{ processed: boolean; generatedCount: number }>;

export function sweepAndOptimizeAllSiteImages(options?: {
  extraPublicUrls?: string[];
}): Promise<MediaSweepResult>;

export function startBackgroundMediaOptimizerAgent(options?: {
  getReferencedUrls?: () => Promise<string[]> | string[];
  intervalMs?: number;
}): {
  runNow: () => Promise<MediaSweepResult>;
  stop: () => void;
};
