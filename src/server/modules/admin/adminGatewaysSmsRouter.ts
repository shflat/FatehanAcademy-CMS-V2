import express from 'express';
import type {
  PaymentDisplayConfig,
  PaymentGatewayOption,
  SmsGatewaySettings,
  SmsTriggerRule,
} from '../../../core/types.js';
import {
  DEFAULT_PAYMENT_DISPLAY_CONFIG,
  DEFAULT_SMS_GATEWAY_SETTINGS,
} from '../../../data/defaults.js';
import { normalizeIranPhone } from '../../core/cryptoSecurity.js';
import { requireAuth, requirePermission } from '../../core/permissionsEngine.js';
import {
  dispatchEventSms,
  getAllPaymentGateways,
  getAllSmsTriggers,
  getSetting,
  saveAllPaymentGateways,
  saveAllSmsTriggers,
  setSetting,
  writeSystemLog,
} from '../../database/index.js';

const IRANKISH_PHP_ROUTER_TEMPLATE = `<?php
/**
 * Skill 98 — IranKish IP Whitelist Router
 * Place this file on your Iranian cPanel/DirectAdmin host (e.g., public_html/skill98-ipg-router.php)
 */
header('Content-Type: application/json; charset=utf-8');
$raw = file_get_contents('php://input');
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'ok' => true,
        'service' => 'skill98-ipg-router',
        'server_ip' => $_SERVER['SERVER_ADDR'] ?? gethostbyname(gethostname()),
        'timestamp' => date('c')
    ]);
    exit;
}
$payload = json_decode($raw, true);
if (!is_array($payload) || empty($payload['targetUrl'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid router payload']);
    exit;
}
$ch = curl_init($payload['targetUrl']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload['body'] ?? []));
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
http_response_code($httpCode ?: 200);
echo $res ?: json_encode(['ok' => false]);
`;

