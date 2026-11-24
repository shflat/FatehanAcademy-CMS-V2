import express from 'express';
import fs from 'fs';
import path from 'path';
import type { MediaAssetItem, SkillArticle, SkillProduct, ThemeConfig } from '../../../core/types.js';
import { formatIsoToJalali } from '../../../core/jalali.js';
import {
  optimizeAndStoreImageBuffer,
  startBackgroundMediaOptimizerAgent,
  sweepAndOptimizeAllSiteImages,
} from '../../../../core/agents/media-optimizer.js';
import { cmsCache } from '../../core/cacheEngine.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  dbExec,
  dbQuery,
  getSetting,
  setSetting,
  writeSystemLog,
} from '../../database/index.js';
import { DEFAULT_THEME_CONFIG } from '../../../data/defaults.js';

interface IncomingUploadFile {
  name?: string;
  dataUrl?: string;
  title?: string;
  altText?: string;
  caption?: string;
  category?: MediaAssetItem['category'];
}

function parseDataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string; isVideo: boolean } | null {
  const match = /^data:((?:image|video)\/[a-zA-Z0-9+.-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, mimeType, isVideo: mimeType.startsWith('video/') };
}

function storePhysicalVideoBuffer(buffer: Buffer, mimeType: string, baseName: string): { url: string; ext: string } {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const uploadsRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const targetDir = path.join(uploadsRoot, yyyy, mm);
  fs.mkdirSync(targetDir, { recursive: true });
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('quicktime') ? 'mov' : 'mp4';
  const safeSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'video';
  const fileName = `${safeSlug}-${Date.now().toString(36)}.${ext}`;
  fs.writeFileSync(path.join(targetDir, fileName), buffer);
  return { url: `/uploads/${yyyy}/${mm}/${fileName}`, ext };
}

export async function migrateDatabaseBase64ToPhysicalWebp(): Promise<{
  migratedCount: number;
  freedBytes: number;
}> {
  let migratedCount = 0;
  let freedBytes = 0;
  const nowIso = new Date().toISOString();

  // 1. Migrate media_items table
  const mediaRows = await dbQuery<{ id: string; title: string; url: string; category: string; payload_json: string }>(
    'SELECT id, title, url, category, payload_json FROM media_items'
  );
  for (const row of mediaRows) {
    if (row.url && row.url.startsWith('data:image/')) {
      const parsed = parseDataUrlToBuffer(row.url);
      if (parsed) {
        freedBytes += row.url.length;
        const stored = await optimizeAndStoreImageBuffer({
          buffer: parsed.buffer,
          mimeType: parsed.mimeType,
          baseName: row.title || row.id,
        });
        let payload: MediaAssetItem;
        try {
          payload = JSON.parse(row.payload_json) as MediaAssetItem;
        } catch {
          payload = {
            id: row.id,
            title: row.title,
            url: stored.url,
            altText: row.title,
            caption: row.title,
            seoTitle: row.title,
            seoDescription: row.title,
            seoKeywords: row.title,
            dimensionsLabel: 'WebP Multi-Size (25 / 300 / 800 / Orig)',
          };
        }
        payload.url = stored.url;
        payload.variants = stored.variants;
        payload.fileSizeBytes = parsed.buffer.length;
        payload.mimeType = 'image/webp';
        payload.dimensionsLabel = 'WebP Multi-Size (25 / 300 / 800 / Orig)';
        await dbExec(
          'UPDATE media_items SET url = $1, payload_json = $2, updated_at = $3 WHERE id = $4',
          [stored.url, JSON.stringify(payload), nowIso, row.id]
        );
        migratedCount++;
      }
    }
  }

  // 2. Migrate products table
  const prodRows = await dbQuery<{ id: string; title: string; payload_json: string }>(
    'SELECT id, title, payload_json FROM products'
  );
  for (const row of prodRows) {
    try {
      const prod = JSON.parse(row.payload_json) as SkillProduct;
      if (prod.imageUrl && prod.imageUrl.startsWith('data:image/')) {
        const parsed = parseDataUrlToBuffer(prod.imageUrl);
        if (parsed) {
          freedBytes += prod.imageUrl.length;
          const stored = await optimizeAndStoreImageBuffer({
            buffer: parsed.buffer,
            mimeType: parsed.mimeType,
            baseName: prod.slug || prod.id,
          });
          prod.imageUrl = stored.url;
          await dbExec('UPDATE products SET payload_json = $1, updated_at = $2 WHERE id = $3', [
            JSON.stringify(prod),
            nowIso,
            row.id,
          ]);
          migratedCount++;
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // 3. Migrate articles table
  const artRows = await dbQuery<{ id: string; title: string; payload_json: string }>(
    'SELECT id, title, payload_json FROM articles'
  );
  for (const row of artRows) {
    try {
      const art = JSON.parse(row.payload_json) as SkillArticle;
      if (art.featuredImageUrl && art.featuredImageUrl.startsWith('data:image/')) {
        const parsed = parseDataUrlToBuffer(art.featuredImageUrl);
        if (parsed) {
          freedBytes += art.featuredImageUrl.length;
          const stored = await optimizeAndStoreImageBuffer({
            buffer: parsed.buffer,
            mimeType: parsed.mimeType,
            baseName: art.slug || art.id,
          });
          art.featuredImageUrl = stored.url;
          await dbExec('UPDATE articles SET payload_json = $1, updated_at = $2 WHERE id = $3', [
            JSON.stringify(art),
            nowIso,
            row.id,
          ]);
          migratedCount++;
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // 4. Migrate theme_config logoUrl & faviconUrl if Base64
  try {
    const theme = await getSetting<ThemeConfig>('theme_config', DEFAULT_THEME_CONFIG);
    let themeChanged = false;
    if (theme.logoUrl && theme.logoUrl.startsWith('data:image/')) {
      const parsed = parseDataUrlToBuffer(theme.logoUrl);
      if (parsed) {
        freedBytes += theme.logoUrl.length;
        const stored = await optimizeAndStoreImageBuffer({
          buffer: parsed.buffer,
          mimeType: parsed.mimeType,
          baseName: 'brand-logo',
        });
        theme.logoUrl = stored.url;
        themeChanged = true;
        migratedCount++;
      }
    }
    if (theme.faviconUrl && theme.faviconUrl.startsWith('data:image/')) {
      const parsed = parseDataUrlToBuffer(theme.faviconUrl);
      if (parsed) {
        freedBytes += theme.faviconUrl.length;
        const stored = await optimizeAndStoreImageBuffer({
          buffer: parsed.buffer,
          mimeType: parsed.mimeType,
          baseName: 'brand-favicon',
        });
        theme.faviconUrl = stored.url;
        themeChanged = true;
        migratedCount++;
      }
    }
    if (themeChanged) {
      await setSetting('theme_config', theme);
    }
  } catch {
    // ignore theme migration errors
  }

  if (migratedCount > 0) {
    cmsCache.invalidatePrefix('bootstrap:');
  }
  return { migratedCount, freedBytes };
}

export async function collectAllReferencedSiteImageUrls(): Promise<string[]> {
  const urls = new Set<string>([
    '/assets/aistudio/logo_8c26749f.webp',
    '/assets/aistudio/fatehan_logo_transparent.png',
  ]);
  const addIfLocal = (val?: unknown) => {
    if (typeof val === 'string' && (val.startsWith('/assets/') || val.startsWith('/uploads/'))) {
      urls.add(val);
    }
  };

  try {
    const mediaRows = await dbQuery<{ url: string }>('SELECT url FROM media_items');
    for (const r of mediaRows) addIfLocal(r.url);
  } catch {
    // ignore
  }

  try {
    const prodRows = await dbQuery<{ payload_json: string }>('SELECT payload_json FROM products');
    for (const r of prodRows) {
      try {
        const p = JSON.parse(r.payload_json) as SkillProduct & {
          featuredImageUrl?: string;
          galleryUrls?: string[];
        };
        addIfLocal(p.imageUrl);
        addIfLocal(p.featuredImageUrl);
        if (Array.isArray(p.galleryUrls)) {
          for (const g of p.galleryUrls) addIfLocal(g);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  try {
    const artRows = await dbQuery<{ payload_json: string }>('SELECT payload_json FROM articles');
    for (const r of artRows) {
      try {
        const a = JSON.parse(r.payload_json) as SkillArticle;
        addIfLocal(a.featuredImageUrl);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  try {
    const theme = await getSetting<ThemeConfig>('theme_config', DEFAULT_THEME_CONFIG);
    addIfLocal(theme.logoUrl);
    addIfLocal(theme.faviconUrl);
    addIfLocal((theme as unknown as { socialChannels?: { eitaaLogoUrl?: string } })?.socialChannels?.eitaaLogoUrl);
    addIfLocal(
      (theme as unknown as { footerTrustBadges?: { enamadImageUrl?: string; secondBadgeImageUrl?: string } })
        ?.footerTrustBadges?.enamadImageUrl
    );
    addIfLocal(
      (theme as unknown as { footerTrustBadges?: { secondBadgeImageUrl?: string } })
        ?.footerTrustBadges?.secondBadgeImageUrl
    );
  } catch {
    // ignore
  }

  return Array.from(urls);
}

export async function runBackgroundMediaOptimizerSweep() {
  const base64Res = await migrateDatabaseBase64ToPhysicalWebp();
  const extraPublicUrls = await collectAllReferencedSiteImageUrls();
  const diskRes = await sweepAndOptimizeAllSiteImages({ extraPublicUrls });
  return {
    ...base64Res,
    ...diskRes,
  };
}

export function initContinuousMediaOptimizerAgent() {
  return startBackgroundMediaOptimizerAgent({
    getReferencedUrls: async () => {
      await migrateDatabaseBase64ToPhysicalWebp().catch(() => {});
      return collectAllReferencedSiteImageUrls();
    },
    intervalMs: 10 * 60 * 1000,
  });
}

export function createMediaEngineRouter(): express.Router {
  const router = express.Router();

  // Physical Multi-Size WebP Upload Endpoint (POST /api/v1/media/upload)
  router.post(
    '/api/v1/media/upload',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = req.body || {};
        const incomingFiles: IncomingUploadFile[] = Array.isArray(body.files)
          ? body.files
          : body.dataUrl
          ? [body]
          : [];

        if (incomingFiles.length === 0) {
          res.status(400).json({ error: 'هیچ فایل تصویری برای آپلود ارسال نشده است.' });
          return;
        }

        const nowIso = new Date().toISOString();
        const jalaliDate = formatIsoToJalali(nowIso, { includeTime: false });
        const savedItems: MediaAssetItem[] = [];

        for (const file of incomingFiles) {
          const rawDataUrl = String(file.dataUrl || '');
          const parsed = parseDataUrlToBuffer(rawDataUrl);
          if (!parsed) {
            res.status(400).json({
              error: `فرمت فایل «${file.name || 'نامشخص'}» پشتیبانی نمی‌شود. تصاویر (JPG/PNG/WebP/GIF) یا ویدیو (MP4/WebM) مجاز است.`,
            });
            return;
          }

          const maxBytes = parsed.isVideo ? 35 * 1024 * 1024 : 15 * 1024 * 1024;
          if (parsed.buffer.length > maxBytes) {
            res.status(400).json({
              error: parsed.isVideo
                ? 'حداکثر حجم مجاز برای هر ویدیو ۳۵ مگابایت است.'
                : 'حداکثر حجم مجاز برای هر تصویر ۱۵ مگابایت است.',
            });
            return;
          }

          const baseTitle =
            String(file.title || file.name || 'media-asset')
              .replace(/\.[a-zA-Z0-9]+$/, '')
              .trim() || (parsed.isVideo ? 'ویدیوی رسانه' : 'تصویر رسانه');

          let newItem: MediaAssetItem;
          if (parsed.isVideo) {
            const storedVideo = storePhysicalVideoBuffer(
              parsed.buffer,
              parsed.mimeType,
              file.name || baseTitle
            );
            newItem = {
              id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: baseTitle,
              url: storedVideo.url,
              mediaType: 'video',
              mimeType: parsed.mimeType,
              fileSizeBytes: parsed.buffer.length,
              category: file.category || 'product',
              altText: String(file.altText || baseTitle).trim(),
              caption: String(file.caption || baseTitle).trim(),
              seoTitle: `${baseTitle} | ویدیو اسکیل ۹۸`,
              seoDescription: `ویدیوی آموزشی ${baseTitle}`,
              seoKeywords: `${baseTitle}, ویدیو, اسکیل ۹۸`,
              dimensionsLabel: `Video · ${storedVideo.ext.toUpperCase()}`,
              createdAtLabel: jalaliDate,
              uploadedAtLabel: jalaliDate,
            };
          } else {
            const stored = await optimizeAndStoreImageBuffer({
              buffer: parsed.buffer,
              mimeType: parsed.mimeType,
              baseName: file.name || baseTitle,
            });
            newItem = {
              id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: baseTitle,
              url: stored.url,
              variants: stored.variants,
              mediaType: 'image',
              mimeType: 'image/webp',
              fileSizeBytes: parsed.buffer.length,
              category: file.category || 'product',
              altText: String(file.altText || baseTitle).trim(),
              caption: String(file.caption || baseTitle).trim(),
              seoTitle: `${baseTitle} | اسکیل ۹۸`,
              seoDescription: `تصویر بهینه‌شده خودکار WebP برای ${baseTitle}`,
              seoKeywords: `${baseTitle}, اسکیل ۹۸`,
              dimensionsLabel: 'بهینه‌شده خودکار (4 سایز WebP)',
              createdAtLabel: jalaliDate,
              uploadedAtLabel: jalaliDate,
            };
          }

          await dbExec(
            `INSERT INTO media_items (id, title, url, category, payload_json, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              newItem.id,
              newItem.title,
              newItem.url,
              newItem.category || 'product',
              JSON.stringify(newItem),
              nowIso,
            ]
          );

          savedItems.push(newItem);
        }

        cmsCache.invalidatePrefix('bootstrap:');
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `آپلود فیزیکی ${savedItems.length} تصویر در ۴ سایز WebP`,
          detail: `فایل‌ها در مسیر /public/uploads/ ذخیره و در جدول media_items ثبت شدند.`,
          sqlOrEndpoint: 'POST /api/v1/media/upload',
          payload: { count: savedItems.length, urls: savedItems.map((i) => i.url) },
        });

        res.json({
          ok: true,
          count: savedItems.length,
          items: savedItems,
        });
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'خطا در پردازش و ذخیره‌سازی چهار سایز WebP تصویر',
        });
      }
    }
  );

  // Manual & Automated Base64-to-Disk Migration Endpoint (POST /api/v1/media/migrate-base64)
  router.post(
    '/api/v1/media/migrate-base64',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        const result = await migrateDatabaseBase64ToPhysicalWebp();
        res.json({
          ok: true,
          ...result,
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در مهاجرت رشته‌های Base64 به دیسک',
        });
      }
    }
  );

  // Full-site 4-Size WebP Sweeper Endpoint (POST /api/v1/media/sweep-optimize)
  router.post(
    '/api/v1/media/sweep-optimize',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        const result = await runBackgroundMediaOptimizerSweep();
        res.json({
          ok: true,
          ...result,
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در بهینه‌سازی خودکار تصاویر سایت به ۴ سایز WebP',
        });
      }
    }
  );

  return router;
}
