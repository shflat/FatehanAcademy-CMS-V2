export interface OptimizeImageInput {
  buffer: Buffer;
  mimeType: string;
  baseName: string;
}

export interface OptimizeImageResult {
  url: string;
  variants: {
    'thumb-25': string;
    'thumb-300': string;
    'medium-800': string;
    'original-webp': string;
  };
  year: string;
  month: string;
  engine: 'sharp-webp' | 'native-disk-fallback';
}

export function optimizeAndStoreImageBuffer(
  params: OptimizeImageInput
): Promise<OptimizeImageResult>;

export function auditMediaStorage(): {
  passed: boolean;
  totalFilesOnDisk: number;
  base64LeaksInSource: number;
};
