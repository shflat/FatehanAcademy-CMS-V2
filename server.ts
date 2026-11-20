import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __earlyFilename = fileURLToPath(import.meta.url);
const __earlyDirname = path.dirname(__earlyFilename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__earlyDirname, '.env') });
import { resolveServerPort } from './src/server/core/cryptoSecurity.js';
import { closeDatabaseCleanly, getActiveEngine, initDatabase } from './src/server/database/index.js';
import { createAdminDbBackupRouter } from './src/server/modules/admin/adminDbBackupRouter.js';
import { createAdminGatewaysSmsRouter } from './src/server/modules/admin/adminGatewaysSmsRouter.js';
import { createAdminUsersLogsRouter } from './src/server/modules/admin/adminUsersLogsRouter.js';
import { createAiSeoRouter } from './src/server/modules/ai/aiSeoRouter.js';
import { createAuthRouter } from './src/server/modules/auth/authRouter.js';
import { createTaxonomiesPaginationRouter } from './src/server/modules/catalog/taxonomiesPaginationRouter.js';
import { createPagesMenusComposerRouter } from './src/server/modules/cms/pagesMenusComposerRouter.js';
import {
  createMediaEngineRouter,
  migrateDatabaseBase64ToPhysicalWebp,
} from './src/server/modules/media/mediaEngineRouter.js';
import { createOrdersRouter } from './src/server/modules/orders/ordersRouter.js';
import { createStorefrontRouter } from './src/server/modules/storefront/storefrontRouter.js';
import { createModPaymentHubRouter } from './modules/mod_payment_hub/paymentHubRouter.js';
import { createModInventoryAccountingRouter } from './modules/mod_inventory_accounting/inventoryAccountingRouter.js';
import { createModFormsRouter } from './modules/mod_forms/formsEngineRouter.js';
import { createModEcommerceSuiteRouter } from './modules/mod_ecommerce_suite/ecommerceSuiteRouter.js';
import { createModLiveChatRouter } from './modules/mod_live_chat/liveChatRouter.js';
import { createModAnalyticsGscRouter } from './modules/mod_analytics_gsc/analyticsGscRouter.js';
import { createModAiDigikalaRouter } from './modules/mod_ai_digikala/aiDigikalaRouter.js';
import { createModSeoRedirectsRouter } from './modules/mod_seo_redirects/seoRedirectsRouter.js';
import { createModBookingRouter } from './modules/mod_booking/solarBookingRouter.js';
import { createModAutoBackupRouter } from './modules/mod_auto_backup/autoBackupRouter.js';
import { createModSmartCrmRouter } from './modules/mod_smart_crm/smartCrmRouter.js';
import { createModSubscriptionsRouter } from './modules/mod_subscriptions/subscriptionsRouter.js';
import { createModAcademySuiteRouter } from './modules/mod_academy_suite/academySuiteRouter.js';
import { createProtectedDownloadsRouter } from './src/server/modules/downloads/downloadsRouter.js';
import { createModulesConfigRouter } from './src/server/modules/admin/modulesConfigRouter.js';
import { createCaptchaRouter } from './src/server/core/captchaService.js';
import { createRbacMatrixRouter } from './src/server/modules/admin/rbacMatrixRouter.js';
import { createMaintenanceCleanersRouter } from './src/server/modules/admin/maintenanceCleanersRouter.js';
import { createDeliveryLogsRouter } from './modules/mod_delivery_logs/deliveryLogsRouter.js';
import { createNotificationsPwaRouter } from './modules/mod_notifications_pwa/notificationsPwaRouter.js';
import { createAbandonedCartRouter } from './modules/mod_abandoned_cart/abandonedCartRouter.js';
import { createAnnouncementsPopupsRouter } from './modules/mod_announcements_popups/announcementsPopupsRouter.js';
import { createReviewsQaRouter } from './modules/mod_reviews_qa/reviewsQaRouter.js';
import { createWalletRmaRouter } from './modules/mod_wallet_rma/walletRmaRouter.js';
import { createAffiliateRouter } from './modules/mod_affiliate/affiliateRouter.js';
import { createB2bCompareRouter } from './modules/mod_b2b_compare/b2bCompareRouter.js';
import { createBotsWebhooksRouter } from './modules/mod_bots_webhooks/botsWebhooksRouter.js';
import { createMaintenanceAuditRouter } from './modules/mod_maintenance_audit/maintenanceAuditRouter.js';
import { createI18nRouter } from './modules/mod_i18n/i18nRouter.js';
import { createAiHubAgentRouter } from './modules/mod_ai_hub_agent/aiHubRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const dbInit = await initDatabase();
  void migrateDatabaseBase64ToPhysicalWebp().catch(() => {
    // non-blocking startup migration of any legacy Base64 strings
  });

  const app = express();
  const PORT = resolveServerPort();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(self)'
    );
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // Mount WordPress-style modular backend routers
  app.use(createStorefrontRouter());
  app.use(createAuthRouter());
  app.use(createOrdersRouter());
  app.use(createAiSeoRouter());
  app.use(createMediaEngineRouter());
  app.use(createTaxonomiesPaginationRouter());
  app.use(createPagesMenusComposerRouter());
  app.use(createAdminDbBackupRouter());
  app.use(createAdminGatewaysSmsRouter());
  app.use(createAdminUsersLogsRouter(dbInit.error));
  app.use(createModulesConfigRouter());

  // Mount Phase 5 Isolated Enterprise Modules (/modules/mod_*)
  app.use(createModPaymentHubRouter());
  app.use(createModInventoryAccountingRouter());
  app.use(createModFormsRouter());
  app.use(createModEcommerceSuiteRouter());

  // Mount Phase 6 Final Enterprise Modules (/modules/mod_*)
  app.use(createModLiveChatRouter());
  app.use(createModAnalyticsGscRouter());
  app.use(createModAiDigikalaRouter());
  app.use(createModSeoRedirectsRouter());
  app.use(createModBookingRouter());
  app.use(createModAutoBackupRouter());

  // Mount Phase 9 Isolated Enterprise Modules (Smart CRM & VIP Subscriptions)
  app.use(createModSmartCrmRouter());
  app.use(createModSubscriptionsRouter());

  // Mount Phase 12 Final Base CMS Modules (Academy Suite & Protected Digital Downloads)
  app.use(createModAcademySuiteRouter());
  app.use(createProtectedDownloadsRouter());

  // Mount Phase 10 Enterprise Modules (v2.6.0): Captcha, Granular RBAC, Cleaners, Delivery Logs & 10 Plugins
  app.use(createCaptchaRouter());
  app.use(createRbacMatrixRouter());
  app.use(createMaintenanceCleanersRouter());
  app.use(createDeliveryLogsRouter());
  app.use(createNotificationsPwaRouter());
  app.use(createAbandonedCartRouter());
  app.use(createAnnouncementsPopupsRouter());
  app.use(createReviewsQaRouter());
  app.use(createWalletRmaRouter());
  app.use(createAffiliateRouter());
  app.use(createB2bCompareRouter());
  app.use(createBotsWebhooksRouter());
  app.use(createMaintenanceAuditRouter());
  app.use(createI18nRouter());

  // Mount Phase 11 Unified AI Hub, 3-Slot Routing & 24/7 Autonomous Agent (v2.7.0)
  app.use(createAiHubAgentRouter());

  // Physical multi-size WebP & media uploads directory unified for Docker (/app/uploads) & local dev
  const primaryUploadsPath = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const legacyPublicUploadsPath = path.join(__dirname, 'public', 'uploads');
  fs.mkdirSync(primaryUploadsPath, { recursive: true });
  fs.mkdirSync(legacyPublicUploadsPath, { recursive: true });

  // Zero-leak firewall: block any direct web access to private downloadable product files
  app.use('/uploads/_protected_downloads', (_req, res) => {
    res.status(403).json({ error: 'دسترسی مستقیم به فایل‌های محافظت‌شده مسدود است.' });
  });

  app.use(
    '/uploads',
    express.static(primaryUploadsPath, {
      maxAge: '7d',
    })
  );
  if (path.resolve(legacyPublicUploadsPath) !== path.resolve(primaryUploadsPath)) {
    app.use(
      '/uploads',
      express.static(legacyPublicUploadsPath, {
        maxAge: '7d',
      })
    );
  }

  // Internal self-hosted fonts cache control
  app.use(
    '/fonts',
    express.static(path.join(__dirname, 'public', 'fonts'), {
      maxAge: '30d',
      immutable: true,
    })
  );

  // Frontend Vite (Dev) or Static Assets (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    const publicPath = path.join(__dirname, 'public');

    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), { maxAge: '30d', immutable: true })
    );
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.use(express.static(publicPath, { maxAge: '7d' }));

    app.get('*', (req, res) => {
      if (/\.(png|jpe?g|webp|gif|svg|ico|css|js|woff2?)$/i.test(req.path)) {
        res.status(404).end();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Skill 98 server running on http://0.0.0.0:${PORT} (DB Engine: ${getActiveEngine()})`
    );
  });

  server.on('error', (err) => {
    console.error(`[Skill 98] HTTP server error on port ${PORT}:`, err);
    void closeDatabaseCleanly().finally(() => process.exit(1));
  });

  const handleGracefulShutdown = async (signal: string) => {
    console.log(`[Skill 98] Received ${signal}, flushing WAL & closing database cleanly...`);
    try {
      server.close();
    } catch {
      // ignore
    }
    await closeDatabaseCleanly();
    process.exit(0);
  };

  process.once('SIGINT', () => void handleGracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => void handleGracefulShutdown('SIGTERM'));
}

startServer();
