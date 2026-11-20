import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

let b2bSchemaReady = false;

async function ensureB2bSchema() {
  if (b2bSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_b2b_tiers (
      id TEXT PRIMARY KEY,
      tier_name_fa TEXT NOT NULL,
      min_qty INTEGER NOT NULL DEFAULT 5,
      discount_percent INTEGER NOT NULL DEFAULT 15,
      applies_category TEXT DEFAULT 'all',
      enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_b2b_quotes (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      product_summary TEXT NOT NULL,
      requested_qty INTEGER DEFAULT 10,
      status TEXT DEFAULT 'new',
      quoted_total INTEGER DEFAULT 0,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  b2bSchemaReady = true;
}

export function createB2bCompareRouter() {
  const router = express.Router();

  // Public product comparison endpoint
  router.get('/api/v1/modules/b2b-compare/compare', async (req, res) => {
    try {
      await ensureB2bSchema();
      const rawIds = String(req.query.ids || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      if (rawIds.length === 0) {
        res.json({ ok: true, products: [], tiers: [] });
        return;
      }
      const placeholders = rawIds.map((_, idx) => `$${idx + 1}`).join(', ');
      const products = await dbQuery<Record<string, unknown>>(
        `SELECT id, title, slug, category, price, original_price, level, modules_count, duration_hours, technical_specs_json
         FROM products WHERE id IN (${placeholders})`,
        rawIds
      );
      const tiers = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_b2b_tiers WHERE enabled = 1 ORDER BY min_qty ASC'
      );
      res.json({ ok: true, products, tiers });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Compare error' });
    }
  });

  // Public B2B quote submission
  router.post('/api/v1/modules/b2b-compare/quote', async (req, res) => {
    try {
      await ensureB2bSchema();
      const { companyName, contactPhone, productSummary, requestedQty } = (req.body || {}) as {
        companyName?: string;
        contactPhone?: string;
        productSummary?: string;
        requestedQty?: number;
      };
      if (!companyName?.trim() || !contactPhone?.trim() || !productSummary?.trim()) {
        res.status(400).json({ ok: false, error: 'نام شرکت، شماره تماس و شرح سفارش عمده الزامی است.' });
        return;
      }
      const id = `qte_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_b2b_quotes (id, company_name, contact_phone, product_summary, requested_qty, status, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, 'new', $6, $7)`,
        [
          id,
          companyName.trim(),
          contactPhone.trim(),
          productSummary.trim(),
          Math.max(1, Number(requestedQty || 10)),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Quote error' });
    }
  });

  router.get('/api/v1/modules/b2b-compare/admin/overview', requireAdmin, async (_req, res) => {
    try {
      await ensureB2bSchema();
      const tiers = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_b2b_tiers ORDER BY min_qty ASC'
      );
      const quotes = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_b2b_quotes ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ ok: true, tiers, quotes });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Overview error' });
    }
  });

  router.post('/api/v1/modules/b2b-compare/admin/tiers', requireAdmin, async (req, res) => {
    try {
      await ensureB2bSchema();
      const { tierNameFa, minQty, discountPercent, appliesCategory } = (req.body || {}) as {
        tierNameFa?: string;
        minQty?: number;
        discountPercent?: number;
        appliesCategory?: string;
      };
      if (!tierNameFa?.trim()) {
        res.status(400).json({ ok: false, error: 'عنوان پلکان فروش عمده الزامی است.' });
        return;
      }
      const id = `tier_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      await dbExec(
        `INSERT INTO mod_b2b_tiers (id, tier_name_fa, min_qty, discount_percent, applies_category, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, $6)`,
        [
          id,
          tierNameFa.trim(),
          Math.max(2, Number(minQty || 5)),
          Math.max(1, Math.min(80, Number(discountPercent || 15))),
          String(appliesCategory || 'all'),
          new Date().toISOString(),
        ]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Tier error' });
    }
  });

  router.delete('/api/v1/modules/b2b-compare/admin/tiers/:id', requireAdmin, async (req, res) => {
    try {
      await ensureB2bSchema();
      await dbExec('DELETE FROM mod_b2b_tiers WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Delete error' });
    }
  });

  return router;
}
