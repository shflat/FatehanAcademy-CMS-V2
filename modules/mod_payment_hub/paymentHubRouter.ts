import express from 'express';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../src/server/core/permissionsEngine.js';
import { dbExec, dbQuery, writeSystemLog } from '../../src/server/database/index.js';
import type { ModPaymentDriverRecord } from '../../src/server/database/phase5ModulesSchema.js';

function rowToDriver(r: Record<string, unknown>): ModPaymentDriverRecord {
  let creds: Record<string, string> = {};
  try {
    creds = JSON.parse(String(r.credentials_json || '{}'));
  } catch {
    creds = {};
  }
  return {
    id: String(r.id),
    gatewayKind: r.gateway_kind === 'bnpl_installment' ? 'bnpl_installment' : 'cash_psp',
    titleFa: String(r.title_fa || ''),
    providerCode: String(r.provider_code || ''),
    enabled: Number(r.enabled) === 1,
    sandboxMode: Number(r.sandbox_mode) === 1,
    cashDiscountPercent: Number(r.cash_discount_percent || 0),
    bnplFeePercent: Number(r.bnpl_fee_percent || 0),
    installmentsCount: Number(r.installments_count || 1),
    credentialsJson: creds,
    sortOrder: Number(r.sort_order || 1),
    updatedAt: String(r.updated_at || ''),
  };
}

export function createModPaymentHubRouter(): express.Router {
  const router = express.Router();

  // Public + Admin: List Payzito-style cash PSP & BNPL drivers
  router.get('/api/v1/modules/payment-hub/drivers', async (_req, res) => {
    try {
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_payment_hub_drivers ORDER BY sort_order ASC, id ASC'
      );
      const items = rows.map(rowToDriver);
      res.json({
        module: 'mod_payment_hub',
        total: items.length,
        cashGatewaysCount: items.filter((i) => i.gatewayKind === 'cash_psp').length,
        bnplGatewaysCount: items.filter((i) => i.gatewayKind === 'bnpl_installment').length,
        items,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت درایورهای هاب پرداخت',
      });
    }
  });

  // Admin: Update or configure a specific Cash/BNPL payment driver & pricing rule
  router.post(
    '/api/v1/modules/payment-hub/drivers',
    requireAuth,
    requirePermission('canManageGateways'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const id = String(b.id || '').trim();
        if (!id) {
          res.status(400).json({ error: 'شناسه درگاه الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        await dbExec(
          `UPDATE mod_payment_hub_drivers
           SET enabled = $1,
               sandbox_mode = $2,
               cash_discount_percent = $3,
               bnpl_fee_percent = $4,
               installments_count = $5,
               credentials_json = $6,
               updated_at = $7
           WHERE id = $8`,
          [
            b.enabled ? 1 : 0,
            b.sandboxMode ? 1 : 0,
            Number(b.cashDiscountPercent || 0),
            Number(b.bnplFeePercent || 0),
            Math.max(1, Number(b.installmentsCount || 1)),
            JSON.stringify(b.credentialsJson || {}),
            nowIso,
            id,
          ]
        );
        await writeSystemLog({
          level: 'success',
          category: 'payment',
          title: `به‌روزرسانی درایور هاب پرداخت (${id})`,
          detail: `تخفیف نقدی: ${b.cashDiscountPercent || 0}٪ | کارمزد اقساط: ${b.bnplFeePercent || 0}٪ | تعداد اقساط: ${b.installmentsCount || 1}`,
          sqlOrEndpoint: 'POST /api/v1/modules/payment-hub/drivers',
        });
        const rows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_payment_hub_drivers ORDER BY sort_order ASC, id ASC'
        );
        res.json({ ok: true, items: rows.map(rowToDriver) });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات درگاه',
        });
      }
    }
  );

  // Dynamic Pricing Rule Calculator (Cash Discount vs BNPL Markup & Installment Breakdown)
  router.post('/api/v1/modules/payment-hub/calculate', async (req, res) => {
    try {
      const baseAmount = Math.max(0, Number(req.body?.amountToman || 0));
      const driverId = String(req.body?.driverId || 'irankish');
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_payment_hub_drivers WHERE id = $1 LIMIT 1',
        [driverId]
      );
      const drv = rows[0] ? rowToDriver(rows[0]) : null;
      if (!drv) {
        res.status(404).json({ error: 'درگاه مورد نظر یافت نشد.' });
        return;
      }

      const cashDiscountAmount =
        drv.gatewayKind === 'cash_psp'
          ? Math.round((baseAmount * drv.cashDiscountPercent) / 100)
          : 0;
      const bnplFeeAmount =
        drv.gatewayKind === 'bnpl_installment'
          ? Math.round((baseAmount * drv.bnplFeePercent) / 100)
          : 0;
      const finalPayable = Math.max(0, baseAmount - cashDiscountAmount + bnplFeeAmount);
      const count = Math.max(1, drv.installmentsCount);
      const perInstallment = Math.ceil(finalPayable / count);

      res.json({
        driverId: drv.id,
        titleFa: drv.titleFa,
        gatewayKind: drv.gatewayKind,
        baseAmount,
        cashDiscountPercent: drv.cashDiscountPercent,
        cashDiscountAmount,
        bnplFeePercent: drv.bnplFeePercent,
        bnplFeeAmount,
        finalPayable,
        installmentsCount: count,
        perInstallmentAmount: perInstallment,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در محاسبه نرخ پویا',
      });
    }
  });

  return router;
}
