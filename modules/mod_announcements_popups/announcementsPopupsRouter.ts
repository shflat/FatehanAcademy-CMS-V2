import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

let popupsSchemaReady = false;

async function ensurePopupsSchema() {
  if (popupsSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_announcements_popups (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'announcement_bar',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      cta_label TEXT,
      cta_url TEXT,
      trigger_delay_sec INTEGER DEFAULT 4,
      tone TEXT DEFAULT 'cobalt',
      enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);
  const existing = await dbQuery<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM mod_announcements_popups'
  );
  if (Number(existing[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_announcements_popups
        (id, kind, title, message, cta_label, cta_url, trigger_delay_sec, tone, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'ann_default_01',
        'announcement_bar',
        'جشنواره راه‌اندازی نسخه ۲.۶',
        'با کد تخفیف SKILL26 روی تمامی اسکیل‌ها و اشتراک VIP تخفیف ویژه دریافت کنید.',
        'مشاهده فروشگاه',
        '#catalog',
        0,
        'cobalt',
        0,
        new Date().toISOString(),
      ]
    );
  }
  popupsSchemaReady = true;
}

export function createAnnouncementsPopupsRouter() {
  const router = express.Router();

  router.get('/api/v1/modules/announcements/active', async (_req, res) => {
    try {
      await ensurePopupsSchema();
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_announcements_popups WHERE enabled = 1 ORDER BY updated_at DESC'
      );
      res.json({ ok: true, items: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Error' });
    }
  });

  router.get('/api/v1/modules/announcements', requireAdmin, async (_req, res) => {
    try {
      await ensurePopupsSchema();
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_announcements_popups ORDER BY updated_at DESC'
      );
      res.json({ ok: true, items: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Error' });
    }
  });

  router.post('/api/v1/modules/announcements', requireAdmin, async (req, res) => {
    try {
      await ensurePopupsSchema();
      const { id, kind, title, message, ctaLabel, ctaUrl, triggerDelaySec, tone, enabled } =
        (req.body || {}) as {
          id?: string;
          kind?: string;
          title?: string;
          message?: string;
          ctaLabel?: string;
          ctaUrl?: string;
          triggerDelaySec?: number;
          tone?: string;
          enabled?: boolean;
        };
      if (!title?.trim() || !message?.trim()) {
        res.status(400).json({ ok: false, error: 'عنوان و متن اطلاعیه الزامی است.' });
        return;
      }
      const itemId = id?.trim() || `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      await dbExec(
        `INSERT INTO mod_announcements_popups
          (id, kind, title, message, cta_label, cta_url, trigger_delay_sec, tone, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT(id) DO UPDATE SET
           kind = excluded.kind,
           title = excluded.title,
           message = excluded.message,
           cta_label = excluded.cta_label,
           cta_url = excluded.cta_url,
           trigger_delay_sec = excluded.trigger_delay_sec,
           tone = excluded.tone,
           enabled = excluded.enabled,
           updated_at = excluded.updated_at`,
        [
          itemId,
          kind === 'modal_popup' ? 'modal_popup' : 'announcement_bar',
          title.trim(),
          message.trim(),
          String(ctaLabel || '').trim(),
          String(ctaUrl || '').trim(),
          Math.max(0, Math.min(60, Number(triggerDelaySec || 0))),
          String(tone || 'cobalt'),
          enabled ? 1 : 0,
          now,
        ]
      );
      res.json({ ok: true, id: itemId });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save error' });
    }
  });

  router.delete('/api/v1/modules/announcements/:id', requireAdmin, async (req, res) => {
    try {
      await ensurePopupsSchema();
      await dbExec('DELETE FROM mod_announcements_popups WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Delete error' });
    }
  });

  return router;
}
