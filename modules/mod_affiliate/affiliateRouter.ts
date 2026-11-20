import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

let affiliateSchemaReady = false;

async function ensureAffiliateSchema() {
  if (affiliateSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_affiliate_partners (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      ref_code TEXT NOT NULL UNIQUE,
      commission_percent INTEGER NOT NULL DEFAULT 15,
      total_clicks INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_affiliate_clicks (
      id TEXT PRIMARY KEY,
      ref_code TEXT NOT NULL,
      landing_path TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_affiliate_commissions (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      commission_toman INTEGER NOT NULL,
      payout_status TEXT DEFAULT 'pending',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  affiliateSchemaReady = true;
}

export function createAffiliateRouter() {
  const router = express.Router();

  // Public referral click tracker
  router.post('/api/v1/modules/affiliate/track-click', async (req, res) => {
    try {
      await ensureAffiliateSchema();
      const { refCode, landingPath } = (req.body || {}) as { refCode?: string; landingPath?: string };
      const code = String(refCode || '').trim().toUpperCase().slice(0, 40);
      if (!code) {
        res.status(400).json({ ok: false, error: 'کد معرف نامعتبر است.' });
        return;
      }
      await dbExec(
        'INSERT INTO mod_affiliate_clicks (id, ref_code, landing_path, created_at) VALUES ($1, $2, $3, $4)',
        [`clk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, code, String(landingPath || '/'), new Date().toISOString()]
      );
      await dbExec(
        'UPDATE mod_affiliate_partners SET total_clicks = total_clicks + 1 WHERE ref_code = $1',
        [code]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Track error' });
    }
  });

  router.get('/api/v1/modules/affiliate/overview', requireAdmin, async (_req, res) => {
    try {
      await ensureAffiliateSchema();
      const partners = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_affiliate_partners ORDER BY created_at DESC LIMIT 100'
      );
      const commissions = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_affiliate_commissions ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ ok: true, partners, commissions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Overview error' });
    }
  });

  router.post('/api/v1/modules/affiliate/partners', requireAdmin, async (req, res) => {
    try {
      await ensureAffiliateSchema();
      const { fullName, phone, refCode, commissionPercent } = (req.body || {}) as {
        fullName?: string;
        phone?: string;
        refCode?: string;
        commissionPercent?: number;
      };
      if (!fullName?.trim() || !phone?.trim()) {
        res.status(400).json({ ok: false, error: 'نام و شماره همکار فروش الزامی است.' });
        return;
      }
      const id = `aff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const code = (refCode?.trim() || `REF${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_affiliate_partners (id, full_name, phone, ref_code, commission_percent, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          fullName.trim(),
          phone.trim(),
          code,
          Math.max(1, Math.min(70, Number(commissionPercent || 15))),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, id, refCode: code });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Create partner error' });
    }
  });

  router.post('/api/v1/modules/affiliate/commissions/:id/payout', requireAdmin, async (req, res) => {
    try {
      await ensureAffiliateSchema();
      await dbExec(`UPDATE mod_affiliate_commissions SET payout_status = 'paid' WHERE id = $1`, [
        req.params.id,
      ]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Payout error' });
    }
  });

  return router;
}
