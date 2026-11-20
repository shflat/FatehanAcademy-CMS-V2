import express from 'express';
import type {
  CmsDynamicPage,
  CmsInvoiceTemplate,
  CmsMenuItem,
  ComposerRow,
} from '../../../core/types.js';
import { cmsCache } from '../../core/cacheEngine.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import { dbExec, dbQuery, writeSystemLog } from '../../database/index.js';

interface PageSqlRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  template_type: string;
  summary: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_image: string;
  schema_type: string;
  composer_rows_json: string;
  updated_at: string;
}

interface MenuSqlRow {
  id: string;
  location: string;
  title_fa: string;
  parent_id: string | null;
  target_type: string;
  target_value: string;
  badge_text: string;
  open_in_new_tab: number | boolean;
  sort_order: number;
  enabled: number | boolean;
  updated_at: string;
}

interface InvoiceTplSqlRow {
  id: string;
  template_code: string;
  title_fa: string;
  invoice_kind: string;
  paper_size: string;
  vat_percent: number;
  seller_name: string;
  seller_economic_code: string;
  seller_national_id: string;
  seller_postal_code: string;
  seller_phone: string;
  seller_address: string;
  logo_url: string;
  stamp_signature_url: string;
  footer_note: string;
  is_default: number | boolean;
  composer_rows_json: string;
  updated_at: string;
}

function parseComposerRows(raw: string): ComposerRow[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? (parsed as ComposerRow[]) : [];
  } catch {
    return [];
  }
}

function mapPageRow(row: PageSqlRow): CmsDynamicPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status === 'draft' ? 'draft' : 'published',
    templateType:
      (row.template_type as CmsDynamicPage['templateType']) || 'standard',
    summary: row.summary || '',
    seoTitle: row.seo_title || row.title,
    seoDescription: row.seo_description || row.summary || '',
    canonicalUrl: row.canonical_url || `/page/${row.slug}`,
    ogImage: row.og_image || '/logo-skill98.svg',
    schemaType:
      (row.schema_type as CmsDynamicPage['schemaType']) || 'WebPage',
    composerRows: parseComposerRows(row.composer_rows_json),
    updatedAt: row.updated_at,
  };
}

function mapMenuRow(row: MenuSqlRow): CmsMenuItem {
  return {
    id: row.id,
    location: (row.location as CmsMenuItem['location']) || 'header',
    titleFa: row.title_fa,
    parentId: row.parent_id || null,
    targetType: (row.target_type as CmsMenuItem['targetType']) || 'page',
    targetValue: row.target_value || '',
    badgeText: row.badge_text || undefined,
    openInNewTab: Boolean(row.open_in_new_tab),
    sortOrder: Number(row.sort_order || 1),
    enabled: row.enabled === undefined ? true : Boolean(row.enabled),
    updatedAt: row.updated_at,
  };
}

function mapInvoiceRow(row: InvoiceTplSqlRow): CmsInvoiceTemplate {
  return {
    id: row.id,
    templateCode: row.template_code,
    titleFa: row.title_fa,
    invoiceKind:
      row.invoice_kind === 'standard_commercial'
        ? 'standard_commercial'
        : 'official_tax',
    paperSize: (row.paper_size as CmsInvoiceTemplate['paperSize']) || 'A4',
    vatPercent: Number(row.vat_percent ?? 10),
    sellerName: row.seller_name || '',
    sellerEconomicCode: row.seller_economic_code || '',
    sellerNationalId: row.seller_national_id || '',
    sellerPostalCode: row.seller_postal_code || '',
    sellerPhone: row.seller_phone || '',
    sellerAddress: row.seller_address || '',
    logoUrl: row.logo_url || '/logo-skill98.svg',
    stampSignatureUrl: row.stamp_signature_url || '/logo-skill98-emblem.svg',
    footerNote: row.footer_note || '',
    isDefault: Boolean(row.is_default),
    composerRows: parseComposerRows(row.composer_rows_json),
    updatedAt: row.updated_at,
  };
}

