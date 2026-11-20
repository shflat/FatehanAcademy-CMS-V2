import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

let i18nSchemaReady = false;

const SEED_TRANSLATIONS = [
  { key: 'nav.store', fa: 'فروشگاه', en: 'Store', ar: 'المتجر' },
  { key: 'nav.articles', fa: 'مجله و مقالات', en: 'Journal', ar: 'المقالات' },
  { key: 'nav.login', fa: 'ورود / ثبت‌نام', en: 'Sign In / Register', ar: 'تسجيل الدخول' },
  { key: 'nav.dashboard', fa: 'پنل کاربری', en: 'User Dashboard', ar: 'لوحة المستخدم' },
  { key: 'cart.checkout', fa: 'تسویه حساب امن', en: 'Secure Checkout', ar: 'إتمام الطلب الآمن' },
  { key: 'product.download', fa: 'دانلود امن محصول', en: 'Secure Download', ar: 'تحميل آمن' },
];

async function ensureI18nSchema() {
  if (i18nSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_i18n_translations (
      t_key TEXT PRIMARY KEY,
      fa_text TEXT NOT NULL,
      en_text TEXT NOT NULL,
      ar_text TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  const existing = await dbQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM mod_i18n_translations');
  if (Number(existing[0]?.cnt || 0) === 0) {
    const now = new Date().toISOString();
    for (const row of SEED_TRANSLATIONS) {
      await dbExec(
        `INSERT INTO mod_i18n_translations (t_key, fa_text, en_text, ar_text, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.key, row.fa, row.en, row.ar, now]
      );
    }
  }
  i18nSchemaReady = true;
}

export function createI18nRouter() {
  const router = express.Router();

  // Public dictionary with RTL/LTR direction metadata
  router.get('/api/v1/modules/i18n/dictionary', async (req, res) => {
    try {
      await ensureI18nSchema();
      const lang = String(req.query.lang || 'fa').toLowerCase();
      const safeLang = lang === 'en' || lang === 'ar' ? lang : 'fa';
      const dir = safeLang === 'en' ? 'ltr' : 'rtl';
      const rows = await dbQuery<{
        t_key: string;
        fa_text: string;
        en_text: string;
        ar_text: string;
      }>('SELECT t_key, fa_text, en_text, ar_text FROM mod_i18n_translations ORDER BY t_key ASC');

      const dictionary: Record<string, string> = {};
      for (const r of rows) {
        dictionary[r.t_key] =
          safeLang === 'en' ? r.en_text : safeLang === 'ar' ? r.ar_text : r.fa_text;
      }

      res.json({
        ok: true,
        lang: safeLang,
        dir,
        supportedLocales: [
          { code: 'fa', label: 'فارسی', dir: 'rtl' },
          { code: 'en', label: 'English', dir: 'ltr' },
          { code: 'ar', label: 'العربية', dir: 'rtl' },
        ],
        dictionary,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'i18n error' });
    }
  });

  router.get('/api/v1/modules/i18n/admin/list', requireAdmin, async (_req, res) => {
    try {
      await ensureI18nSchema();
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_i18n_translations ORDER BY t_key ASC'
      );
      res.json({ ok: true, items: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'List error' });
    }
  });

  router.post('/api/v1/modules/i18n/admin/save', requireAdmin, async (req, res) => {
    try {
      await ensureI18nSchema();
      const { tKey, faText, enText, arText } = (req.body || {}) as {
        tKey?: string;
        faText?: string;
        enText?: string;
        arText?: string;
      };
      if (!tKey?.trim() || !faText?.trim()) {
        res.status(400).json({ ok: false, error: 'کلید ترجمه و متن فارسی الزامی است.' });
        return;
      }
      await dbExec(
        `INSERT INTO mod_i18n_translations (t_key, fa_text, en_text, ar_text, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(t_key) DO UPDATE SET
           fa_text = excluded.fa_text,
           en_text = excluded.en_text,
           ar_text = excluded.ar_text,
           updated_at = excluded.updated_at`,
        [
          tKey.trim().slice(0, 80),
          faText.trim(),
          String(enText || faText).trim(),
          String(arText || faText).trim(),
          new Date().toISOString(),
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save error' });
    }
  });

  return router;
}
