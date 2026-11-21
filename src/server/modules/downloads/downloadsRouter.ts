import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import type { ProductDownloadFile, SkillProduct } from '../../../core/types.js';
import { getEnvConfig } from '../../core/envConfig.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  dbQuery,
  findUserByPhone,
  writeSystemLog,
} from '../../database/index.js';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024; // 45 MB
const DOWNLOAD_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getProtectedDownloadsDir(): string {
  const uploadsRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const protectedDir = path.join(uploadsRoot, '_protected_downloads');
  fs.mkdirSync(protectedDir, { recursive: true });
  return protectedDir;
}

function formatBytesFa(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function signDownloadToken(payload: {
  phone: string;
  productId: string;
  fileId: string;
  exp: number;
}): string {
  const secret = getEnvConfig().otpHmacSecret || 'skill98-download-signing-secret';
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyDownloadToken(
  token: string
): { phone: string; productId: string; fileId: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  const secret = getEnvConfig().otpHmacSecret || 'skill98-download-signing-secret';
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      phone: string;
      productId: string;
      fileId: string;
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadAllProducts(): Promise<SkillProduct[]> {
  const rows = await dbQuery<{ payload_json: string }>('SELECT payload_json FROM products');
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as SkillProduct;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SkillProduct[];
}

async function resolveUserEntitledProductIds(
  phone: string,
  role: string,
  allProducts: SkillProduct[],
  includeImplicitFreeAndAdmin = false
): Promise<{
  entitledIds: Set<string>;
  purchasedOrderMap: Map<string, { orderId: string; createdAtLabel: string; status: string }>;
}> {
  const entitledIds = new Set<string>();
  const purchasedOrderMap = new Map<
    string,
    { orderId: string; createdAtLabel: string; status: string }
  >();

  // 1. Implicit free catalog items & Admin bypass ONLY for direct download token verification
  if (includeImplicitFreeAndAdmin) {
    for (const prod of allProducts) {
      if (prod.price === 0 || role === 'admin' || role === 'super_admin') {
        entitledIds.add(prod.id);
      }
    }
  }

  // 2. User claimed/purchased skill IDs
  const user = await findUserByPhone(phone);
  if (user?.claimed_skill_ids_json) {
    try {
      const ids = JSON.parse(user.claimed_skill_ids_json) as string[];
      for (const id of ids) entitledIds.add(id);
    } catch {
      // ignore
    }
  }

  // 3. Paid / Completed orders matching buyer_phone
  const orders = await dbQuery<{
    id: string;
    items_summary: string;
    status: string;
    created_at_label: string;
  }>(
    "SELECT id, items_summary, status, created_at_label FROM orders WHERE buyer_phone = $1 AND status IN ('paid', 'completed') ORDER BY created_at DESC",
    [phone]
  );

  for (const ord of orders) {
    const summary = String(ord.items_summary || '');
    for (const prod of allProducts) {
      if (
        summary.includes(prod.title) ||
        summary.includes(prod.id) ||
        summary.includes(prod.slug)
      ) {
        entitledIds.add(prod.id);
        if (!purchasedOrderMap.has(prod.id)) {
          purchasedOrderMap.set(prod.id, {
            orderId: ord.id,
            createdAtLabel: ord.created_at_label || '',
            status: ord.status,
          });
        }
      }
    }
  }

  // 4. Active VIP Subscription
  try {
    const subs = await dbQuery<{
      covered_categories_json: string;
      status: string;
      expires_at: string;
    }>(
      "SELECT covered_categories_json, status, expires_at FROM mod_user_subscriptions WHERE user_phone = $1 AND status = 'active' ORDER BY expires_at DESC LIMIT 1",
      [phone]
    );
    const activeSub = subs[0];
    if (activeSub && new Date(activeSub.expires_at).getTime() > Date.now()) {
      const cats: string[] = JSON.parse(activeSub.covered_categories_json || '["all"]');
      for (const prod of allProducts) {
        if (cats.includes('all') || cats.includes(prod.category)) {
          entitledIds.add(prod.id);
        }
      }
    }
  } catch {
    // subscriptions table might not be initialized yet
  }

  return { entitledIds, purchasedOrderMap };
}

export function createProtectedDownloadsRouter(): express.Router {
  const router = express.Router();

  // Admin: Upload a protected downloadable product file (stored outside public access)
  router.post(
    '/api/v1/downloads/upload',
    requireAuth,
    requirePermission('canManageProducts'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const rawDataUrl = String(req.body?.dataUrl || '').trim();
        const rawFileName = String(req.body?.fileName || 'package.zip').trim();
        const title = String(req.body?.title || rawFileName).trim();
        const version = String(req.body?.version || '1.0.0').trim();

        const match = /^data:([^;]+);base64,(.+)$/i.exec(rawDataUrl);
        if (!match) {
          res.status(400).json({ error: 'فرمت فایل ارسالی نامعتبر است.' });
          return;
        }
        const mimeType = match[1].toLowerCase();
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > MAX_UPLOAD_BYTES) {
          res.status(413).json({ error: 'حداکثر حجم مجاز برای هر فایل دانلودی ۴۵ مگابایت است.' });
          return;
        }

        const ext = path.extname(rawFileName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) || '.bin';
        const baseClean = path
          .basename(rawFileName, path.extname(rawFileName))
          .toLowerCase()
          .replace(/[^a-z0-9-_]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48) || 'download-asset';

        const storedFileName = `dl_${crypto.randomBytes(6).toString('hex')}_${baseClean}${ext}`;
        const targetPath = path.join(getProtectedDownloadsDir(), storedFileName);
        fs.writeFileSync(targetPath, buffer);

        const downloadFile: ProductDownloadFile = {
          id: `dlf_${crypto.randomBytes(4).toString('hex')}`,
          title,
          fileName: rawFileName,
          storageType: 'uploaded',
          sourceUrl: `protected://${storedFileName}`,
          fileSizeLabel: formatBytesFa(buffer.length),
          version,
          mimeType,
          protectedDownload: true,
        };

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `آپلود فایل دانلودی محافظت‌شده: ${rawFileName}`,
          detail: `حجم: ${downloadFile.fileSizeLabel} · توسط ${req.authSession?.phone || 'admin'}`,
          sqlOrEndpoint: 'POST /api/v1/downloads/upload',
        });

        res.json({ ok: true, file: downloadFile });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در آپلود فایل دانلودی',
        });
      }
    }
  );

  // Customer: List all entitled downloadable products + sanitized files (NO raw URLs exposed!)
  router.get('/api/v1/downloads/my-library', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const caller = req.authSession!;
      const allProducts = await loadAllProducts();
      const { entitledIds, purchasedOrderMap } = await resolveUserEntitledProductIds(
        caller.phone,
        caller.role,
        allProducts,
        false
      );

      const items = allProducts
        .filter((p) => entitledIds.has(p.id))
        .map((p) => {
          const orderInfo = purchasedOrderMap.get(p.id);
          const safeFiles = (p.downloadFiles || []).map((f) => ({
            id: f.id,
            title: f.title,
            fileName: f.fileName || f.title,
            storageType: f.storageType,
            fileSizeLabel: f.fileSizeLabel || 'فایل دیجیتال',
            version: f.version || p.version || '1.0',
            protectedDownload: true,
          }));
          return {
            productId: p.id,
            productTitle: p.title,
            productSlug: p.slug,
            category: p.category,
            imageUrl: p.imageUrl,
            productType: p.productType || (p.deliveryType === 'physical' ? 'physical' : 'downloadable'),
            version: p.version || '1.0',
            price: p.price,
            accessNote: p.downloadAccessNote || '',
            hasSkillMarkdown: Boolean(p.skillMarkdownContent),
            orderId: orderInfo?.orderId || null,
            purchasedAtLabel: orderInfo?.createdAtLabel || null,
            files: safeFiles,
          };
        })
        .filter((item) => item.files.length > 0 || item.hasSkillMarkdown);

      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت کتابخانه دانلودهای کاربر',
      });
    }
  });

  // Customer: Issue short-lived signed download token (verifies purchase/entitlement server-side)
  router.post('/api/v1/downloads/token', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const caller = req.authSession!;
      const productId = String(req.body?.productId || '').trim();
      const fileId = String(req.body?.fileId || '').trim();
      if (!productId || !fileId) {
        res.status(400).json({ error: 'شناسه محصول و فایل الزامی است.' });
        return;
      }

      const allProducts = await loadAllProducts();
      const product = allProducts.find((p) => p.id === productId);
      if (!product) {
        res.status(404).json({ error: 'محصول یافت نشد.' });
        return;
      }

      const { entitledIds } = await resolveUserEntitledProductIds(
        caller.phone,
        caller.role,
        allProducts,
        true
      );
      if (!entitledIds.has(product.id)) {
        res.status(403).json({
          error: 'برای دریافت این فایل باید ابتدا محصول را خریداری کنید یا اشتراک VIP فعال داشته باشید.',
        });
        return;
      }

      const file = (product.downloadFiles || []).find((f) => f.id === fileId);
      if (!file || !file.sourceUrl) {
        res.status(404).json({ error: 'فایل دانلودی مورد نظر ثبت نشده است.' });
        return;
      }

      const token = signDownloadToken({
        phone: caller.phone,
        productId: product.id,
        fileId: file.id,
        exp: Date.now() + DOWNLOAD_TOKEN_TTL_MS,
      });

      res.json({
        ok: true,
        downloadUrl: `/api/v1/downloads/stream/${encodeURIComponent(token)}`,
        expiresInSeconds: Math.floor(DOWNLOAD_TOKEN_TTL_MS / 1000),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در صدور توکن دانلود امن',
      });
    }
  });

  // Protected Stream Proxy: Streams local protected files OR proxies external download host without leaking URL
  router.get('/api/v1/downloads/stream/:token', async (req, res) => {
    try {
      const token = String(req.params.token || '').trim();
      const verified = verifyDownloadToken(token);
      if (!verified) {
        res.status(403).send('لینک دانلود منقضی شده یا نامعتبر است. لطفاً مجدداً از پنل کاربری اقدام کنید.');
        return;
      }

      const allProducts = await loadAllProducts();
      const product = allProducts.find((p) => p.id === verified.productId);
      const file = product?.downloadFiles?.find((f) => f.id === verified.fileId);
      if (!product || !file || !file.sourceUrl) {
        res.status(404).send('فایل دانلودی یافت نشد.');
        return;
      }

      const safeDownloadName = (file.fileName || `${product.slug || 'file'}.zip`).replace(
        /[\r\n"\\]/g,
        ''
      );
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');

      // Case A: Uploaded protected local file
      if (file.sourceUrl.startsWith('protected://')) {
        const storedName = path.basename(file.sourceUrl.replace('protected://', ''));
        const absPath = path.join(getProtectedDownloadsDir(), storedName);
        if (!fs.existsSync(absPath)) {
          res.status(404).send('فایل فیزیکی روی سرور یافت نشد.');
          return;
        }
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(safeDownloadName)}`
        );
        if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
        fs.createReadStream(absPath).pipe(res);
        return;
      }

      // Case B: External Download Host URL — server-side proxy so real host URL NEVER leaks!
      if (/^https?:\/\//i.test(file.sourceUrl)) {
        const upstream = await fetch(file.sourceUrl, { redirect: 'follow' });
        if (!upstream.ok) {
          res.status(502).send('خطا در دریافت فایل از هاست دانلود مبدا. لطفاً با پشتیبانی تماس بگیرید.');
          return;
        }
        const ct = upstream.headers.get('content-type') || 'application/octet-stream';
        const cl = upstream.headers.get('content-length');
        res.setHeader('Content-Type', ct);
        if (cl) res.setHeader('Content-Length', cl);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(safeDownloadName)}`
        );
        const arrayBuf = await upstream.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
        return;
      }

      res.status(400).send('مسیر منبع فایل معتبر نیست.');
    } catch (err) {
      res
        .status(500)
        .send(err instanceof Error ? err.message : 'خطای سرور در ارسال فایل دانلودی');
    }
  });

  return router;
}
