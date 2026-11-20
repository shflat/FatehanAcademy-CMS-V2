import fs from 'fs';
import path from 'path';
import express from 'express';
import { dbExec, dbQuery } from '../../database/connection.js';
import { writeSystemLog } from '../../database/settingsLogsRepo.js';
import { requireSuperAdmin } from '../../middleware/authMiddleware.js';

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

function walkUploadFiles(dirPath: string, relBase = ''): { relPath: string; absPath: string; sizeBytes: number }[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: { relPath: string; absPath: string; sizeBytes: number }[] = [];

  for (const entry of entries) {
    // NEVER touch protected paid product downloads folder!
    if (entry.name === '_protected_downloads') continue;
    const absPath = path.join(dirPath, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkUploadFiles(absPath, relPath));
    } else if (entry.isFile()) {
      const stat = fs.statSync(absPath);
      results.push({ relPath, absPath, sizeBytes: stat.size });
    }
  }
  return results;
}

async function collectReferencedUploadStrings(): Promise<string> {
  const buckets: string[] = [];
  const queries = [
    'SELECT url, variants_json FROM media_items',
    'SELECT image_url, gallery_json, video_url, download_files_json FROM products',
    'SELECT featured_image_url, gallery_json, body_markdown FROM articles',
    'SELECT og_image, composer_rows_json FROM pages',
    'SELECT value_json FROM site_settings',
  ];
  for (const sql of queries) {
    try {
      const rows = await dbQuery<Record<string, unknown>>(sql);
      buckets.push(JSON.stringify(rows));
    } catch {
      // Optional table may not exist yet
    }
  }
  return buckets.join('\n');
}

async function safeDeleteTable(tableName: string, whereClause = ''): Promise<number> {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) return 0;
  try {
    const countRows = await dbQuery<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM ${tableName} ${whereClause}`
    );
    const cnt = Number(countRows[0]?.cnt || 0);
    await dbExec(`DELETE FROM ${tableName} ${whereClause}`);
    return cnt;
  } catch {
    return 0;
  }
}

export function createMaintenanceCleanersRouter() {
  const router = express.Router();

  // Selective Demo Cleaner with individual checkboxes
  router.post('/api/admin/maintenance/clean-demo', requireSuperAdmin, async (req, res) => {
    try {
      const {
        products = false,
        posts = false,
        orders = false,
        demoUsers = false,
        demoChats = false,
        reviews = false,
      } = (req.body || {}) as {
        products?: boolean;
        posts?: boolean;
        orders?: boolean;
        demoUsers?: boolean;
        demoChats?: boolean;
        reviews?: boolean;
      };

      const deletedSummary: Record<string, number> = {};

      if (products) {
        deletedSummary.products = await safeDeleteTable('products');
      }
      if (posts) {
        deletedSummary.posts = await safeDeleteTable('articles');
      }
      if (orders) {
        deletedSummary.orders = await safeDeleteTable('orders');
      }
      if (demoUsers) {
        // Strictly protect super_admin accounts!
        deletedSummary.demoUsers = await safeDeleteTable(
          'users',
          `WHERE role != 'super_admin' AND phone != '09120000001'`
        );
      }
      if (demoChats) {
        const mCnt = await safeDeleteTable('mod_live_chat_messages');
        const sCnt = await safeDeleteTable('mod_live_chat_sessions');
        deletedSummary.demoChats = mCnt + sCnt;
      }
      if (reviews) {
        const rCnt = await safeDeleteTable('mod_product_reviews');
        const qCnt = await safeDeleteTable('mod_product_qa');
        deletedSummary.reviews = rCnt + qCnt;
      }

      const totalRemoved = Object.values(deletedSummary).reduce((a, b) => a + b, 0);

      await writeSystemLog({
        level: 'warning',
        category: 'database',
        title: 'اجرای پاک‌سازی انتخابی داده‌های دمو (Selective Demo Cleaner)',
        detail: `مجموع ${totalRemoved.toLocaleString('fa-IR')} رکورد انتخابی حذف شد.`,
        sqlOrEndpoint: 'POST /api/admin/maintenance/clean-demo',
        payload: deletedSummary,
      });

      res.json({ ok: true, deletedSummary, totalRemoved });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در پاک‌سازی داده‌های دمو',
      });
    }
  });

  // Scan Orphan Media in /uploads
  router.get('/api/admin/maintenance/orphan-media', requireSuperAdmin, async (_req, res) => {
    try {
      const files = walkUploadFiles(UPLOADS_ROOT);
      const dbBlob = await collectReferencedUploadStrings();
      const orphans = files
        .filter((f) => {
          const publicUrl = `/uploads/${f.relPath}`;
          const fileNameOnly = path.basename(f.relPath);
          return !dbBlob.includes(publicUrl) && !dbBlob.includes(fileNameOnly);
        })
        .map((f) => ({
          relPath: f.relPath,
          publicUrl: `/uploads/${f.relPath}`,
          sizeBytes: f.sizeBytes,
        }));

      const totalBytes = orphans.reduce((acc, f) => acc + f.sizeBytes, 0);
      res.json({
        ok: true,
        scannedCount: files.length,
        orphanCount: orphans.length,
        totalBytes,
        orphans,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در اسکن فایل‌های بلااستفاده',
      });
    }
  });

  // Delete selected orphan files safely
  router.post('/api/admin/maintenance/orphan-media/clean', requireSuperAdmin, async (req, res) => {
    try {
      const { relPaths } = (req.body || {}) as { relPaths?: string[] };
      if (!Array.isArray(relPaths) || relPaths.length === 0) {
        res.status(400).json({ ok: false, error: 'هیچ فایلی برای حذف انتخاب نشده است.' });
        return;
      }

      let deletedCount = 0;
      let freedBytes = 0;

      for (const rawRel of relPaths) {
        const cleanRel = String(rawRel || '').replace(/^\/+/, '');
        if (!cleanRel || cleanRel.includes('..') || cleanRel.startsWith('_protected_downloads')) {
          continue;
        }
        const resolved = path.resolve(UPLOADS_ROOT, cleanRel);
        if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) continue;
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          freedBytes += fs.statSync(resolved).size;
          fs.unlinkSync(resolved);
          deletedCount += 1;
        }
      }

      await writeSystemLog({
        level: 'success',
        category: 'database',
        title: 'پاک‌سازی فایل‌های رسانه بلااستفاده (Orphan Media Cleaner)',
        detail: `${deletedCount.toLocaleString('fa-IR')} فایل حذف و ${Math.round(freedBytes / 1024).toLocaleString('fa-IR')} کیلوبایت فضا آزاد شد.`,
        sqlOrEndpoint: 'POST /api/admin/maintenance/orphan-media/clean',
      });

      res.json({ ok: true, deletedCount, freedBytes });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در حذف فایل‌های بلااستفاده',
      });
    }
  });

  return router;
}
