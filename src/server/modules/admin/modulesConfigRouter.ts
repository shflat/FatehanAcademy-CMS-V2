import express from 'express';
import type { SiteModuleRegistryItem } from '../../../core/types.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import { getSetting, setSetting, writeSystemLog } from '../../database/index.js';

export const DEFAULT_SITE_MODULES_REGISTRY: SiteModuleRegistryItem[] = [
  {
    id: 'mod_subscriptions',
    titleFa: 'ماژول خرید اشتراک VIP (۱، ۳، ۶ و ۱۲ ماهه)',
    description: 'تعریف پلن‌های اشتراک ماهانه تا سالانه با باز شدن خودکار اسکیل‌ها و آپدیت‌های جدید.',
    category: 'ecommerce',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_subscriptions',
    dependencies: ['mod_payment_hub'],
  },
  {
    id: 'mod_smart_crm',
    titleFa: 'ماژول CRM هوشمند و پیشنهاد خودکار',
    description: 'تحلیل سابقه خرید کاربران و ارسال خودکار پیشنهاد هنگام آپدیت یا انتشار محصول جدید.',
    category: 'marketing',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_smart_crm',
    dependencies: ['mod_sms_hub'],
  },
  {
    id: 'mod_live_chat',
    titleFa: 'ماژول گفتگوی زنده آنلاین و صندوق پیام',
    description: 'ویجت چت بومی ویترین با همگام‌سازی لحظه‌ای و صندوق پاسخ‌گویی اپراتورها.',
    category: 'communication',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'messages_tickets',
    dependencies: [],
  },
  {
    id: 'mod_payment_hub',
    titleFa: 'ماژول هاب درگاه‌های پرداخت نقدی و اقساطی (۱۶ درگاه)',
    description: 'درگاه‌های شاپرک، پرداخت‌یار، کیف پول و درگاه‌های اقساطی BNPL.',
    category: 'ecommerce',
    enabled: true,
    hasTools: false,
    hasSettings: true,
    targetSection: 'settings_hub:gateways',
    dependencies: [],
  },
  {
    id: 'mod_sms_hub',
    titleFa: 'ماژول هاب پیامک ۱۲ اپراتور ایرانی و OTP',
    description: 'انتخاب و تنظیم ۱۲ پنل پیامکی ایرانی با ثبت خودکار وضعیت در لاگ یکپارچه.',
    category: 'communication',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'settings_hub:sms',
    dependencies: ['mod_delivery_logs'],
  },
  {
    id: 'mod_delivery_logs',
    titleFa: 'لاگ یکپارچه ارسال‌ها (SMS / Push / Bot / Webhook)',
    description: 'ثبت و پایش دقیق وضعیت و خطای تمامی پیامک‌ها، اعلان‌های وب‌پوش، ربات‌ها و وب‌هوک‌ها.',
    category: 'communication',
    enabled: true,
    hasTools: true,
    hasSettings: false,
    targetSection: 'mod_delivery_logs',
    dependencies: [],
  },
  {
    id: 'mod_inventory_accounting',
    titleFa: 'ماژول انبارداری لحظه‌ای و دفتر کل حسابداری',
    description: 'قفل رزرو موجودی سبد خرید، محاسبه مالیات، سود خالص و دفتر کل مالی.',
    category: 'ecommerce',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'inventory',
    dependencies: [],
  },
  {
    id: 'mod_forms',
    titleFa: 'ماژول فرم‌ساز چندمرحله‌ای و ابزارهای فروشگاهی',
    description: 'فرم‌ساز پیشرفته با فیلدهای بومی و فید زنده ترب و ایمالز.',
    category: 'marketing',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'forms_manager',
    dependencies: [],
  },
  {
    id: 'mod_booking',
    titleFa: 'ماژول رزرواسیون و تقویم نوبت‌دهی شمسی',
    description: 'مدیریت سرویس‌های مشاوره و نوبت‌دهی آنلاین با تقویم جلالی.',
    category: 'operations',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'booking',
    dependencies: ['mod_sms_hub'],
  },
  {
    id: 'mod_analytics_gsc',
    titleFa: 'آنالیتیکس بومی GA4 + Core Web Vitals و سرچ کنسول',
    description: 'گزارش زنده بازدیدها، LCP/CLS/INP/TTFB، فروش ۳۱ استان و Google Search Console.',
    category: 'seo',
    enabled: true,
    hasTools: true,
    hasSettings: false,
    targetSection: 'dashboard',
    dependencies: [],
  },
  {
    id: 'mod_seo_redirects',
    titleFa: 'ماژول ریدایرکت ۳۰۱، نقشه سایت و واردکننده هوشمند',
    description: 'مدیریت ریدایرکت‌های 301/302، مانیتور 404، robots.txt/llms.txt و Sitemap پویا.',
    category: 'seo',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'seo_center',
    dependencies: [],
  },
  {
    id: 'mod_auto_backup',
    titleFa: 'پشتیبان‌گیری کامل Core + mod_* و پاک‌سازها',
    description: 'بکاپ کامل تمامی جداول، پاک‌سازی انتخابی دمو و اسکنر فایل‌های رسانه بلااستفاده.',
    category: 'operations',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'settings_hub:backup',
    dependencies: [],
  },
  {
    id: 'mod_academy_suite',
    titleFa: 'ماژول جامع آکادمی و آموزش',
    description: 'دپارتمان‌ها، دوره‌های رسمی، کارگاه رایگان، بانک ایده‌ها، محاسبه‌گر شهریه و نقشه راه سنی.',
    category: 'academy',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_academy_suite',
    dependencies: [],
  },
  // Phase 10 Modular Plugins
  {
    id: 'mod_notifications_pwa',
    titleFa: 'اپلیکیشن وب PWA و اعلان‌های وب‌پوش (VAPID)',
    description: 'تولید کلیدهای VAPID رمزنگاری‌شده، بنر نصب PWA اندروید/iOS و ارسال پوش به مرورگرها.',
    category: 'plugins',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_notifications_pwa',
    dependencies: ['mod_delivery_logs'],
  },
  {
    id: 'mod_announcements_popups',
    titleFa: 'اطلاعیه‌های هدر و پاپ‌آپ‌های هوشمند',
    description: 'ساخت نوار اعلان بالای سایت و پاپ‌آپ‌های مودال زمان‌دار تبلیغاتی.',
    category: 'plugins',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_announcements_popups',
    dependencies: [],
  },
  {
    id: 'mod_reviews_qa',
    titleFa: 'دیدگاه‌ها، امتیازدهی ستاره‌ای و پرسش و پاسخ',
    description: 'ثبت نظر خریداران تاییدشده با کپچای آفلاین بومی، امتیازدهی و پاسخ کارشناس.',
    category: 'plugins',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_reviews_qa',
    dependencies: [],
  },
  {
    id: 'mod_abandoned_cart',
    titleFa: 'بازیابی سبد خرید رهاشده (Abandoned Cart)',
    description: 'رصد سبدهای خرید ناتمام و ارسال پیامک/اعلان همراه با کد تخفیف بازگشت.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_abandoned_cart',
    dependencies: ['mod_sms_hub', 'mod_delivery_logs'],
  },
  {
    id: 'mod_wallet_rma',
    titleFa: 'کیف پول، کش‌بک و مدیریت مرجوعی (RMA)',
    description: 'شارژ و کسر اعتبار کیف پول مشتری، هدیه کش‌بک و تایید درخواست‌های مرجوعی.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_wallet_rma',
    dependencies: ['mod_payment_hub'],
  },
  {
    id: 'mod_affiliate',
    titleFa: 'سیستم همکاری در فروش (Affiliate)',
    description: 'تعریف همکاران فروش، لینک اختصاصی (?ref=CODE)، شمارش کلیک و تسویه پورسانت.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_affiliate',
    dependencies: [],
  },
  {
    id: 'mod_b2b_compare',
    titleFa: 'فروش عمده سازمانی B2B و مقایسه محصولات',
    description: 'پلکان قیمت‌گذاری تیراژ، استعلام پیش‌فاکتور شرکتی و موتور مقایسه محصولات.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_b2b_compare',
    dependencies: [],
  },
  {
    id: 'mod_bots_webhooks',
    titleFa: 'ربات‌های بله/ایتا/تلگرام و وب‌هوک‌ها (HMAC)',
    description: 'اتصال پیام‌رسان‌ها با توکن رمزنگاری‌شده AES-256-GCM و ارسال وب‌هوک امضاشده.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_bots_webhooks',
    dependencies: ['mod_delivery_logs'],
  },
  {
    id: 'mod_maintenance_audit',
    titleFa: 'حالت تعمیرات و گزارش ممیزی (Audit Trail)',
    description: 'بستن موقت ویترین با بای‌پس مدیران و ثبت تاریخچه اقدامات حساس در دیتابیس.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_maintenance_audit',
    dependencies: [],
  },
  {
    id: 'mod_i18n',
    titleFa: 'موتور چندزبانه RTL/LTR (فارسی، انگلیسی، عربی)',
    description: 'مدیریت دیکشنری چندزبانه با تغییر خودکار جهت چیدمان RTL و LTR.',
    category: 'plugins',
    enabled: false,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_i18n',
    dependencies: [],
  },
  // Phase 11 Unified AI Hub & 24/7 Autonomous Agent (v2.7.0)
  {
    id: 'mod_ai_hub_agent',
    titleFa: 'هاب یکپارچه هوش مصنوعی (۳ اسلات) و ایجنت خودکار ۲۴/۷',
    description:
      'مدیریت یکپارچه ۳ موتور (متن/سئو، تصویر، ایجنت ۲۴/۷) با رمزنگاری AES-256-GCM، حافظه SKILL.md، صف تایید ۱-کلیکی و تکمیل خودکار پروفایل چت.',
    category: 'plugins',
    enabled: true,
    hasTools: true,
    hasSettings: true,
    targetSection: 'mod_ai_hub_agent',
    dependencies: ['mod_live_chat', 'mod_delivery_logs'],
  },
];

