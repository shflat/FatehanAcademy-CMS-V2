import express from 'express';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../src/server/core/permissionsEngine.js';
import {
  dbExec,
  dbQuery,
  formatPersianDateTime,
  writeSystemLog,
} from '../../src/server/database/index.js';

export async function ensureSmartCrmSchema(): Promise<void> {
  await dbExec(`CREATE TABLE IF NOT EXISTS mod_crm_rules (
    id TEXT PRIMARY KEY,
    title_fa TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'sms_and_dashboard',
    message_template TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`);

  await dbExec(`CREATE TABLE IF NOT EXISTS mod_crm_recommendations (
    id TEXT PRIMARY KEY,
    user_phone TEXT NOT NULL,
    user_name TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    category TEXT NOT NULL,
    reason_text TEXT NOT NULL,
    rule_trigger TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    created_at_fa TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  const count = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM mod_crm_rules');
  if (Number(count[0]?.cnt || 0) === 0) {
    const nowIso = new Date().toISOString();
    const defaultRules = [
      {
        id: 'crm_rule_category_new',
        titleFa: 'ارسال پیشنهاد خودکار هنگام انتشار اسکیل/محصول جدید در دسته‌بندی خریداری‌شده',
        triggerType: 'category_new_product',
        channel: 'sms_and_dashboard',
        messageTemplate:
          '{name} گرامی، محصول جدید «{product}» در دسته‌بندی مورد علاقه شما ({category}) منتشر شد.',
        enabled: 1,
      },
      {
        id: 'crm_rule_version_update',
        titleFa: 'اطلاع‌رسانی هوشمند هنگام به‌روزرسانی نسخه در دسته‌بندی علاقه‌مندی کاربر',
        triggerType: 'product_version_update',
        channel: 'dashboard',
        messageTemplate:
          'نسخه جدید و به‌روزرسانی‌شده «{product}» متناسب با سابقه خرید شما آماده دریافت است.',
        enabled: 1,
      },
      {
        id: 'crm_rule_cross_sell',
        titleFa: 'پیشنهاد مکمل هوشمند پس از خرید (Cross-Sell خودکار بر اساس علایق)',
        triggerType: 'post_purchase_cross_sell',
        channel: 'dashboard',
        messageTemplate:
          'بر اساس علایق شما در {category}، اسکیل «{product}» می‌تواند سرعت کار شما را دو برابر کند.',
        enabled: 1,
      },
    ];
    for (const r of defaultRules) {
      await dbExec(
        `INSERT INTO mod_crm_rules (id, title_fa, trigger_type, channel, message_template, enabled, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.titleFa, r.triggerType, r.channel, r.messageTemplate, r.enabled, nowIso]
      );
    }
  }
}