export function createPagesMenusComposerRouter(): express.Router {
  const router = express.Router();

  // 1. Dynamic Pages Endpoints
  router.get('/api/v1/pages', async (req, res) => {
    try {
      const statusFilter = String(req.query.status || '').trim();
      const search = String(req.query.search || '').trim();
      const cacheKey = `pages:list:${statusFilter}:${search}`;
      const cached = cmsCache.get<{ ok: boolean; items: CmsDynamicPage[] }>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const rows = await dbQuery<PageSqlRow>(
        'SELECT * FROM pages ORDER BY updated_at DESC'
      );
      let items = rows.map(mapPageRow);
      if (statusFilter === 'published' || statusFilter === 'draft') {
        items = items.filter((p) => p.status === statusFilter);
      }
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q) ||
            p.summary.toLowerCase().includes(q)
        );
      }

      const payload = { ok: true, items };
      cmsCache.set(cacheKey, payload, 30_000);
      res.json(payload);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در دریافت لیست برگه‌ها',
      });
    }
  });

  router.get('/api/v1/pages/:slug', async (req, res) => {
    try {
      const slugOrId = String(req.params.slug || '').trim();
      const rows = await dbQuery<PageSqlRow>(
        'SELECT * FROM pages WHERE slug = $1 OR id = $2 LIMIT 1',
        [slugOrId, slugOrId]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'برگه مورد نظر یافت نشد.' });
        return;
      }
      res.json({ ok: true, item: mapPageRow(rows[0]) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در بارگذاری برگه',
      });
    }
  });

  router.post(
    '/api/v1/pages',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = req.body || {};
        const title = String(body.title || '').trim();
        if (!title) {
          res.status(400).json({ error: 'عنوان برگه الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const id =
          String(body.id || '').trim() ||
          `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const slug =
          String(body.slug || '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase() || `page-${Date.now()}`;
        const status = body.status === 'draft' ? 'draft' : 'published';
        const templateType = String(body.templateType || 'standard');
        const summary = String(body.summary || '').trim();
        const seoTitle = String(body.seoTitle || title).trim();
        const seoDescription = String(body.seoDescription || summary || title).trim();
        const canonicalUrl = String(body.canonicalUrl || `/page/${slug}`).trim();
        const ogImage = String(body.ogImage || '/logo-skill98.svg').trim();
        const schemaType = String(body.schemaType || 'WebPage');
        const composerRows: ComposerRow[] = Array.isArray(body.composerRows)
          ? body.composerRows
          : [];

        await dbExec(
          `INSERT INTO pages (
             id, slug, title, status, template_type, summary, seo_title, seo_description,
             canonical_url, og_image, schema_type, composer_rows_json, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             slug = EXCLUDED.slug,
             title = EXCLUDED.title,
             status = EXCLUDED.status,
             template_type = EXCLUDED.template_type,
             summary = EXCLUDED.summary,
             seo_title = EXCLUDED.seo_title,
             seo_description = EXCLUDED.seo_description,
             canonical_url = EXCLUDED.canonical_url,
             og_image = EXCLUDED.og_image,
             schema_type = EXCLUDED.schema_type,
             composer_rows_json = EXCLUDED.composer_rows_json,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            slug,
            title,
            status,
            templateType,
            summary,
            seoTitle,
            seoDescription,
            canonicalUrl,
            ogImage,
            schemaType,
            JSON.stringify(composerRows),
            nowIso,
          ]
        );

        cmsCache.invalidatePrefix('pages:');
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ذخیره برگه پویا: ${title}`,
          detail: `برگه با مسیر /page/${slug} و ${composerRows.length} ردیف صفحه‌ساز ذخیره شد.`,
          sqlOrEndpoint: 'POST /api/v1/pages',
        });

        res.json({
          ok: true,
          item: {
            id,
            slug,
            title,
            status,
            templateType,
            summary,
            seoTitle,
            seoDescription,
            canonicalUrl,
            ogImage,
            schemaType,
            composerRows,
            updatedAt: nowIso,
          },
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ذخیره برگه',
        });
      }
    }
  );

  router.delete(
    '/api/v1/pages/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '').trim();
        await dbExec('DELETE FROM pages WHERE id = $1', [id]);
        cmsCache.invalidatePrefix('pages:');
        res.json({ ok: true, deletedId: id });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در حذف برگه',
        });
      }
    }
  );

  // 2. Dynamic Hierarchical Menus Endpoints
  router.get('/api/v1/menus', async (req, res) => {
    try {
      const location = String(req.query.location || '').trim();
      const rows = location
        ? await dbQuery<MenuSqlRow>(
            'SELECT * FROM menus WHERE location = $1 ORDER BY sort_order ASC, title_fa ASC',
            [location]
          )
        : await dbQuery<MenuSqlRow>(
            'SELECT * FROM menus ORDER BY location ASC, sort_order ASC'
          );
      res.json({ ok: true, items: rows.map(mapMenuRow) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در دریافت آیتم‌های منو',
      });
    }
  });

  router.post(
    '/api/v1/menus',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = req.body || {};
        const titleFa = String(body.titleFa || '').trim();
        if (!titleFa) {
          res.status(400).json({ error: 'عنوان آیتم منو الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const id =
          String(body.id || '').trim() ||
          `menu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const location = String(body.location || 'header');
        const parentId =
          body.parentId && String(body.parentId).trim() !== ''
            ? String(body.parentId).trim()
            : null;
        const targetType = String(body.targetType || 'page');
        const targetValue = String(body.targetValue || '').trim();
        const badgeText = String(body.badgeText || '').trim();
        const openInNewTab = body.openInNewTab ? 1 : 0;
        const sortOrder = Number(body.sortOrder || 1);
        const enabled = body.enabled === false ? 0 : 1;

        await dbExec(
          `INSERT INTO menus (
             id, location, title_fa, parent_id, target_type, target_value,
             badge_text, open_in_new_tab, sort_order, enabled, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             location = EXCLUDED.location,
             title_fa = EXCLUDED.title_fa,
             parent_id = EXCLUDED.parent_id,
             target_type = EXCLUDED.target_type,
             target_value = EXCLUDED.target_value,
             badge_text = EXCLUDED.badge_text,
             open_in_new_tab = EXCLUDED.open_in_new_tab,
             sort_order = EXCLUDED.sort_order,
             enabled = EXCLUDED.enabled,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            location,
            titleFa,
            parentId,
            targetType,
            targetValue,
            badgeText,
            openInNewTab,
            sortOrder,
            enabled,
            nowIso,
          ]
        );

        res.json({ ok: true, id });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ذخیره آیتم منو',
        });
      }
    }
  );

  router.post(
    '/api/v1/menus/reorder',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const items: { id: string; sortOrder: number; parentId?: string | null }[] =
          Array.isArray(req.body?.items) ? req.body.items : [];
        const nowIso = new Date().toISOString();
        for (const item of items) {
          await dbExec(
            'UPDATE menus SET sort_order = $1, parent_id = $2, updated_at = $3 WHERE id = $4',
            [
              Number(item.sortOrder || 1),
              item.parentId || null,
              nowIso,
              String(item.id),
            ]
          );
        }
        res.json({ ok: true, updatedCount: items.length });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در چیدمان مجدد منو',
        });
      }
    }
  );

  router.delete(
    '/api/v1/menus/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '').trim();
        await dbExec('UPDATE menus SET parent_id = NULL WHERE parent_id = $1', [id]);
        await dbExec('DELETE FROM menus WHERE id = $1', [id]);
        res.json({ ok: true, deletedId: id });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در حذف آیتم منو',
        });
      }
    }
  );

  // 3. Visual Invoice Templates Endpoints
  router.get('/api/v1/invoice-templates', async (_req, res) => {
    try {
      const rows = await dbQuery<InvoiceTplSqlRow>(
        'SELECT * FROM invoice_templates ORDER BY is_default DESC, updated_at DESC'
      );
      res.json({ ok: true, items: rows.map(mapInvoiceRow) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در دریافت قالب‌های فاکتور',
      });
    }
  });

  router.post(
    '/api/v1/invoice-templates',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const titleFa = String(b.titleFa || '').trim();
        if (!titleFa) {
          res.status(400).json({ error: 'عنوان قالب فاکتور الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const id =
          String(b.id || '').trim() ||
          `inv_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const isDefault = Boolean(b.isDefault);
        if (isDefault) {
          await dbExec('UPDATE invoice_templates SET is_default = 0');
        }

        const composerRows: ComposerRow[] = Array.isArray(b.composerRows)
          ? b.composerRows
          : [];

        await dbExec(
          `INSERT INTO invoice_templates (
             id, template_code, title_fa, invoice_kind, paper_size, vat_percent,
             seller_name, seller_economic_code, seller_national_id, seller_postal_code,
             seller_phone, seller_address, logo_url, stamp_signature_url, footer_note,
             is_default, composer_rows_json, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             template_code = EXCLUDED.template_code,
             title_fa = EXCLUDED.title_fa,
             invoice_kind = EXCLUDED.invoice_kind,
             paper_size = EXCLUDED.paper_size,
             vat_percent = EXCLUDED.vat_percent,
             seller_name = EXCLUDED.seller_name,
             seller_economic_code = EXCLUDED.seller_economic_code,
             seller_national_id = EXCLUDED.seller_national_id,
             seller_postal_code = EXCLUDED.seller_postal_code,
             seller_phone = EXCLUDED.seller_phone,
             seller_address = EXCLUDED.seller_address,
             logo_url = EXCLUDED.logo_url,
             stamp_signature_url = EXCLUDED.stamp_signature_url,
             footer_note = EXCLUDED.footer_note,
             is_default = EXCLUDED.is_default,
             composer_rows_json = EXCLUDED.composer_rows_json,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            String(b.templateCode || 'CUSTOM_TPL').trim(),
            titleFa,
            b.invoiceKind === 'standard_commercial'
              ? 'standard_commercial'
              : 'official_tax',
            String(b.paperSize || 'A4'),
            Number(b.vatPercent ?? 10),
            String(b.sellerName || '').trim(),
            String(b.sellerEconomicCode || '').trim(),
            String(b.sellerNationalId || '').trim(),
            String(b.sellerPostalCode || '').trim(),
            String(b.sellerPhone || '').trim(),
            String(b.sellerAddress || '').trim(),
            String(b.logoUrl || '/logo-skill98.svg').trim(),
            String(b.stampSignatureUrl || '/logo-skill98-emblem.svg').trim(),
            String(b.footerNote || '').trim(),
            isDefault ? 1 : 0,
            JSON.stringify(composerRows),
            nowIso,
          ]
        );

        res.json({ ok: true, id });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ذخیره قالب فاکتور',
        });
      }
    }
  );

  return router;
}