export function createAdminGatewaysSmsRouter(): express.Router {
  const router = express.Router();

  router.get(
    '/api/admin/sms/config',
    requireAuth,
    requirePermission('canManageGateways'),
    async (_req, res) => {
      try {
        const settings = await getSetting<SmsGatewaySettings>(
          'sms_gateway_config',
          DEFAULT_SMS_GATEWAY_SETTINGS
        );
        const triggers = await getAllSmsTriggers();
        res.json({ settings, triggers });
      } catch {
        res.status(500).json({ error: 'خطا در دریافت تنظیمات پیامک' });
      }
    }
  );

  router.post(
    '/api/admin/sms/config',
    requireAuth,
    requirePermission('canManageGateways'),
    async (req, res) => {
      try {
        const { settings, triggers } = req.body as {
          settings?: SmsGatewaySettings;
          triggers?: SmsTriggerRule[];
        };
        if (settings) {
          await setSetting('sms_gateway_config', settings);
        }
        if (Array.isArray(triggers)) {
          await saveAllSmsTriggers(triggers);
        }
        await writeSystemLog({
          level: 'success',
          category: 'sms',
          title: 'به‌روزرسانی تنظیمات وب‌سرویس پیامک و شرط‌های اولویت‌دار',
          detail: `اپراتور: ${settings?.provider || 'melipayamak'} · تعداد شرط‌ها: ${triggers?.length ?? 0}`,
          sqlOrEndpoint: 'POST /api/admin/sms/config',
        });
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در ذخیره تنظیمات پیامک' });
      }
    }
  );

  router.post(
    '/api/admin/sms/test',
    requireAuth,
    requirePermission('canManageGateways'),
    async (req, res) => {
      try {
        const providerOverride = req.body?.providerOverride
          ? (String(req.body.providerOverride) as SmsGatewaySettings['provider'])
          : undefined;
        const baleChatIdOverride = req.body?.baleChatId
          ? String(req.body.baleChatId).trim()
          : undefined;
        const rawPhone = String(req.body?.phone || '').trim();
        const cleanPhone = rawPhone ? normalizeIranPhone(rawPhone) : '';

        const isBaleTest = providerOverride === 'bale';
        const isEitaaTest = providerOverride === 'eitaa';
        if (!isBaleTest && !isEitaaTest && !/^09\d{9}$/.test(cleanPhone)) {
          res.status(400).json({ error: 'شماره موبایل گیرنده معتبر نیست (مثلاً 09123456789).' });
          return;
        }
        if (isBaleTest && !cleanPhone && !baleChatIdOverride && !req.body?.credentialsOverride?.baleChatId) {
          res.status(400).json({
            error: 'برای تست پیام‌رسان بله، شماره موبایل (برای سفیر OTP) یا شناسه چت (chat_id برای ربات) را وارد کنید.',
          });
          return;
        }
        if (isEitaaTest && !baleChatIdOverride && !req.body?.credentialsOverride?.eitaaChatId) {
          res.status(400).json({
            error: 'برای تست پیام‌رسان ایتا (ایتایار)، وارد کردن شناسه کانال یا گروه (chat_id) الزامی است.',
          });
          return;
        }
        if (cleanPhone && !/^09\d{9}$/.test(cleanPhone)) {
          res.status(400).json({ error: 'فرمت شماره موبایل واردشده معتبر نیست.' });
          return;
        }

        const eventKey = req.body?.eventKey || undefined;
        const customMessage = req.body?.customMessage
          ? String(req.body.customMessage)
          : undefined;
        const patternCode = req.body?.patternCode ? String(req.body.patternCode) : undefined;
        const testOtpCode = req.body?.testCode ? String(req.body.testCode).trim() : '54321';
        const credentialsOverride =
          req.body?.credentialsOverride && typeof req.body.credentialsOverride === 'object'
            ? req.body.credentialsOverride
            : undefined;
        const baleTestChannel =
          req.body?.baleTestChannel === 'bot_api' || req.body?.baleTestChannel === 'safir_otp'
            ? (req.body.baleTestChannel as 'bot_api' | 'safir_otp')
            : undefined;

        const result = await dispatchEventSms({
          eventKey,
          phone: cleanPhone,
          variables: {
            name: 'مدیر سیستم',
            tracking_code: 'TEST-9841',
            amount: '۴۵۰,۰۰۰',
            ref_id: 'REF-882910',
            skill_title: 'اسکیل تست سامانه',
            status: 'تکمیل شده',
            code: testOtpCode,
          },
          customMessageOverride: customMessage,
          patternCodeOverride: patternCode,
          providerOverride,
          credentialsOverride,
          baleChatIdOverride,
          baleTestChannel,
        });

        if (!result.dispatched) {
          res.status(502).json({
            ok: false,
            error: result.errorMessage || 'خطا در ارسال پیام از طریق وب‌سرویس',
            ...result,
          });
          return;
        }

        res.json({ ok: true, ...result });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ارسال پیام تست',
        });
      }
    }
  );

  router.get(
    '/api/admin/payment/config',
    requireAuth,
    requirePermission('canManageGateways'),
    async (_req, res) => {
      try {
        const gateways = await getAllPaymentGateways();
        const displayConfig = await getSetting<PaymentDisplayConfig>(
          'payment_display_config',
          DEFAULT_PAYMENT_DISPLAY_CONFIG
        );
        res.json({ gateways, displayConfig });
      } catch {
        res.status(500).json({ error: 'خطا در دریافت تنظیمات درگاه پرداخت' });
      }
    }
  );

  router.post(
    '/api/admin/payment/config',
    requireAuth,
    requirePermission('canManageGateways'),
    async (req, res) => {
      try {
        const { gateways, displayConfig } = req.body as {
          gateways: PaymentGatewayOption[];
          displayConfig: PaymentDisplayConfig;
        };
        await saveAllPaymentGateways(gateways || [], displayConfig);
        await writeSystemLog({
          level: 'success',
          category: 'payment',
          title: 'ذخیره تنظیمات درگاه‌های پرداخت و نحوه نمایش به مشتری',
          detail: `درگاه پیش‌فرض: ${displayConfig?.defaultGatewayId} · حالت نمایش: ${displayConfig?.displayMode}`,
          sqlOrEndpoint: 'POST /api/admin/payment/config',
        });
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در ذخیره تنظیمات درگاه‌ها' });
      }
    }
  );

  router.post(
    '/api/admin/payment/test-router',
    requireAuth,
    requirePermission('canManageGateways'),
    async (req, res) => {
      try {
        const url = String(req.body?.url || '').trim();
        if (!url || !/^https?:\/\//i.test(url)) {
          res.status(400).json({ error: 'آدرس روتر باید با https:// یا http:// شروع شود.' });
          return;
        }
        const resp = await fetch(url, { method: 'GET' });
        const text = await resp.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          // keep text
        }
        await writeSystemLog({
          level: resp.ok ? 'success' : 'warning',
          category: 'payment',
          title: `تست اتصال روتر هاست اصلی (${url})`,
          detail: `وضعیت پاسخ سرور: HTTP ${resp.status}`,
          sqlOrEndpoint: `GET ${url}`,
          payload: parsed,
        });
        res.json({ ok: resp.ok, status: resp.status, response: parsed });
      } catch (error) {
        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : 'خطا در برقراری ارتباط با فایل روتر هاست اصلی',
        });
      }
    }
  );

  router.get(
    '/api/admin/payment/router-php',
    requireAuth,
    requirePermission('canManageGateways'),
    (req, res) => {
      if (String(req.query.download || '') === '1') {
        res.setHeader('Content-Disposition', 'attachment; filename="skill98-ipg-router.php"');
        res.setHeader('Content-Type', 'application/x-httpd-php; charset=utf-8');
        res.send(IRANKISH_PHP_ROUTER_TEMPLATE);
        return;
      }
      res.json({ code: IRANKISH_PHP_ROUTER_TEMPLATE, filename: 'skill98-ipg-router.php' });
    }
  );

  return router;
}
