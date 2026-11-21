#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = process.cwd();

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/gif',
]);

export const RESPONSIVE_SIZES = [
  { key: 'thumb25', suffix: 'thumb-25', width: 25, height: 25 },
  { key: 'thumb300', suffix: 'thumb-300', width: 300, height: 300 },
  { key: 'medium800', suffix: 'medium-800', width: 800, height: 600 },
  { key: 'original', suffix: 'original-webp', width: null, height: null },
];

export function resolveUploadRootDir() {
  return process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads');
}

export function getUploadMonthDir(now = new Date()) {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const relDir = `/uploads/${yyyy}/${mm}`;
  const absDir = path.join(resolveUploadRootDir(), yyyy, mm);
  fs.mkdirSync(absDir, { recursive: true });
  return { relDir, absDir, yyyy, mm };
}

export async function optimizeAndStoreImageBuffer({
  buffer,
  mimeType = 'image/webp',
  baseName = 'asset',
}) {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType.toLowerCase())) {
    throw new Error(`فرمت فایل (${mimeType}) مجاز نیست.`);
  }

  const safeSlug =
    String(baseName || 'asset')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'media';

  const uniqueHash = crypto.randomBytes(4).toString('hex');
  const { relDir, absDir } = getUploadMonthDir();
  const variants = {};

  // Non-destructive original preservation: keep exact untouched user/designer file on disk
  const mimeLower = String(mimeType || 'image/webp').toLowerCase();
  const origExt =
    mimeLower === 'image/png'
      ? 'png'
      : mimeLower === 'image/jpeg' || mimeLower === 'image/jpg'
      ? 'jpg'
      : mimeLower === 'image/svg+xml'
      ? 'svg'
      : mimeLower === 'image/gif'
      ? 'gif'
      : 'webp';
  const rawOriginalName = `${safeSlug}-${uniqueHash}-original.${origExt}`;
  fs.writeFileSync(path.join(absDir, rawOriginalName), buffer);
  variants.originalFile = `${relDir}/${rawOriginalName}`;

  let sharpModule = null;
  try {
    const imported = await import('sharp');
    sharpModule = imported.default || imported;
  } catch {
    sharpModule = null;
  }

  for (const size of RESPONSIVE_SIZES) {
    const fileName = `${safeSlug}-${uniqueHash}-${size.suffix}.webp`;
    const absFile = path.join(absDir, fileName);
    const publicUrl = `${relDir}/${fileName}`;

    if (sharpModule && mimeLower !== 'image/svg+xml') {
      let pipeline = sharpModule(buffer);
      if (size.width && size.height) {
        pipeline = pipeline.resize(size.width, size.height, {
          fit: 'cover',
          withoutEnlargement: true,
        });
      }
      await pipeline.webp({ quality: 82, effort: 4 }).toFile(absFile);
    } else {
      fs.writeFileSync(absFile, buffer);
    }
    variants[size.key] = publicUrl;
  }

  return {
    url: variants.original,
    originalFile: variants.originalFile,
    variants,
    storedIn: relDir,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { relDir } = getUploadMonthDir();
  console.log(
    `[media-optimizer] Ready. Physical upload directory ensured at /public${relDir} with 4 responsive WebP targets (25x25, 300x300, 800x600, original).`
  );
}
