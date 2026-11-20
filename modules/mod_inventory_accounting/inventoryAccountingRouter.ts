import express from 'express';
import {
  requireAuth,
  requirePermission,
} from '../../src/server/core/permissionsEngine.js';
import { dbExec, dbQuery, writeSystemLog } from '../../src/server/database/index.js';

export function createModInventoryAccountingRouter(): express.Router {
  const router = express.Router();

  // Clean expired temporary reservations (Black-Friday 10-minute lock TTL)
  async function purgeExpiredReservations(): Promise<void> {
    const nowIso = new Date().toISOString();
    const expired = await dbQuery<Record<string, unknown>>(
      `SELECT * FROM mod_inventory_reservations WHERE status = 'active' AND expires_at < $1`,
      [nowIso]
    );
    for (const r of expired) {
      await dbExec(
        `UPDATE mod_inventory_stock
         SET reserved_qty = CASE WHEN reserved_qty >= $1 THEN reserved_qty - $1 ELSE 0 END
         WHERE product_id = $2`,
        [Number(r.qty || 1), String(r.product_id)]
      );
      await dbExec(
        `UPDATE mod_inventory_reservations SET status = 'expired' WHERE id = $1`,
        [String(r.id)]
      );
    }
  }

  // Get Real-Time Stock & Active Checkout Reservations
  router.get('/api/v1/modules/inventory/stock', async (_req, res) => {
    try {
      await purgeExpiredReservations();
      const stockRows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_inventory_stock ORDER BY updated_at DESC'
      );
      const activeReservations = await dbQuery<Record<string, unknown>>(
        `SELECT * FROM mod_inventory_reservations WHERE status = 'active' ORDER BY created_at DESC LIMIT 30`
      );
      const items = stockRows.map((r) => {
        const stockQty = Number(r.stock_qty || 0);
        const reservedQty = Number(r.reserved_qty || 0);
        const availableQty = Math.max(0, stockQty - reservedQty);
        const threshold = Number(r.low_stock_threshold || 5);
        return {
          productId: String(r.product_id),
          sku: String(r.sku),
          productTitle: String(r.product_title),
          stockQty,
          reservedQty,
          availableQty,
          lowStockThreshold: threshold,
          isLowStock: Number(r.is_unlimited_digital) === 0 && availableQty <= threshold,
          isUnlimitedDigital: Number(r.is_unlimited_digital) === 1,
          updatedAt: String(r.updated_at || ''),
        };
      });
      res.json({
        module: 'mod_inventory_accounting',
        items,
        activeReservationsCount: activeReservations.length,
        activeReservations,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در بازیابی موجودی انبار',
      });
    }
  });

  // Admin: Upsert product stock & low-stock alert threshold
  router.post(
    '/api/v1/modules/inventory/stock',
    requireAuth,
    requirePermission('canManageProducts'),
    async (req, res) => {
      try {
        const b = req.body || {};
        const productId = String(b.productId || '').trim();
        if (!productId) {
          res.status(400).json({ error: 'شناسه محصول الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        await dbExec(
          `INSERT INTO mod_inventory_stock
           (product_id, sku, product_title, stock_qty, reserved_qty, low_stock_threshold, is_unlimited_digital, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (product_id) DO UPDATE SET
             sku = EXCLUDED.sku,
             product_title = EXCLUDED.product_title,
             stock_qty = EXCLUDED.stock_qty,
             low_stock_threshold = EXCLUDED.low_stock_threshold,
             is_unlimited_digital = EXCLUDED.is_unlimited_digital,
             updated_at = EXCLUDED.updated_at`,
          [
            productId,
            String(b.sku || `SKU-${productId.slice(0, 8).toUpperCase()}`),
            String(b.productTitle || productId),
            Math.max(0, Number(b.stockQty ?? 20)),
            Math.max(0, Number(b.reservedQty ?? 0)),
            Math.max(1, Number(b.lowStockThreshold ?? 5)),
            b.isUnlimitedDigital ? 1 : 0,
            nowIso,
          ]
        );
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در بروزرسانی موجودی انبار',
        });
      }
    }
  );

  // Storefront Checkout Entry: Temporary Stock Reservation Lock (Black-Friday Protection)
  router.post('/api/v1/modules/inventory/reserve', async (req, res) => {
    try {
      await purgeExpiredReservations();
      const sessionKey = String(req.body?.sessionKey || `sess_${Date.now()}`);
      const items: { productId: string; qty: number }[] = Array.isArray(req.body?.items)
        ? req.body.items
        : [];
      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min lock
      const reservedIds: string[] = [];

      for (const it of items) {
        const pid = String(it.productId || '');
        const qty = Math.max(1, Number(it.qty || 1));
        const rows = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_inventory_stock WHERE product_id = $1 LIMIT 1',
          [pid]
        );
        if (rows[0] && Number(rows[0].is_unlimited_digital) === 0) {
          const avail = Number(rows[0].stock_qty || 0) - Number(rows[0].reserved_qty || 0);
          if (avail < qty) {
            res.status(409).json({
              error: `موجودی لحظه‌ای «${rows[0].product_title}» کافی نیست (موجودی آزاد: ${Math.max(0, avail)} عدد).`,
            });
            return;
          }
          await dbExec(
            'UPDATE mod_inventory_stock SET reserved_qty = reserved_qty + $1, updated_at = $2 WHERE product_id = $3',
            [qty, nowIso, pid]
          );
        }
        const resId = `rsv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await dbExec(
          `INSERT INTO mod_inventory_reservations (id, session_key, product_id, qty, expires_at, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
          [resId, sessionKey, pid, qty, expiresIso, nowIso]
        );
        reservedIds.push(resId);
      }

      res.json({
        ok: true,
        sessionKey,
        expiresAt: expiresIso,
        ttlSeconds: 600,
        reservedIds,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در رزرو موقت موجودی سبد خرید',
      });
    }
  });

  // Get Store Accounting Ledger + Summary Totals (Gross, Gateway Fees, Shipping, VAT 10%, Net Profit)
  router.get('/api/v1/modules/accounting/ledger', async (_req, res) => {
    try {
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_accounting_ledger ORDER BY created_at DESC LIMIT 100'
      );
      const entries = rows.map((r) => ({
        id: String(r.id),
        orderId: String(r.order_id),
        buyerName: String(r.buyer_name),
        gatewayId: String(r.gateway_id),
        paymentMode: String(r.payment_mode),
        grossAmount: Number(r.gross_amount || 0),
        discountAmount: Number(r.discount_amount || 0),
        gatewayFee: Number(r.gateway_fee || 0),
        shippingCost: Number(r.shipping_cost || 0),
        vatTaxAmount: Number(r.vat_tax_amount || 0),
        netProfit: Number(r.net_profit || 0),
        invoiceSerial: String(r.invoice_serial || ''),
        buyerEconomicCode: String(r.buyer_economic_code || ''),
        createdAt: String(r.created_at || ''),
      }));

      const summary = entries.reduce(
        (acc, e) => {
          acc.totalGross += e.grossAmount;
          acc.totalGatewayFees += e.gatewayFee;
          acc.totalShipping += e.shippingCost;
          acc.totalVatTax += e.vatTaxAmount;
          acc.totalNetProfit += e.netProfit;
          return acc;
        },
        { totalGross: 0, totalGatewayFees: 0, totalShipping: 0, totalVatTax: 0, totalNetProfit: 0 }
      );

      res.json({
        module: 'mod_inventory_accounting',
        summary,
        entries,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت دفتر کل حسابداری',
      });
    }
  });

  // Record a new Automated Accounting Ledger Entry
  router.post('/api/v1/modules/accounting/ledger', async (req, res) => {
    try {
      const b = req.body || {};
      const gross = Math.max(0, Number(b.grossAmount || 0));
      const discount = Math.max(0, Number(b.discountAmount || 0));
      const shipping = Math.max(0, Number(b.shippingCost || 0));
      const gatewayFee = Math.round(((gross - discount) * 1) / 100); // 1% PSP/BNPL fee
      const vatTax = Math.round(((gross - discount) * 10) / 100); // 10% Official VAT
      const netProfit = Math.max(0, gross - discount - gatewayFee - shipping);
      const id = `led_${Date.now()}`;
      const orderId = String(b.orderId || `ord_${Date.now()}`);
      const serial = `INV-1404-${orderId.replace(/[^0-9]/g, '').slice(-6) || '981050'}`;
      const nowIso = new Date().toISOString();

      await dbExec(
        `INSERT INTO mod_accounting_ledger
         (id, order_id, buyer_name, gateway_id, payment_mode, gross_amount, discount_amount, gateway_fee, shipping_cost, vat_tax_amount, net_profit, invoice_serial, buyer_economic_code, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id,
          orderId,
          String(b.buyerName || 'خریدار سازمانی'),
          String(b.gatewayId || 'irankish'),
          String(b.paymentMode || 'cash_shaparak'),
          gross,
          discount,
          gatewayFee,
          shipping,
          vatTax,
          netProfit,
          serial,
          String(b.buyerEconomicCode || '411589632147'),
          nowIso,
        ]
      );
      await writeSystemLog({
        level: 'success',
        category: 'payment',
        title: `ثبت خودکار سند در دفتر کل حسابداری (${serial})`,
        detail: `مبلغ ناخالص: ${gross} | مالیات ارزش افزوده: ${vatTax} | سود خالص: ${netProfit} تومان`,
        sqlOrEndpoint: 'POST /api/v1/modules/accounting/ledger',
      });
      res.json({ ok: true, id, invoiceSerial: serial, netProfit, vatTax });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در ثبت سند حسابداری',
      });
    }
  });

  return router;
}
