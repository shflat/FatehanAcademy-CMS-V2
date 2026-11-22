import express from 'express';
import { cmsCache } from '../../core/cacheEngine.js';
import { normalizeIranPhone } from '../../core/cryptoSecurity.js';
import {
  attachOptionalAuth,
  requireAuth,
  requirePermission,
  syncPermissionsToDbAndFile,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  addClaimedSkillsToUser,
  dbQuery,
  dispatchEventSms,
  findUserByPhone,
  getActiveEngine,
  getStorefrontBootstrapData,
  syncCmsEntities,
  writeSystemLog,
} from '../../database/index.js';

import { resolveBuildId } from '../../core/envConfig.js';

export function createStorefrontRouter(): express.Router {
  const router = express.Router();

  router.get('/api/health', async (_req, res) => {
    res.json({
      status: 'ok',
      service: 'skill98-platform',
      cmsVersion: 'v2.9.0',
      buildId: resolveBuildId(),
      databaseEngine: getActiveEngine(),
      cacheStats: cmsCache.getStats(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  router.get(
    '/api/storefront/bootstrap',
    attachOptionalAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const isAdminSession =
          req.authSession?.role === 'super_admin' || req.authSession?.role === 'admin';
        const bypassCache = isAdminSession || req.query.fresh === '1';
        const cacheKey = 'bootstrap:public';
        if (!bypassCache) {
          const cached = cmsCache.get<Record<string, unknown>>(cacheKey);
          if (cached) {
            res.json({
              engine: getActiveEngine(),
              buildId: resolveBuildId(),
              cached: true,
              ...cached,
            });
            return;
          }
        }
        const data = await getStorefrontBootstrapData(isAdminSession);
        if (!isAdminSession) {
          cmsCache.set(cacheKey, data, 15_000);
        }
        res.json({
          engine: getActiveEngine(),
          buildId: resolveBuildId(),
          cached: false,
          ...data,
        });
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'خطا در بازیابی اطلاعات از دیتابیس',
        });
      }
    }
  );

  router.post(
    '/api/cms/state/sync',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = req.body || {};
        await syncCmsEntities(body);
        if (Array.isArray(body.roles)) {
          await syncPermissionsToDbAndFile(body.roles);
        }
        cmsCache.invalidatePrefix('bootstrap:');
        res.json({ ok: true, engine: getActiveEngine() });
      } catch (error) {
        await writeSystemLog({
          level: 'error',
          category: 'database',
          title: 'خطا در همگام‌سازی تنظیمات CMS با دیتابیس',
          detail: error instanceof Error ? error.message : String(error),
          sqlOrEndpoint: 'POST /api/cms/state/sync',
        });
        res.status(500).json({ error: 'خطا در ذخیره‌سازی اطلاعات روی دیتابیس' });
      }
    }
  );

  router.get('/api/user/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const requestedPhone = normalizeIranPhone(String(req.query.phone || req.authSession!.phone));
      const caller = req.authSession!;
      const isAdmin = caller.role === 'super_admin' || caller.role === 'admin';
      if (!isAdmin && requestedPhone !== caller.phone) {
        res.status(403).json({ error: 'دسترسی به پروفایل سایر کاربران مجاز نیست.' });
        return;
      }

      const targetPhone = requestedPhone || caller.phone;
      const user = await findUserByPhone(targetPhone);
      const userOrders = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM orders WHERE buyer_phone = $1 ORDER BY created_at DESC',
        [targetPhone]
      );
      let claimedSkillIds: string[] = [];
      if (user?.claimed_skill_ids_json) {
        try {
          claimedSkillIds = JSON.parse(user.claimed_skill_ids_json);
        } catch {
          claimedSkillIds = [];
        }
      }
      res.json({
        phone: targetPhone,
        fullName: user?.full_name || null,
        role: user?.role || 'customer',
        claimedSkillIds,
        orders: userOrders.map((o) => ({
          id: String(o.id),
          buyerId: String(o.buyer_phone),
          buyerName: String(o.buyer_name),
          totalAmount: Number(o.total_amount || 0),
          discountAmount: o.discount_amount ? Number(o.discount_amount) : undefined,
          couponCode: o.coupon_code ? String(o.coupon_code) : undefined,
          itemsSummary: String(o.items_summary),
          itemsCount: Number(o.items_count || 1),
          paymentMethod: String(o.payment_method || 'irankish'),
          status: String(o.status || 'paid'),
          createdAtLabel: String(o.created_at_label || ''),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در دریافت پروفایل کاربر',
      });
    }
  });

  router.post('/api/user/claim-skill', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const caller = req.authSession!;
      const requestedPhone = normalizeIranPhone(String(req.body?.phone || caller.phone));
      const isAdmin = caller.role === 'super_admin' || caller.role === 'admin';
      const targetPhone = isAdmin && requestedPhone ? requestedPhone : caller.phone;
      const skillId = String(req.body?.skillId || '').trim();
      const skillTitle = String(req.body?.skillTitle || skillId).trim();

      if (!targetPhone || !skillId) {
        res.status(400).json({ error: 'اطلاعات کاربر یا شناسه اسکیل نامعتبر است.' });
        return;
      }

      const user = await findUserByPhone(targetPhone);
      const claimed = await addClaimedSkillsToUser(targetPhone, [skillId]);
      await writeSystemLog({
        level: 'success',
        category: 'database',
        title: `ثبت مالکیت اسکیل رایگان توسط ${targetPhone}`,
        detail: `اسکیل «${skillTitle}» در جدول users ثبت شد.`,
        sqlOrEndpoint: 'POST /api/user/claim-skill',
        payload: { phone: targetPhone, skillId, skillTitle },
      });

      if (/^09\d{9}$/.test(targetPhone)) {
        await dispatchEventSms({
          eventKey: 'free_skill_claimed',
          phone: targetPhone,
          variables: {
            name: user?.full_name || 'کاربر گرامی',
            skill_title: skillTitle,
          },
        });
      }
      res.json({ ok: true, claimedSkillIds: claimed });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در ثبت اسکیل',
      });
    }
  });

  return router;
}
