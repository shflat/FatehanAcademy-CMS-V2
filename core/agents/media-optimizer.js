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
  { key: 'thumb25', suffix: 'thumb-25', width: 25, height: 25, fit: 'cover' },
  { key: 'thumb300', suffix: 'thumb-300', width: 360, height: 360, fit: 'inside' },
  { key: 'medium800', suffix: 'medium-800', width: 800, height: 800, fit: 'inside' },
  { key: 'original', suffix: 'original-webp', width: null, height: null, fit: 'inside' },
];

const VARIANT_SUFFIX_REGEX = /-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i;
const RASTER_EXT_REGEX = /\.(jpe?g|png|webp|gif)$/i;

let cachedSharp = undefined;
async function loadSharp() {
  if (cachedSharp !== undefined) return cachedSharp;
  try {
    const imported = await import('sharp');
    cachedSharp = imported.default || imported;
  } catch {
    cachedSharp = null;
  }
  return cachedSharp;
}

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
  const { relDir, absDir, yyyy, mm } = getUploadMonthDir();
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

  const sharpModule = await loadSharp();

  for (const size of RESPONSIVE_SIZES) {
    const fileName = `${safeSlug}-${uniqueHash}-${size.suffix}.webp`;
    const absFile = path.join(absDir, fileName);
    const publicUrl = `${relDir}/${fileName}`;

    if (sharpModule && mimeLower !== 'image/svg+xml') {
      let pipeline = sharpModule(buffer).rotate();
      if (size.width && size.height) {
        pipeline = pipeline.resize(size.width, size.height, {
          fit: size.fit || 'inside',
          withoutEnlargement: true,
        });
      }
      const quality = size.key === 'thumb25' ? 68 : size.key === 'thumb300' ? 80 : 82;
      await pipeline.webp({ quality, effort: 4 }).toFile(absFile);
    } else {
      fs.writeFileSync(absFile, buffer);
    }
    variants[size.key] = publicUrl;
    variants[size.suffix] = publicUrl;
  }

  return {
    url: variants.original,
    originalFile: variants.originalFile,
    variants,
    storedIn: relDir,
    year: yyyy,
    month: mm,
    engine: sharpModule ? 'sharp-webp' : 'native-disk-fallback',
  };
}

/**
 * Ensures any raster image on disk (JPG, PNG, WebP, GIF) has all 4 responsive WebP variants
 * right next to it (`-thumb-25.webp`, `-thumb-300.webp`, `-medium-800.webp`, `-original-webp.webp`).
 * Skips already-generated variant files and keeps the original intact for safe fallback.
 */
export async function ensureSiblingWebpVariants(absImagePath) {
  if (!absImagePath || !fs.existsSync(absImagePath)) {
    return { processed: false, generatedCount: 0 };
  }
  const fileName = path.basename(absImagePath);
  if (!RASTER_EXT_REGEX.test(fileName) || VARIANT_SUFFIX_REGEX.test(fileName)) {
    return { processed: false, generatedCount: 0 };
  }
  // Skip raw "-original.<ext>" files created by optimizeAndStoreImageBuffer when their variants already share the prefix
  const dir = path.dirname(absImagePath);
  const rawStem = fileName.replace(RASTER_EXT_REGEX, '');
  const stem = rawStem.replace(/-original$/i, '');

  const sharpModule = await loadSharp();
  if (!sharpModule) {
    return { processed: false, generatedCount: 0 };
  }

  const srcStat = fs.statSync(absImagePath);
  let generatedCount = 0;
  let sourceBuffer = null;

  for (const size of RESPONSIVE_SIZES) {
    const targetPath = path.join(dir, `${stem}-${size.suffix}.webp`);
    let needsBuild = !fs.existsSync(targetPath);
    if (!needsBuild) {
      try {
        const targetStat = fs.statSync(targetPath);
        if (targetStat.size === 0 || targetStat.mtimeMs < srcStat.mtimeMs) {
          needsBuild = true;
        }
      } catch {
        needsBuild = true;
      }
    }
    if (!needsBuild) continue;

    if (!sourceBuffer) {
      sourceBuffer = fs.readFileSync(absImagePath);
    }

    let pipeline = sharpModule(sourceBuffer).rotate();
    if (size.width && size.height) {
      pipeline = pipeline.resize(size.width, size.height, {
        fit: size.fit || 'inside',
        withoutEnlargement: true,
      });
    }
    const quality = size.key === 'thumb25' ? 68 : size.key === 'thumb300' ? 80 : 82;
    await pipeline.webp({ quality, effort: 4 }).toFile(targetPath);
    generatedCount++;
  }

  return {
    processed: generatedCount > 0,
    generatedCount,
  };
}

