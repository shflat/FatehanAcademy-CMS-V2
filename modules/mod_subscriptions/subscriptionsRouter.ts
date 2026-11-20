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
import { formatIsoToJalali } from '../../src/core/jalali.js';

export async function ensureSubscriptionsSchema(): Promise<void> {
  await dbExec(`CREATE TABLE IF NOT EXISTS mod_subscription_plans (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title_fa TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    price INTEGER NOT NULL DEFAULT 0,
    original_price INTEGER NOT NULL DEFAULT 0,
    badge_text TEXT DEFAULT '',
    description TEXT DEFAULT '',
    features_json TEXT NOT NULL DEFAULT '[]',
    covered_categories_json TEXT NOT NULL DEFAULT '["all"]',
    auto_unlock_new_products INTEGER NOT NULL DEFAULT 1,
    auto_unlock_updates INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`);

  await dbExec(`CREATE TABLE IF NOT EXISTS mod_user_subscriptions (
    id TEXT PRIMARY KEY,
    user_phone TEXT NOT NULL,
    user_name TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    plan_title TEXT NOT NULL,
    covered_categories_json TEXT NOT NULL DEFAULT '["all"]',
    auto_unlock_new_products INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    started_at_fa TEXT NOT NULL,
    expires_at_fa TEXT NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0
  )`);

  const cnt = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_subscription_plans'
  );
  if (Number(cnt[0]?.cnt || 0) === 0) {
    const nowIso = new Date().toISOString();
    const defaultPlans = [
      {
        id: 'sub_plan_1m',
        code: 'monthly_1m',
        titleFa: 'اشتراک ویژه ۱ ماهه (۳۰ روزه)',
        durationDays: 30,
        price: 490000,
        originalPrice: 650000,
        badgeText: 'شروع سریع',
        description:
          'دسترسی کامل به تمامی اسکیل‌های جدید، آپدیت‌های نسخه‌های آینده و کتابخانه کلود/کدکس به مدت یک ماه.',
        features: [
          'باز شدن خودکار تمامی اسکیل‌ها و محصولات جدید در دوره اشتراک',
          'دریافت رایگان تمام آپدیت‌های محصولات و دسته‌بندی‌ها',
          'پشتیبانی اولویت‌دار در گفتگوی آنلاین',
        ],
        coveredCategories: ['all'],
        sortOrder: 1,
      },
      {
        id: 'sub_plan_3m',
        code: 'quarterly_3m',
        titleFa: 'اشتراک حرفه‌ای ۳ ماهه (۹۰ روزه)',
        durationDays: 90,
        price: 1290000,
        originalPrice: 1750000,
        badgeText: 'محبوب‌ترین',
        description:
          'بهترین انتخاب برای توسعه‌دهندگان فعال با صرفه‌جویی ۲۶٪ و دسترسی نامحدود به پکیج‌ها و اسکیل‌های تازه.',
        features: [
          'باز شدن خودکار تمامی محصولات و اسکیل‌های جدید منتشرشده',
          'دریافت فوری آپدیت‌های پروتکل MCP و کتابخانه‌های JS',
          'اعلان هوشمند CRM هنگام افزودن اسکیل جدید در علایق شما',
        ],
        coveredCategories: ['all'],
        sortOrder: 2,
      },
      {
        id: 'sub_plan_6m',
        code: 'semiannual_6m',
        titleFa: 'اشتراک پیشرفته ۶ ماهه (۱۸۰ روزه)',
        durationDays: 180,
        price: 2290000,
        originalPrice: 3200000,
        badgeText: 'پیشنهاد تیم‌ها',
        description:
          'شش ماه دسترسی بی‌وقفه به تمام مخزن اسکیل‌ها، پکیج‌های VIP و آپدیت‌های هفتگی بدون پرداخت مجدد.',
        features: [
          'دسترسی خودکار به تمام محصولات جدید و پکیج‌های VIP',
          'به‌روزرسانی مادام‌الدوره تمامی دسته‌بندی‌های فروشگاه',
          'ارسال مستقیم پیشنهادهای اختصاصی و کدهای مرجع',
        ],
        coveredCategories: ['all'],
        sortOrder: 3,
      },
      {
        id: 'sub_plan_12m',
        code: 'annual_12m',
        titleFa: 'اشتراک الماسی سالانه (۳۶۵ روزه)',
        durationDays: 365,
        price: 3950000,
        originalPrice: 5900000,
        badgeText: 'بیشترین صرفه‌جویی · ۳۳٪ تخفیف',
        description:
          'یک سال کامل دسترسی جامع به کل اکوسیستم اسکیل ۹۸، تمامی اسکیل‌های آینده، آپدیت‌های فوری و پکیج‌های سازمانی.',
        features: [
          'باز شدن آنی تمامی اسکیل‌ها و پکیج‌های فعلی و آینده در طول یک سال',
          'اولویت اول در پشتیبانی فنی و درخواست اسکیل سفارشی',
          'تضمین دسترسی دائمی به تمام به‌روزرسانی‌های دسته‌بندی‌ها',
        ],
        coveredCategories: ['all'],
        sortOrder: 4,
      },
    ];
    for (const p of defaultPlans) {
      await dbExec(
        `INSERT INTO mod_subscription_plans (
          id, code, title_fa, duration_days, price, original_price, badge_text,
          description, features_json, covered_categories_json,
          auto_unlock_new_products, auto_unlock_updates, enabled, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,1,1,$11,$12)
        ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          p.code,
          p.titleFa,
          p.durationDays,
          p.price,
          p.originalPrice,
          p.badgeText,
          p.description,
          JSON.stringify(p.features),
          JSON.stringify(p.coveredCategories),
          p.sortOrder,
          nowIso,
        ]
      );
    }
  }
}

function mapPlanRow(r: Record<string, unknown>) {
  let features: string[] = [];
  let coveredCategories: string[] = ['all'];
  try {
    features = JSON.parse(String(r.features_json || '[]'));
  } catch {
    features = [];
  }
  try {
    coveredCategories = JSON.parse(String(r.covered_categories_json || '["all"]'));
  } catch {
    coveredCategories = ['all'];
  }
  return {
    id: String(r.id),
    code: String(r.code),
    titleFa: String(r.title_fa),
    durationDays: Number(r.duration_days || 30),
    price: Number(r.price || 0),
    originalPrice: Number(r.original_price || 0),
    badgeText: String(r.badge_text || ''),
    description: String(r.description || ''),
    features,
    coveredCategories,
    autoUnlockNewProducts: Boolean(Number(r.auto_unlock_new_products)),
    autoUnlockUpdates: Boolean(Number(r.auto_unlock_updates)),
    enabled: Boolean(Number(r.enabled)),
    sortOrder: Number(r.sort_order || 1),
  };
}

function mapUserSubRow(r: Record<string, unknown>) {
  let coveredCategories: string[] = ['all'];
  try {
    coveredCategories = JSON.parse(String(r.covered_categories_json || '["all"]'));
  } catch {
    coveredCategories = ['all'];
  }
  return {
    id: String(r.id),
    userPhone: String(r.user_phone),
    userName: String(r.user_name),
    planId: String(r.plan_id),
    planTitle: String(r.plan_title),
    coveredCategories,
    autoUnlockNewProducts: Boolean(Number(r.auto_unlock_new_products)),
    status: String(r.status) as 'active' | 'expired' | 'cancelled',
    startedAt: String(r.started_at),
    expiresAt: String(r.expires_at),
    startedAtFa: String(r.started_at_fa),
    expiresAtFa: String(r.expires_at_fa),
    amountPaid: Number(r.amount_paid || 0),
  };
}

export function createModSubscriptionsRouter(): express.Router {
  const router = express.Router();

  // Public: Active Subscription Plans
  router.get('/api/v1/modules/subscriptions/plans', async (_req, res) => {
    try {
      await ensureSubscriptionsSchema();
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_subscription_plans WHERE enabled = 1 ORDER BY sort_order ASC'
      );
      res.json({ ok: true, plans: rows.map(mapPlanRow) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت پلن‌های اشتراک' });
    }
  });

  // Admin: All Plans & Active Subscribers Overview
  router.get(
    '/api/v1/modules/subscriptions/admin/overview',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        await ensureSubscriptionsSchema();
        const planRows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_subscription_plans ORDER BY sort_order ASC'
        );
        const subRows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_user_subscriptions ORDER BY started_at DESC LIMIT 100'
        );
        res.json({
          ok: true,
          plans: planRows.map(mapPlanRow),
          subscribers: subRows.map(mapUserSubRow),
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت پنل اشتراک‌ها' });
      }
    }
  );

  // Admin: Save / Edit Subscription Plan
  router.post(
    '/api/v1/modules/subscriptions/admin/plans',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureSubscriptionsSchema();
        const b = req.body || {};
        const id = String(b.id || `sub_plan_${Date.now()}`);
        const nowIso = new Date().toISOString();
        await dbExec(
          `INSERT INTO mod_subscription_plans (
            id, code, title_fa, duration_days, price, original_price, badge_text,
            description, features_json, covered_categories_json,
            auto_unlock_new_products, auto_unlock_updates, enabled, sort_order, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO UPDATE SET
            title_fa = EXCLUDED.title_fa,
            duration_days = EXCLUDED.duration_days,
            price = EXCLUDED.price,
            original_price = EXCLUDED.original_price,
            badge_text = EXCLUDED.badge_text,
            description = EXCLUDED.description,
            features_json = EXCLUDED.features_json,
            covered_categories_json = EXCLUDED.covered_categories_json,
            auto_unlock_new_products = EXCLUDED.auto_unlock_new_products,
            auto_unlock_updates = EXCLUDED.auto_unlock_updates,
            enabled = EXCLUDED.enabled,
            sort_order = EXCLUDED.sort_order,
            updated_at = EXCLUDED.updated_at`,
          [
            id,
            String(b.code || id),
            String(b.titleFa || 'اشتراک ویژه'),
            Math.max(1, Number(b.durationDays || 30)),
            Math.max(0, Number(b.price || 0)),
            Math.max(0, Number(b.originalPrice || 0)),
            String(b.badgeText || ''),
            String(b.description || ''),
            JSON.stringify(Array.isArray(b.features) ? b.features : []),
            JSON.stringify(Array.isArray(b.coveredCategories) && b.coveredCategories.length > 0 ? b.coveredCategories : ['all']),
            b.autoUnlockNewProducts !== false ? 1 : 0,
            b.autoUnlockUpdates !== false ? 1 : 0,
            b.enabled !== false ? 1 : 0,
            Number(b.sortOrder || 1),
            nowIso,
          ]
        );
        res.json({ ok: true, id });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره پلن اشتراک' });
      }
    }
  );

  // Authenticated Customer: Get My Active Subscription
  router.get(
    '/api/v1/modules/subscriptions/my-status',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureSubscriptionsSchema();
        const phone = req.authSession?.phone || '';
        const nowIso = new Date().toISOString();
        const rows = await dbQuery<Record<string, unknown>>(
          `SELECT * FROM mod_user_subscriptions
           WHERE user_phone = $1 AND status = 'active' AND expires_at > $2
           ORDER BY expires_at DESC LIMIT 1`,
          [phone, nowIso]
        );
        res.json({
          ok: true,
          activeSubscription: rows[0] ? mapUserSubRow(rows[0]) : null,
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در بررسی وضعیت اشتراک' });
      }
    }
  );

  // Authenticated Customer: Purchase / Activate Subscription Plan
  router.post(
    '/api/v1/modules/subscriptions/subscribe',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureSubscriptionsSchema();
        const phone = req.authSession?.phone || '';
        const userName = req.authSession?.user_display || phone;
        const planId = String(req.body?.planId || '').trim();
        const planRows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_subscription_plans WHERE id = $1 AND enabled = 1',
          [planId]
        );
        if (!planRows[0]) {
          res.status(404).json({ error: 'پلن اشتراک انتخاب‌شده یافت نشد یا غیرفعال است.' });
          return;
        }
        const plan = mapPlanRow(planRows[0]);
        const now = new Date();
        const expires = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        const subId = `usub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const startedAtFa = formatIsoToJalali(now.toISOString(), { includeTime: false });
        const expiresAtFa = formatIsoToJalali(expires.toISOString(), { includeTime: false });

        await dbExec(
          `INSERT INTO mod_user_subscriptions (
            id, user_phone, user_name, plan_id, plan_title, covered_categories_json,
            auto_unlock_new_products, status, started_at, expires_at,
            started_at_fa, expires_at_fa, amount_paid
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12)`,
          [
            subId,
            phone,
            userName,
            plan.id,
            plan.titleFa,
            JSON.stringify(plan.coveredCategories),
            plan.autoUnlockNewProducts ? 1 : 0,
            now.toISOString(),
            expires.toISOString(),
            startedAtFa,
            expiresAtFa,
            plan.price,
          ]
        );

        // Also record as an order in orders table for unified accounting & invoices
        const orderId = `SUB-${Date.now().toString().slice(-6)}`;
        await dbExec(
          `INSERT INTO orders (
            id, buyer_phone, buyer_name, total_amount, discount_amount, coupon_code,
            items_summary, items_count, payment_method, gateway_ref, status, created_at_label, created_at
          ) VALUES ($1,$2,$3,$4,0,'',$5,1,'wallet_credit',$6,'paid',$7,$8)`,
          [
            orderId,
            phone,
            userName,
            plan.price,
            plan.titleFa,
            subId,
            formatPersianDateTime(),
            now.toISOString(),
          ]
        );

        await writeSystemLog({
          level: 'success',
          category: 'payment',
          title: `فعال‌سازی اشتراک VIP (${plan.titleFa}) برای ${phone}`,
          detail: `اعتبار تا ${expiresAtFa} · باز شدن خودکار اسکیل‌ها و آپدیت‌های جدید`,
          sqlOrEndpoint: 'POST /api/v1/modules/subscriptions/subscribe',
        });

        res.json({
          ok: true,
          subscription: {
            id: subId,
            userPhone: phone,
            userName,
            planId: plan.id,
            planTitle: plan.titleFa,
            coveredCategories: plan.coveredCategories,
            autoUnlockNewProducts: plan.autoUnlockNewProducts,
            status: 'active',
            startedAt: now.toISOString(),
            expiresAt: expires.toISOString(),
            startedAtFa,
            expiresAtFa,
            amountPaid: plan.price,
          },
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در فعال‌سازی اشتراک' });
      }
    }
  );

  return router;
}