export function createModulesConfigRouter(): express.Router {
  const router = express.Router();

  router.get('/api/v1/modules/registry', async (_req, res) => {
    try {
      const saved = await getSetting<SiteModuleRegistryItem[]>(
        'site_modules_registry',
        DEFAULT_SITE_MODULES_REGISTRY
      );
      const savedMap = new Map(saved.map((m) => [m.id, m]));
      const merged = DEFAULT_SITE_MODULES_REGISTRY.map((def) => {
        const existing = savedMap.get(def.id);
        return existing ? { ...def, enabled: Boolean(existing.enabled) } : def;
      });
      res.json({ ok: true, modules: merged });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در خواندن رجیستری ماژول‌ها' });
    }
  });

  router.post(
    '/api/v1/modules/registry',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const incoming = Array.isArray(req.body?.modules) ? req.body.modules : [];
        const incomingMap = new Map<string, boolean>();
        for (const item of incoming) {
          if (item && typeof item.id === 'string') {
            incomingMap.set(item.id, Boolean(item.enabled));
          }
        }
        const nextList = DEFAULT_SITE_MODULES_REGISTRY.map((def) => ({
          ...def,
          enabled: incomingMap.has(def.id) ? Boolean(incomingMap.get(def.id)) : def.enabled,
        }));
        await setSetting('site_modules_registry', nextList);
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: 'به‌روزرسانی وضعیت ماژول‌های فعال سایت',
          detail: `تعداد ماژول‌های روشن: ${nextList.filter((m) => m.enabled).length} از ${nextList.length}`,
          sqlOrEndpoint: 'POST /api/v1/modules/registry',
        });
        res.json({ ok: true, modules: nextList });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره وضعیت ماژول‌ها' });
      }
    }
  );

  return router;
}