function walkRasterImages(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('_protected') || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRasterImages(full, out);
    } else if (RASTER_EXT_REGEX.test(entry.name) && !VARIANT_SUFFIX_REGEX.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolvePublicUrlToDiskPath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const clean = rawUrl.split('?')[0].split('#')[0].trim();
  if (!clean.startsWith('/')) return null;
  const normalized = path.posix.normalize(clean);
  if (normalized.includes('..')) return null;

  if (normalized.startsWith('/uploads/')) {
    const rel = normalized.slice('/uploads/'.length);
    const primary = path.join(resolveUploadRootDir(), rel);
    if (fs.existsSync(primary)) return primary;
    const legacy = path.join(ROOT_DIR, 'public', 'uploads', rel);
    if (fs.existsSync(legacy)) return legacy;
    return null;
  }

  if (normalized.startsWith('/assets/')) {
    const candidate = path.join(ROOT_DIR, 'public', normalized.slice(1));
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Full-site background sweep:
 * Checks all theme kit/blog assets, uploads/, and any local image URL referenced in DB/settings.
 * Automatically generates missing WebP + 4 responsive sizes (`thumb-25`, `thumb-300`, `medium-800`, `original-webp`).
 */
export async function sweepAndOptimizeAllSiteImages({ extraPublicUrls = [] } = {}) {
  const candidates = new Set();

  const scanDirs = [
    path.join(ROOT_DIR, 'public', 'assets', 'kits'),
    path.join(ROOT_DIR, 'public', 'assets', 'blog'),
    resolveUploadRootDir(),
    path.join(ROOT_DIR, 'public', 'uploads'),
  ];

  for (const dir of scanDirs) {
    for (const file of walkRasterImages(dir)) {
      candidates.add(file);
    }
  }

  // Always include default Fatehan logo & any referenced URLs from DB (products, articles, media, themeConfig)
  const defaultAndExtraUrls = [
    '/assets/aistudio/logo_8c26749f.webp',
    '/assets/aistudio/fatehan_logo_transparent.png',
    ...extraPublicUrls,
  ];
  for (const url of defaultAndExtraUrls) {
    const diskPath = resolvePublicUrlToDiskPath(url);
    if (diskPath) candidates.add(diskPath);
  }

  let scannedFiles = 0;
  let optimizedFiles = 0;
  let generatedVariants = 0;

  for (const absPath of candidates) {
    scannedFiles++;
    try {
      const res = await ensureSiblingWebpVariants(absPath);
      if (res.processed) {
        optimizedFiles++;
        generatedVariants += res.generatedCount;
      }
    } catch {
      // ignore corrupted/non-image files safely
    }
  }

  return {
    scannedFiles,
    optimizedFiles,
    generatedVariants,
  };
}

let activeSweepTimer = null;
let isSweepRunning = false;

export function startBackgroundMediaOptimizerAgent({
  getReferencedUrls,
  intervalMs = 10 * 60 * 1000,
} = {}) {
  const runOnce = async () => {
    if (isSweepRunning) return { scannedFiles: 0, optimizedFiles: 0, generatedVariants: 0 };
    isSweepRunning = true;
    try {
      const extraPublicUrls = typeof getReferencedUrls === 'function' ? await getReferencedUrls() : [];
      const result = await sweepAndOptimizeAllSiteImages({ extraPublicUrls });
      if (result.generatedVariants > 0) {
        console.log(
          `[media-optimizer-agent] Auto-optimized ${result.optimizedFiles} image(s) -> ${result.generatedVariants} responsive WebP variants generated.`
        );
      }
      return result;
    } finally {
      isSweepRunning = false;
    }
  };

  // Initial non-blocking boot sweep
  setTimeout(() => {
    void runOnce().catch(() => {});
  }, 1500);

  if (activeSweepTimer) {
    clearInterval(activeSweepTimer);
  }
  activeSweepTimer = setInterval(() => {
    void runOnce().catch(() => {});
  }, Math.max(60_000, intervalMs));
  if (typeof activeSweepTimer.unref === 'function') {
    activeSweepTimer.unref();
  }

  return {
    runNow: runOnce,
    stop: () => {
      if (activeSweepTimer) {
        clearInterval(activeSweepTimer);
        activeSweepTimer = null;
      }
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { relDir } = getUploadMonthDir();
  const result = await sweepAndOptimizeAllSiteImages();
  console.log(
    `[media-optimizer] Sweep complete (${relDir}). Scanned: ${result.scannedFiles}, Optimized: ${result.optimizedFiles}, Generated variants: ${result.generatedVariants}`
  );
}