export async function runAutoCrmMatchingEngine(triggerSource = 'manual_scan'): Promise<{
  matchedCount: number;
  scannedUsers: number;
}> {
  await ensureSmartCrmSchema();
  const activeRules = await dbQuery<{ id: string; trigger_type: string; message_template: string }>(
    'SELECT id, trigger_type, message_template FROM mod_crm_rules WHERE enabled = 1'
  );
  if (activeRules.length === 0) {
    return { matchedCount: 0, scannedUsers: 0 };
  }

  const users = await dbQuery<{
    phone: string;
    full_name: string;
    claimed_skill_ids_json: string;
  }>('SELECT phone, full_name, claimed_skill_ids_json FROM users WHERE status = $1', ['active']);

  const products = await dbQuery<{
    id: string;
    slug: string;
    title: string;
    category: string;
    price: number;
    updated_at: string;
  }>("SELECT id, slug, title, category, price, updated_at FROM products WHERE status = 'published'");

  const orders = await dbQuery<{
    buyer_phone: string;
    items_summary: string;
  }>('SELECT buyer_phone, items_summary FROM orders');

  const productById = new Map(products.map((p) => [p.id, p]));
  const nowIso = new Date().toISOString();
  const nowFa = formatPersianDateTime();
  let matchedCount = 0;

  for (const u of users) {
    let claimedIds: string[] = [];
    try {
      claimedIds = JSON.parse(u.claimed_skill_ids_json || '[]');
    } catch {
      claimedIds = [];
    }

    const interestedCategories = new Set<string>();
    const ownedProductIds = new Set<string>(claimedIds);

    for (const pid of claimedIds) {
      const prod = productById.get(pid);
      if (prod?.category) interestedCategories.add(prod.category);
    }

    const userOrders = orders.filter((o) => o.buyer_phone === u.phone);
    for (const ord of userOrders) {
      for (const prod of products) {
        if (ord.items_summary && ord.items_summary.includes(prod.title.slice(0, 16))) {
          interestedCategories.add(prod.category);
          ownedProductIds.add(prod.id);
        }
      }
    }

    // If user has no explicit purchases yet, infer interest from newest flagship category
    if (interestedCategories.size === 0 && products[0]) {
      interestedCategories.add(products[0].category);
    }

    const candidates = products
      .filter((p) => interestedCategories.has(p.category) && !ownedProductIds.has(p.id))
      .slice(0, 3);

    for (const cand of candidates) {
      const existing = await dbQuery<{ id: string }>(
        'SELECT id FROM mod_crm_recommendations WHERE user_phone = $1 AND product_id = $2',
        [u.phone, cand.id]
      );
      if (existing.length > 0) continue;

      const rule = activeRules[0];
      const reasonText = rule.message_template
        .replace(/\{name\}/g, u.full_name || 'کاربر گرامی')
        .replace(/\{product\}/g, cand.title)
        .replace(/\{category\}/g, cand.category);

      const recId = `crm_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await dbExec(
        `INSERT INTO mod_crm_recommendations (
          id, user_phone, user_name, product_id, product_title, product_slug,
          category, reason_text, rule_trigger, status, created_at_fa, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'sent',$10,$11)`,
        [
          recId,
          u.phone,
          u.full_name || u.phone,
          cand.id,
          cand.title,
          cand.slug,
          cand.category,
          reasonText,
          triggerSource,
          nowFa,
          nowIso,
        ]
      );
      matchedCount++;
    }
  }

  if (matchedCount > 0) {
    await writeSystemLog({
      level: 'success',
      category: 'system',
      title: `موتور هوشمند CRM: ارسال خودکار ${matchedCount} پیشنهاد شخصی‌سازی‌شده`,
      detail: `منبع اجرا: ${triggerSource} · کاربران بررسی‌شده: ${users.length}`,
      sqlOrEndpoint: 'POST /api/v1/modules/smart-crm/admin/run-auto-match',
    });
  }

  return { matchedCount, scannedUsers: users.length };
}

export function createModSmartCrmRouter(): express.Router {
  const router = express.Router();

  // Admin Overview: rules, computed customer interest profiles, recent auto-recommendations
  router.get(
    '/api/v1/modules/smart-crm/admin/overview',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        await ensureSmartCrmSchema();
        const rulesRaw = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_crm_rules ORDER BY id ASC'
        );
        const recommendationsRaw = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_crm_recommendations ORDER BY created_at DESC LIMIT 80'
        );
        const usersRaw = await dbQuery<{
          phone: string;
          full_name: string;
          claimed_skill_ids_json: string;
        }>('SELECT phone, full_name, claimed_skill_ids_json FROM users LIMIT 60');
        const productsRaw = await dbQuery<{ id: string; category: string }>(
          'SELECT id, category FROM products'
        );
        const prodCatMap = new Map(productsRaw.map((p) => [p.id, p.category]));

        const customerProfiles = usersRaw.map((u) => {
          let claimed: string[] = [];
          try {
            claimed = JSON.parse(u.claimed_skill_ids_json || '[]');
          } catch {
            claimed = [];
          }
          const cats = Array.from(
            new Set(claimed.map((id) => prodCatMap.get(id)).filter(Boolean) as string[])
          );
          return {
            phone: u.phone,
            fullName: u.full_name,
            ownedCount: claimed.length,
            interestedCategories: cats.length > 0 ? cats : ['Claude', 'Codex'],
          };
        });

        res.json({
          ok: true,
          rules: rulesRaw.map((r) => ({
            id: String(r.id),
            titleFa: String(r.title_fa),
            triggerType: String(r.trigger_type),
            channel: String(r.channel),
            messageTemplate: String(r.message_template),
            enabled: Boolean(Number(r.enabled)),
            updatedAt: String(r.updated_at || ''),
          })),
          recommendations: recommendationsRaw.map((rec) => ({
            id: String(rec.id),
            userPhone: String(rec.user_phone),
            userName: String(rec.user_name),
            productId: String(rec.product_id),
            productTitle: String(rec.product_title),
            productSlug: String(rec.product_slug),
            category: String(rec.category),
            reasonText: String(rec.reason_text),
            ruleTrigger: String(rec.rule_trigger),
            status: String(rec.status),
            createdAtFa: String(rec.created_at_fa),
            createdAt: String(rec.created_at),
          })),
          customerProfiles,
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت داده‌های CRM' });
      }
    }
  );

  // Admin: Save / toggle CRM rule
  router.post(
    '/api/v1/modules/smart-crm/admin/rules',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureSmartCrmSchema();
        const b = req.body || {};
        const id = String(b.id || `crm_rule_${Date.now()}`);
        const nowIso = new Date().toISOString();
        await dbExec(
          `INSERT INTO mod_crm_rules (id, title_fa, trigger_type, channel, message_template, enabled, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET
             title_fa = EXCLUDED.title_fa,
             trigger_type = EXCLUDED.trigger_type,
             channel = EXCLUDED.channel,
             message_template = EXCLUDED.message_template,
             enabled = EXCLUDED.enabled,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            String(b.titleFa || 'قانون پیشنهاد هوشمند'),
            String(b.triggerType || 'category_new_product'),
            String(b.channel || 'dashboard'),
            String(b.messageTemplate || ''),
            b.enabled ? 1 : 0,
            nowIso,
          ]
        );
        res.json({ ok: true, id });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره قانون CRM' });
      }
    }
  );

  // Admin: Trigger Smart CRM Auto-Match Engine immediately
  router.post(
    '/api/v1/modules/smart-crm/admin/run-auto-match',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        const result = await runAutoCrmMatchingEngine('admin_manual_scan');
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در اجرای موتور تطبیق هوشمند' });
      }
    }
  );

  // Authenticated Customer: Fetch personalized recommendations based on their purchases & interests
  router.get(
    '/api/v1/modules/smart-crm/my-recommendations',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureSmartCrmSchema();
        const phone = req.authSession?.phone || '';
        if (!phone) {
          res.json({ ok: true, items: [] });
          return;
        }
        let rows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_crm_recommendations WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 8',
          [phone]
        );
        if (rows.length === 0) {
          await runAutoCrmMatchingEngine('customer_auto_refresh');
          rows = await dbQuery<Record<string, unknown>>(
            'SELECT * FROM mod_crm_recommendations WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 8',
            [phone]
          );
        }
        res.json({
          ok: true,
          items: rows.map((rec) => ({
            id: String(rec.id),
            userPhone: String(rec.user_phone),
            userName: String(rec.user_name),
            productId: String(rec.product_id),
            productTitle: String(rec.product_title),
            productSlug: String(rec.product_slug),
            category: String(rec.category),
            reasonText: String(rec.reason_text),
            ruleTrigger: String(rec.rule_trigger),
            status: String(rec.status),
            createdAtFa: String(rec.created_at_fa),
            createdAt: String(rec.created_at),
          })),
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت پیشنهادها' });
      }
    }
  );

  return router;
}
