import crypto from 'crypto';
import express from 'express';
import type { PaymentDisplayConfig } from '../../../core/types.js';
import { DEFAULT_PAYMENT_DISPLAY_CONFIG } from '../../../data/defaults.js';
import { getRequestBaseUrl, normalizeIranPhone } from '../../core/cryptoSecurity.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  addClaimedSkillsToUser,
  dbExec,
  dbQuery,
  dispatchEventSms,
  getAllPaymentGateways,
  getSetting,
  writeSystemLog,
} from '../../database/index.js';
import { sendSuperAdminBaleAlert } from '../../../../modules/mod_ai_hub_agent/baleAlertBridge.js';

export function createOrdersRouter(): express.Router {
  const router = express.Router();

  router.post('/api/orders/create', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const caller = req.authSession!;
      const bodyPhone = normalizeIranPhone(String(req.body?.phone || ''));
      const cleanPhone =
        (caller.role === 'super_admin' || caller.role === 'admin') && bodyPhone
          ? bodyPhone
          : caller.phone;

      const buyerName = String(req.body?.buyerName || caller.user_display || 'خریدار اسکیل ۹۸').trim();
      const totalAmount = Math.max(0, Number(req.body?.totalAmount || 0));
      const discountAmount = Math.max(0, Number(req.body?.discountAmount || 0));
      const couponCode = req.body?.couponCode ? String(req.body.couponCode) : null;
      const itemsSummary = String(req.body?.itemsSummary || 'خرید اسکیل از فروشگاه');
      const itemsCount = Math.max(1, Number(req.body?.itemsCount || 1));
      const paymentMethod = String(req.body?.paymentMethod || 'irankish');
      const gatewayRef = String(req.body?.gatewayRef || `SHP-${Date.now().toString().slice(-6)}`);
      const purchasedIds: string[] = Array.isArray(req.body?.skillIds) ? req.body.skillIds : [];

      const orderId = String(req.body?.id || `ord_${Date.now()}`);
      const createdAtLabel = new Date().toLocaleDateString('fa-IR');
      const nowIso = new Date().toISOString();

      const requestedStatus = req.body?.status === 'pending' ? 'pending' : 'paid';
      await dbExec(
        `INSERT INTO orders (
           id, buyer_phone, buyer_name, total_amount, discount_amount, coupon_code,
           items_summary, items_count, payment_method, gateway_ref, status, created_at_label, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          orderId,
          cleanPhone,
          buyerName,
          totalAmount,
          discountAmount,
          couponCode,
          itemsSummary,
          itemsCount,
          paymentMethod,
          gatewayRef,
          requestedStatus,
          createdAtLabel,
          nowIso,
        ]
      );

      if (requestedStatus === 'paid' && purchasedIds.length > 0) {
        await addClaimedSkillsToUser(cleanPhone, purchasedIds);
      }

      await writeSystemLog({
        level: 'success',
        category: 'payment',
        title: `ثبت و تسویه سفارش ${orderId} به مبلغ ${totalAmount.toLocaleString('fa-IR')} تومان`,
        detail: `خریدار: ${buyerName} (${cleanPhone}) · درگاه: ${paymentMethod} · کد مرجع: ${gatewayRef}`,
        sqlOrEndpoint: 'INSERT INTO orders',
        payload: { orderId, cleanPhone, totalAmount, paymentMethod, gatewayRef, purchasedIds },
      });

      if (/^09\d{9}$/.test(cleanPhone)) {
        await dispatchEventSms({
          eventKey: 'order_created',
          phone: cleanPhone,
          variables: {
            name: buyerName,
            tracking_code: orderId.slice(-6),
            amount: totalAmount.toLocaleString('fa-IR'),
          },
        });
        await dispatchEventSms({
          eventKey: 'payment_success',
          phone: cleanPhone,
          variables: {
            name: buyerName,
            tracking_code: orderId.slice(-6),
            ref_id: gatewayRef,
          },
        });
      }

      if (requestedStatus === 'paid') {
        void sendSuperAdminBaleAlert({
          category: 'order_paid',
          title: `سفارش جدید پرداخت شد (${orderId})`,
          lines: [
            `خریدار: ${buyerName} (${cleanPhone})`,
            `مبلغ: ${totalAmount.toLocaleString('fa-IR')} تومان`,
            `درگاه: ${paymentMethod} · مرجع: ${gatewayRef}`,
            `اقلام: ${itemsSummary.slice(0, 140)}`,
          ],
        });
      }

      res.json({ ok: true, id: orderId, createdAtLabel });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در ثبت سفارش در دیتابیس',
      });
    }
  });

  router.patch(
    '/api/orders/:id/status',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req, res) => {
      try {
        const orderId = String(req.params.id || '').trim();
        const nextStatus = String(req.body?.status || 'completed');
        const rows = await dbQuery<{ buyer_phone: string; buyer_name: string }>(
          'SELECT buyer_phone, buyer_name FROM orders WHERE id = $1 LIMIT 1',
          [orderId]
        );
        await dbExec('UPDATE orders SET status = $1 WHERE id = $2', [nextStatus, orderId]);

        await writeSystemLog({
          level: 'success',
          category: 'database',
          title: `تغییر وضعیت سفارش ${orderId} به ${nextStatus}`,
          detail: 'وضعیت سفارش در جدول orders به‌روزرسانی شد.',
          sqlOrEndpoint: 'UPDATE orders SET status = $1',
          payload: { orderId, nextStatus },
        });

        if (rows[0] && /^09\d{9}$/.test(rows[0].buyer_phone)) {
          const statusFa =
            nextStatus === 'completed'
              ? 'تکمیل و تحویل شده'
              : nextStatus === 'paid'
              ? 'پرداخت موفق'
              : nextStatus === 'cancelled'
              ? 'لغو شده'
              : 'در انتظار پرداخت';
          await dispatchEventSms({
            eventKey: 'order_status_changed',
            phone: rows[0].buyer_phone,
            variables: {
              name: rows[0].buyer_name || 'کاربر گرامی',
              tracking_code: orderId.slice(-6),
              status: statusFa,
            },
          });
        }

        if (nextStatus === 'failed' || nextStatus === 'cancelled') {
          void sendSuperAdminBaleAlert({
            category: 'order_failed',
            title: `سفارش ${orderId} با وضعیت «${nextStatus}» ثبت شد`,
            lines: [
              `خریدار: ${rows[0]?.buyer_name || '-'} (${rows[0]?.buyer_phone || '-'})`,
              `وضعیت جدید: ${nextStatus}`,
            ],
          });
        }

        res.json({ ok: true, id: orderId, status: nextStatus });
      } catch {
        res.status(500).json({ error: 'خطا در بروزرسانی وضعیت سفارش' });
      }
    }
  );

  router.post('/api/payment/request', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const {
        gatewayId = 'irankish',
        amountTomans = 0,
        amountToman,
        description = 'خرید از فروشگاه اسکیل ۹۸',
        buyerPhone,
        orderId,
      } = req.body || {};

      const cleanAmount = Math.max(0, Number(amountToman ?? amountTomans ?? 0));
      const allGateways = await getAllPaymentGateways();
      const displayCfg = await getSetting<PaymentDisplayConfig>(
        'payment_display_config',
        DEFAULT_PAYMENT_DISPLAY_CONFIG
      );

      const gwConfig = allGateways.find((g) => g.id === gatewayId);
      const txId = `tx_${Date.now()}_${crypto.randomInt(100, 999)}`;
      let authority = `AUTH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      let paymentUrl = '';
      let gatewayMode: 'live_api' | 'host_router' | 'sandbox_simulator' = 'sandbox_simulator';
      let gatewayError: string | undefined;

      const dynamicOrigin = getRequestBaseUrl(req);
      const configuredCb = String(gwConfig?.callbackUrl || '').trim();
      const callbackUrl = configuredCb || `${dynamicOrigin}/?payment_verify=1`;

      if (
        gatewayId === 'irankish' &&
        gwConfig?.merchantId &&
        !gwConfig.sandboxMode &&
        !displayCfg.enablePaymentSimulator
      ) {
        if (gwConfig.useHostRouter && gwConfig.hostRouterUrl) {
          try {
            const routerResp = await fetch(gwConfig.hostRouterUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetUrl: 'https://ikc.shaparak.ir/api/v3/tokenization/make',
                body: {
                  request: {
                    acceptorId: gwConfig.merchantId,
                    terminalId: gwConfig.terminalId,
                    amount: cleanAmount * 10,
                    revertUri: callbackUrl,
                  },
                },
              }),
            });
            if (routerResp.ok) {
              gatewayMode = 'host_router';
            }
          } catch (err) {
            gatewayError = err instanceof Error ? err.message : String(err);
          }
        }
      } else if (
        gatewayId === 'zarinpal_online' &&
        gwConfig?.merchantId &&
        gwConfig.merchantId.length === 36
      ) {
        const endpoint = gwConfig.sandboxMode
          ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
          : 'https://api.zarinpal.com/pg/v4/payment/request.json';
        try {
          const zpResp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchant_id: gwConfig.merchantId,
              amount: cleanAmount * 10,
              description,
              callback_url: callbackUrl,
            }),
          });
          const zpJson = (await zpResp.json()) as {
            data?: { authority?: string };
            errors?: unknown;
          };
          if (zpJson?.data?.authority) {
            authority = zpJson.data.authority;
            gatewayMode = 'live_api';
            paymentUrl = gwConfig.sandboxMode
              ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
              : `https://www.zarinpal.com/pg/StartPay/${authority}`;
          } else {
            gatewayError = JSON.stringify(zpJson?.errors || zpJson);
          }
        } catch (err) {
          gatewayError = err instanceof Error ? err.message : String(err);
        }
      } else if (gatewayId === 'novinopay' && (gwConfig?.merchantId || gwConfig?.sandboxMode)) {
        const merchantId =
          gwConfig.sandboxMode || !gwConfig.merchantId ? 'test' : gwConfig.merchantId.trim();
        try {
          const nvPayload: Record<string, unknown> = {
            merchant_id: merchantId,
            amount: Math.max(10000, cleanAmount * 10),
            callback_url: callbackUrl,
            callback_method: 'GET',
            description: String(description || 'خرید از فروشگاه اسکیل ۹۸').slice(0, 255),
            invoice_id: String(orderId || txId),
          };
          if (buyerPhone && /^09\d{9}$/.test(String(buyerPhone))) {
            nvPayload.mobile = String(buyerPhone);
          }

          const nvResp = await fetch('https://api.novinopay.com/payment/ipg/v2/request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(nvPayload),
          });
          const nvJson = (await nvResp.json().catch(() => ({}))) as {
            status?: string | number;
            message?: string;
            errors?: unknown;
            data?: { authority?: string; payment_url?: string };
          };
          if (String(nvJson?.status) === '100' && nvJson?.data?.authority) {
            authority = nvJson.data.authority;
            paymentUrl =
              nvJson.data.payment_url || `https://ipg.novinopay.com/StartPay/${authority}`;
            gatewayMode = 'live_api';
          } else {
            gatewayError = nvJson?.message || JSON.stringify(nvJson?.errors || nvJson);
          }
        } catch (err) {
          gatewayError = err instanceof Error ? err.message : String(err);
        }
      } else if (gatewayId === 'zibal_direct' && gwConfig?.merchantId) {
        try {
          const zbResp = await fetch('https://gateway.zibal.ir/v1/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchant: gwConfig.merchantId,
              amount: cleanAmount * 10,
              callbackUrl,
              description,
            }),
          });
          const zbJson = (await zbResp.json()) as { trackId?: number; message?: string };
          if (zbJson?.trackId) {
            authority = `ZIBAL-${zbJson.trackId}`;
            gatewayMode = 'live_api';
            paymentUrl = `https://gateway.zibal.ir/start/${zbJson.trackId}`;
          } else {
            gatewayError = zbJson?.message || JSON.stringify(zbJson);
          }
        } catch (err) {
          gatewayError = err instanceof Error ? err.message : String(err);
        }
      }

      const refId = `SHAPARAK-${crypto.randomInt(10000000, 99999999)}`;

      if (gatewayError) {
        void sendSuperAdminBaleAlert({
          category: 'order_failed',
          title: `خطا در شروع پرداخت درگاه ${gwConfig?.title || gatewayId}`,
          lines: [
            `مبلغ: ${cleanAmount.toLocaleString('fa-IR')} تومان`,
            `خریدار: ${String(buyerPhone || '-')}`,
            `سفارش: ${String(orderId || txId)}`,
            `علت خطا: ${String(gatewayError).slice(0, 220)}`,
          ],
          dedupKey: `pay_req_err:${gatewayId}:${String(orderId || txId)}`,
          cooldownMs: 60_000,
        });
      }

      await writeSystemLog({
        level: gatewayError ? 'warning' : 'success',
        category: 'payment',
        title: `درخواست پرداخت درگاه ${gwConfig?.title || gatewayId}`,
        detail: gatewayError
          ? `خطا در پاسخ زنده درگاه (${gatewayError}) · بازگشت به حالت شبیه‌ساز`
          : `مبلغ ${cleanAmount.toLocaleString('fa-IR')} تومان · وضعیت: ${gatewayMode} · کد پیگیری: ${refId}`,
        sqlOrEndpoint: `POST /api/payment/request (${gatewayId})`,
        payload: {
          txId,
          gatewayId,
          amountTomans: cleanAmount,
          callbackUrl,
          authority,
          refId,
          gatewayMode,
          paymentUrl,
          gatewayError,
        },
      });

      res.json({
        success: true,
        transactionId: txId,
        gatewayId,
        authority,
        refId,
        referenceId: refId,
        gatewayMode,
        paymentUrl,
        callbackUrl,
        gatewayError,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در اتصال به سوئیچ درگاه پرداخت',
      });
    }
  });

  router.post('/api/payment/verify', async (req, res) => {
    try {
      let {
        gatewayId = '',
        authority = '',
        paymentStatus = '',
        amountTomans = 0,
        orderId = '',
        phone = '',
        skillIds = [],
        buyerName = '',
      } = req.body || {};

      const cleanAuthority = String(authority || '').trim();
      if (cleanAuthority && (!orderId || !amountTomans || !gatewayId)) {
        const pendingRows = await dbQuery<{
          id: string;
          buyer_phone: string;
          buyer_name: string;
          total_amount: number;
          payment_method: string;
        }>(
          'SELECT id, buyer_phone, buyer_name, total_amount, payment_method FROM orders WHERE gateway_ref = $1 ORDER BY created_at DESC LIMIT 1',
          [cleanAuthority]
        );
        if (pendingRows[0]) {
          orderId = orderId || pendingRows[0].id;
          phone = phone || pendingRows[0].buyer_phone;
          buyerName = buyerName || pendingRows[0].buyer_name;
          amountTomans = Number(amountTomans || pendingRows[0].total_amount || 0);
          gatewayId = gatewayId || pendingRows[0].payment_method || 'novinopay';
        }
      }
      gatewayId = gatewayId || 'novinopay';

      const statusNorm = String(paymentStatus || '').toUpperCase();
      if (statusNorm && statusNorm !== 'OK' && statusNorm !== '1' && statusNorm !== 'SUCCESS') {
        await writeSystemLog({
          level: 'warning',
          category: 'payment',
          title: `پرداخت لغو یا ناموفق در بازگشت از درگاه (${gatewayId})`,
          detail: `Authority=${cleanAuthority} · Status=${paymentStatus}`,
          sqlOrEndpoint: 'POST /api/payment/verify',
        });
        res.status(400).json({
          ok: false,
          error: 'تراکنش توسط کاربر لغو شد یا با خطای بانکی مواجه گردید.',
        });
        return;
      }

      const allGateways = await getAllPaymentGateways();
      const gwConfig = allGateways.find((g) => g.id === gatewayId);
      const amountRials = Math.max(10000, Math.round(Number(amountTomans || 0) * 10));
      let verified = false;
      let refId = `VER-${crypto.randomInt(10000000, 99999999)}`;
      let rawResponse: unknown = {};

      if (gatewayId === 'novinopay') {
        const merchantId =
          gwConfig?.sandboxMode || !gwConfig?.merchantId ? 'test' : gwConfig.merchantId.trim();
        const nvVerifyResp = await fetch('https://api.novinopay.com/payment/ipg/v2/verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            merchant_id: merchantId,
            amount: amountRials,
            authority: cleanAuthority,
          }),
        });
        const nvJson = (await nvVerifyResp.json().catch(() => ({}))) as {
          status?: string | number;
          data?: { ref_id?: string; trans_id?: string | number };
        };
        rawResponse = nvJson;
        verified = String(nvJson?.status) === '100' || String(nvJson?.status) === '101';
        if (nvJson?.data?.ref_id || nvJson?.data?.trans_id) {
          refId = String(nvJson.data.ref_id || nvJson.data.trans_id);
        }
      } else if (gatewayId === 'zarinpal_online' && gwConfig?.merchantId) {
        const verifyEndpoint = gwConfig.sandboxMode
          ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
          : 'https://api.zarinpal.com/pg/v4/payment/verify.json';
        const zpVerifyResp = await fetch(verifyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_id: gwConfig.merchantId,
            amount: amountRials,
            authority: cleanAuthority,
          }),
        });
        const zpJson = (await zpVerifyResp.json().catch(() => ({}))) as {
          data?: { code?: number; ref_id?: number };
        };
        rawResponse = zpJson;
        verified = zpJson?.data?.code === 100 || zpJson?.data?.code === 101;
        if (zpJson?.data?.ref_id) {
          refId = String(zpJson.data.ref_id);
        }
      } else if (gatewayId === 'zibal_direct' && gwConfig?.merchantId) {
        const trackId = cleanAuthority.replace(/^ZIBAL-/i, '');
        const zbVerifyResp = await fetch('https://gateway.zibal.ir/v1/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant: gwConfig.merchantId,
            trackId: Number(trackId) || trackId,
          }),
        });
        const zbJson = (await zbVerifyResp.json().catch(() => ({}))) as {
          result?: number;
          refNumber?: number;
        };
        rawResponse = zbJson;
        verified = zbJson?.result === 100 || zbJson?.result === 201;
        if (zbJson?.refNumber) {
          refId = String(zbJson.refNumber);
        }
      }

      if (!verified) {
        await writeSystemLog({
          level: 'error',
          category: 'payment',
          title: `خطای تایید (Verify) تراکنش درگاه ${gatewayId}`,
          detail: `Authority=${cleanAuthority}`,
          sqlOrEndpoint: `POST /api/payment/verify (${gatewayId})`,
          payload: rawResponse,
        });
        void sendSuperAdminBaleAlert({
          category: 'order_failed',
          title: `تایید پرداخت ناموفق بود (${gatewayId})`,
          lines: [
            `سفارش: ${String(orderId || '-')}`,
            `خریدار: ${String(buyerName || '-')} (${String(phone || '-')})`,
            `مبلغ: ${Number(amountTomans || 0).toLocaleString('fa-IR')} تومان`,
            `Authority: ${cleanAuthority}`,
          ],
          dedupKey: `pay_verify_fail:${cleanAuthority}`,
          cooldownMs: 60_000,
        });
        res.status(400).json({
          ok: false,
          error: 'تایید نهایی تراکنش توسط سرور درگاه بانکی تایید نشد.',
          gatewayResponse: rawResponse,
        });
        return;
      }

      if (orderId) {
        await dbExec(`UPDATE orders SET status = 'paid', gateway_ref = $1 WHERE id = $2`, [
          refId,
          String(orderId),
        ]);
      }

      const cleanPhone = normalizeIranPhone(String(phone || ''));
      if (/^09\d{9}$/.test(cleanPhone) && Array.isArray(skillIds) && skillIds.length > 0) {
        await addClaimedSkillsToUser(cleanPhone, skillIds.map(String));
        await dispatchEventSms({
          eventKey: 'payment_success',
          phone: cleanPhone,
          variables: {
            name: String(buyerName || 'کاربر گرامی'),
            tracking_code: String(orderId || refId).slice(-6),
            ref_id: refId,
            amount: Number(amountTomans || 0).toLocaleString('fa-IR'),
          },
        });
      }

      await writeSystemLog({
        level: 'success',
        category: 'payment',
        title: `تایید قطعی پرداخت ${gatewayId} (Ref: ${refId})`,
        detail: `Authority=${cleanAuthority} · Order=${orderId || '—'}`,
        sqlOrEndpoint: `POST /api/payment/verify (${gatewayId})`,
        payload: rawResponse,
      });

      void sendSuperAdminBaleAlert({
        category: 'order_paid',
        title: `تایید موفق پرداخت درگاه ${gatewayId}`,
        lines: [
          `شماره مرجع: ${refId}`,
          `سفارش: ${String(orderId || '-')}`,
          `خریدار: ${String(buyerName || '-')} (${cleanPhone || '-'})`,
          `مبلغ: ${Number(amountTomans || 0).toLocaleString('fa-IR')} تومان`,
        ],
      });

      res.json({
        ok: true,
        verified: true,
        refId,
        authority: cleanAuthority,
        orderId,
        gatewayResponse: rawResponse,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'خطا در تایید تراکنش بانکی',
      });
    }
  });

  return router;
}
