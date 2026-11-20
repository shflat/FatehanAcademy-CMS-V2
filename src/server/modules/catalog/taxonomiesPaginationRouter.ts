import express from 'express';
import type {
  MediaAssetItem,
  OrderRecord,
  SkillArticle,
  SkillProduct,
  TaxonomyItem,
  TaxonomyType,
} from '../../../core/types.js';
import { cmsCache } from '../../core/cacheEngine.js';
import {
  attachOptionalAuth,
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import { dbExec, dbQuery, writeSystemLog } from '../../database/index.js';

export async function listAllTaxonomies(): Promise<TaxonomyItem[]> {
  const [rows, prodCounts, artCounts] = await Promise.all([
    dbQuery<Record<string, unknown>>(
      'SELECT * FROM taxonomies ORDER BY taxonomy_type ASC, sort_order ASC, title_fa ASC'
    ),
    dbQuery<{ category: string; cnt: number | string }>(
      'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category'
    ),
    dbQuery<{ category: string; cnt: number | string }>(
      'SELECT category, COUNT(*) AS cnt FROM articles GROUP BY category'
    ),
  ]);

  const countMap = new Map<string, number>();
  for (const r of prodCounts) {
    countMap.set(String(r.category), (countMap.get(String(r.category)) || 0) + Number(r.cnt || 0));
  }
  for (const r of artCounts) {
    countMap.set(String(r.category), (countMap.get(String(r.category)) || 0) + Number(r.cnt || 0));
  }

  return rows.map((r) => {
    const slug = String(r.slug || '');
    const titleFa = String(r.title_fa || '');
    return {
      id: String(r.id),
      taxonomyType: (r.taxonomy_type as TaxonomyType) || 'product_category',
      slug,
      titleFa,
      parentId: r.parent_id ? String(r.parent_id) : null,
      iconName: String(r.icon_name || ''),
      imageUrl: String(r.image_url || ''),
      description: String(r.description || ''),
      sortOrder: Number(r.sort_order || 0),
      itemsCount: (countMap.get(slug) || 0) + (countMap.get(titleFa) || 0),
      updatedAt: String(r.updated_at || ''),
    };
  });
}

export function createTaxonomiesPaginationRouter(): express.Router {
  const router = express.Router();

  // 1. List Hierarchical Taxonomies (Categories, Brands, Tags)
  router.get('/api/v1/taxonomies', attachOptionalAuth, async (req, res) => {
    try {
      const filterType = String(req.query.type || '').trim();
      const all = await listAllTaxonomies();
      const items = filterType
        ? all.filter((t) => t.taxonomyType === filterType)
        : all;
      res.json({ ok: true, items });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در بازیابی طبقه‌بندی‌ها',
      });
    }
  });

  // 2. Create or Update Taxonomy Node (Parent/Child Categories, Brands, Tags)
  router.post(
    '/api/v1/taxonomies',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const titleFa = String(b.titleFa || '').trim();
        if (!titleFa) {
          res.status(400).json({ error: 'نام دسته‌بندی یا برچسب الزامی است.' });
          return;
        }
        const taxonomyType: TaxonomyType = [
          'product_category',
          'article_category',
          'brand',
          'tag',
        ].includes(b.taxonomyType)
          ? b.taxonomyType
          : 'product_category';
        const slug =
          String(b.slug || titleFa)
            .trim()
            .replace(/\s+/g, '-') || `tax-${Date.now().toString(36)}`;
        const id = String(b.id || `tax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
        const parentId = b.parentId && b.parentId !== id ? String(b.parentId) : null;
        const iconName = String(b.iconName || 'FolderTree').trim();
        const imageUrl = String(b.imageUrl || '').trim();
        const description = String(b.description || titleFa).trim();
        const sortOrder = Number(b.sortOrder) || 0;
        const nowIso = new Date().toISOString();

        await dbExec(
          `INSERT INTO taxonomies (id, taxonomy_type, slug, title_fa, parent_id, icon_name, image_url, description, sort_order, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             taxonomy_type = EXCLUDED.taxonomy_type,
             slug = EXCLUDED.slug,
             title_fa = EXCLUDED.title_fa,
             parent_id = EXCLUDED.parent_id,
             icon_name = EXCLUDED.icon_name,
             image_url = EXCLUDED.image_url,
             description = EXCLUDED.description,
             sort_order = EXCLUDED.sort_order,
             updated_at = EXCLUDED.updated_at`,
          [id, taxonomyType, slug, titleFa, parentId, iconName, imageUrl, description, sortOrder, nowIso]
        );

        cmsCache.invalidatePrefix('bootstrap:');
        const items = await listAllTaxonomies();
        res.json({ ok: true, items });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ذخیره دسته‌بندی',
        });
      }
    }
  );

  // 3. Delete Taxonomy Node & Re-parent Children Cleanly
  router.delete(
    '/api/v1/taxonomies/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const targetId = String(req.params.id || '').trim();
        if (!targetId) {
          res.status(400).json({ error: 'شناسه دسته‌بندی نامعتبر است.' });
          return;
        }
        await dbExec('UPDATE taxonomies SET parent_id = NULL WHERE parent_id = $1', [targetId]);
        await dbExec('DELETE FROM taxonomies WHERE id = $1', [targetId]);
        cmsCache.invalidatePrefix('bootstrap:');
        const items = await listAllTaxonomies();
        res.json({ ok: true, items });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در حذف دسته‌بندی',
        });
      }
    }
  );

  // 4. Server-Side Paginated & Multi-Attribute Filtered Query (1000+ Scale)
  router.get(
    '/api/v1/catalog/paginated',
    attachOptionalAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const entity = String(req.query.entity || 'products').trim();
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 12));
        const offset = (page - 1) * limit;
        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || '').trim();
        const status = String(req.query.status || '').trim();

        const whereClauses: string[] = [];
        const params: unknown[] = [];

        if (entity === 'products' || entity === 'articles') {
          const table = entity === 'products' ? 'products' : 'articles';
          if (category && category !== 'all') {
            params.push(category);
            whereClauses.push(`category = $${params.length}`);
          }
          if (status && status !== 'all') {
            params.push(status);
            whereClauses.push(`status = $${params.length}`);
          }
          if (search) {
            params.push(`%${search}%`);
            whereClauses.push(`(title LIKE $${params.length} OR slug LIKE $${params.length} OR category LIKE $${params.length})`);
          }
          const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
          const countRows = await dbQuery<{ cnt: number | string }>(
            `SELECT COUNT(*) AS cnt FROM ${table} ${whereSql}`,
            params
          );
          const totalCount = Number(countRows[0]?.cnt || 0);

          const pageParams = [...params, limit, offset];
          const rows = await dbQuery<{ payload_json: string }>(
            `SELECT payload_json FROM ${table} ${whereSql} ORDER BY featured DESC, updated_at DESC LIMIT $${
              params.length + 1
            } OFFSET $${params.length + 2}`,
            pageParams
          );
          const items = rows
            .map((r) => {
              try {
                return JSON.parse(r.payload_json);
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          res.json({
            ok: true,
            entity,
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
            items,
          });
          return;
        }

        if (entity === 'media') {
          if (category && category !== 'all') {
            params.push(category);
            whereClauses.push(`category = $${params.length}`);
          }
          if (search) {
            params.push(`%${search}%`);
            whereClauses.push(`(title LIKE $${params.length} OR url LIKE $${params.length})`);
          }
          const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
          const countRows = await dbQuery<{ cnt: number | string }>(
            `SELECT COUNT(*) AS cnt FROM media_items ${whereSql}`,
            params
          );
          const totalCount = Number(countRows[0]?.cnt || 0);
          const rows = await dbQuery<{ payload_json: string }>(
            `SELECT payload_json FROM media_items ${whereSql} ORDER BY updated_at DESC LIMIT $${
              params.length + 1
            } OFFSET $${params.length + 2}`,
            [...params, limit, offset]
          );
          const items = rows
            .map((r) => {
              try {
                return JSON.parse(r.payload_json) as MediaAssetItem;
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          res.json({
            ok: true,
            entity,
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
            items,
          });
          return;
        }

        if (entity === 'orders') {
          if (status && status !== 'all') {
            params.push(status);
            whereClauses.push(`status = $${params.length}`);
          }
          if (search) {
            params.push(`%${search}%`);
            whereClauses.push(
              `(id LIKE $${params.length} OR buyer_phone LIKE $${params.length} OR buyer_name LIKE $${params.length} OR items_summary LIKE $${params.length})`
            );
          }
          const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
          const countRows = await dbQuery<{ cnt: number | string }>(
            `SELECT COUNT(*) AS cnt FROM orders ${whereSql}`,
            params
          );
          const totalCount = Number(countRows[0]?.cnt || 0);
          const rows = await dbQuery<Record<string, unknown>>(
            `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT $${
              params.length + 1
            } OFFSET $${params.length + 2}`,
            [...params, limit, offset]
          );
          const items: OrderRecord[] = rows.map((o) => ({
            id: String(o.id),
            buyerId: String(o.buyer_phone || ''),
            buyerName: String(o.buyer_name || ''),
            totalAmount: Number(o.total_amount || 0),
            discountAmount: o.discount_amount ? Number(o.discount_amount) : undefined,
            couponCode: o.coupon_code ? String(o.coupon_code) : undefined,
            itemsSummary: String(o.items_summary || ''),
            itemsCount: Number(o.items_count || 1),
            paymentMethod: (o.payment_method as OrderRecord['paymentMethod']) || 'irankish',
            status: (o.status as OrderRecord['status']) || 'paid',
            createdAtLabel: String(o.created_at_label || ''),
          }));

          res.json({
            ok: true,
            entity,
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
            items,
          });
          return;
        }

        res.status(400).json({ error: 'موجودیت صفحه‌بندی نامعتبر است.' });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در صفحه‌بندی سروری',
        });
      }
    }
  );

  // 5. Bulk Actions Endpoint (Products, Articles, Media, Orders)
  router.post(
    '/api/v1/catalog/bulk',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { entity, action, ids, category } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0) {
          res.status(400).json({ error: 'حداقل یک آیتم را برای عملیات گروهی انتخاب کنید.' });
          return;
        }
        const nowIso = new Date().toISOString();
        let affectedCount = 0;

        for (const rawId of ids) {
          const id = String(rawId || '').trim();
          if (!id) continue;

          if (entity === 'products' || entity === 'articles') {
            const table = entity === 'products' ? 'products' : 'articles';
            if (action === 'delete') {
              await dbExec(`DELETE FROM ${table} WHERE id = $1`, [id]);
              affectedCount++;
            } else {
              const rows = await dbQuery<{ payload_json: string }>(
                `SELECT payload_json FROM ${table} WHERE id = $1`,
                [id]
              );
              if (rows[0]?.payload_json) {
                const parsed = JSON.parse(rows[0].payload_json) as SkillProduct & SkillArticle;
                if (action === 'publish') parsed.status = 'published';
                if (action === 'draft') parsed.status = 'draft';
                if (action === 'feature') parsed.featured = true;
                if (action === 'unfeature') parsed.featured = false;
                if (action === 'assign_category' && category) parsed.category = String(category);

                await dbExec(
                  `UPDATE ${table} SET status = $1, featured = $2, category = $3, payload_json = $4, updated_at = $5 WHERE id = $6`,
                  [
                    parsed.status || 'published',
                    parsed.featured ? 1 : 0,
                    parsed.category,
                    JSON.stringify(parsed),
                    nowIso,
                    id,
                  ]
                );
                affectedCount++;
              }
            }
          } else if (entity === 'media') {
            if (action === 'delete') {
              await dbExec('DELETE FROM media_items WHERE id = $1', [id]);
              affectedCount++;
            }
          } else if (entity === 'orders') {
            if (action === 'delete') {
              await dbExec('DELETE FROM orders WHERE id = $1', [id]);
              affectedCount++;
            } else if (['paid', 'pending', 'completed', 'cancelled'].includes(action)) {
              await dbExec('UPDATE orders SET status = $1 WHERE id = $2', [action, id]);
              affectedCount++;
            }
          }
        }

        cmsCache.invalidatePrefix('bootstrap:');
        await writeSystemLog({
          level: 'success',
          category: 'database',
          title: `عملیات گروهی (${action}) روی ${affectedCount} آیتم در بخش ${entity}`,
          detail: `شناسه‌ها: ${ids.slice(0, 6).join(', ')}`,
          sqlOrEndpoint: 'POST /api/v1/catalog/bulk',
        });

        res.json({ ok: true, affectedCount });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در اجرای عملیات گروهی',
        });
      }
    }
  );

  return router;
}
