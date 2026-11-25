import fs from 'fs';
import path from 'path';
import type { CmsRoleDefinition, PaymentDisplayConfig } from '../../core/types.js';
import {
  DEFAULT_AI_ENGINE_CONFIG,
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  DEFAULT_OTP_SECURITY_CONFIG,
  DEFAULT_PAYMENT_DISPLAY_CONFIG,
  DEFAULT_SMS_GATEWAY_SETTINGS,
  DEFAULT_THEME_CONFIG,
  INITIAL_CMS_ROLES,
  INITIAL_CMS_SESSIONS,
  INITIAL_COUPONS,
  INITIAL_MEDIA_LIBRARY,
  INITIAL_PAYMENT_GATEWAYS,
  INITIAL_SMS_TRIGGER_RULES,
} from '../../data/defaults.js';
import { INITIAL_ARTICLES, INITIAL_SKILL98_CATALOG } from '../../data/initialCatalog.js';
import { getEnvConfig } from '../core/envConfig.js';
import { syncPermissionsToDbAndFile } from '../core/permissionsEngine.js';
import {
  BACKUP_DIR,
  TABLE_METADATA,
  connectStorageEngine,
  dbExec,
  dbQuery,
  getActiveEngine,
  getSchedulerHandle,
  setSchedulerHandle,
  type SqlEngineKind,
} from './connection.js';
import { restoreBackupFromContent, runScheduledBackupTick } from './backupService.js';
import { seedPhase3Tables } from './phase3Seeds.js';
import { createAndSeedPhase5ModulesSchema } from './phase5ModulesSchema.js';
import { createAndSeedPhase6ModulesSchema } from './phase6ModulesSchema.js';
import { getSetting, writeSystemLog } from './settingsLogsRepo.js';
import { ensureSmartCrmSchema } from '../../../modules/mod_smart_crm/smartCrmRouter.js';
import { ensureSubscriptionsSchema } from '../../../modules/mod_subscriptions/subscriptionsRouter.js';

async function createSchema(): Promise<void> {
  const activeEngine = getActiveEngine();
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      role_id TEXT NOT NULL DEFAULT 'role_customer',
      status TEXT NOT NULL DEFAULT 'active',
      email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      claimed_skill_ids_json TEXT NOT NULL DEFAULT '[]',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      item_type TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      original_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer_phone TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      coupon_code TEXT,
      items_summary TEXT NOT NULL,
      items_count INTEGER NOT NULL DEFAULT 1,
      payment_method TEXT NOT NULL,
      gateway_ref TEXT,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at_label TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      discount_percent INTEGER NOT NULL,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payment_gateways (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      merchant_id TEXT,
      terminal_id TEXT,
      api_key TEXT,
      pass_phrase TEXT,
      public_key TEXT,
      callback_url TEXT,
      use_host_router INTEGER NOT NULL DEFAULT 0,
      host_router_url TEXT,
      is_shaparak_direct INTEGER NOT NULL DEFAULT 1,
      sandbox_mode INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS sms_triggers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      event_key TEXT NOT NULL,
      section_label TEXT NOT NULL,
      send_mode TEXT NOT NULL DEFAULT 'custom_text',
      pattern_code TEXT,
      message_template TEXT NOT NULL,
      provider_override TEXT DEFAULT 'default',
      enabled INTEGER NOT NULL DEFAULT 1,
      priority_order INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      sql_or_endpoint TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      created_at_fa TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS backup_history (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      format TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_fa TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      user_display TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer',
      role_id TEXT NOT NULL DEFAULT 'role_customer',
      device_label TEXT DEFAULT '',
      ip_masked TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      last_active_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS rbac_permission_hashes (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      role_slug TEXT NOT NULL,
      capability_key TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 0,
      permission_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS taxonomies (
      id TEXT PRIMARY KEY,
      taxonomy_type TEXT NOT NULL DEFAULT 'product_category',
      slug TEXT NOT NULL,
      title_fa TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      icon_name TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      template_type TEXT NOT NULL DEFAULT 'standard',
      summary TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      canonical_url TEXT DEFAULT '',
      og_image TEXT DEFAULT '',
      schema_type TEXT NOT NULL DEFAULT 'WebPage',
      composer_rows_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      location TEXT NOT NULL DEFAULT 'header',
      title_fa TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      target_type TEXT NOT NULL DEFAULT 'page',
      target_value TEXT NOT NULL DEFAULT '',
      badge_text TEXT DEFAULT '',
      open_in_new_tab INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_templates (
      id TEXT PRIMARY KEY,
      template_code TEXT NOT NULL,
      title_fa TEXT NOT NULL,
      invoice_kind TEXT NOT NULL DEFAULT 'official_tax',
      paper_size TEXT NOT NULL DEFAULT 'A4',
      vat_percent INTEGER NOT NULL DEFAULT 10,
      seller_name TEXT NOT NULL DEFAULT '',
      seller_economic_code TEXT DEFAULT '',
      seller_national_id TEXT DEFAULT '',
      seller_postal_code TEXT DEFAULT '',
      seller_phone TEXT DEFAULT '',
      seller_address TEXT DEFAULT '',
      logo_url TEXT DEFAULT '/assets/aistudio/logo_8c26749f.webp',
      stamp_signature_url TEXT DEFAULT '/assets/aistudio/logo_8c26749f.webp',
      footer_note TEXT DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      composer_rows_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    )`,
  ];

  for (const stmt of ddlStatements) {
    await dbExec(stmt);
  }

  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_products_status_cat ON products (status, category, featured)',
    'CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug)',
    'CREATE INDEX IF NOT EXISTS idx_articles_status_cat ON articles (status, category)',
    'CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug)',
    'CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON orders (buyer_phone, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)',
    'CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_phone_status ON auth_sessions (phone, status)',
    'CREATE INDEX IF NOT EXISTS idx_logs_cat_created ON system_logs (category, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_rbac_role_cap ON rbac_permission_hashes (role_id, capability_key)',
    'CREATE INDEX IF NOT EXISTS idx_taxonomies_type_parent ON taxonomies (taxonomy_type, parent_id, slug)',
    'CREATE INDEX IF NOT EXISTS idx_media_cat_updated ON media_items (category, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_pages_slug_status ON pages (slug, status)',
    'CREATE INDEX IF NOT EXISTS idx_menus_loc_parent ON menus (location, parent_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_tpl_kind ON invoice_templates (invoice_kind, is_default)',
  ];
  for (const idxStmt of indexStatements) {
    try {
      await dbExec(idxStmt);
    } catch {
      // ignore if index already exists
    }
  }

  const userAlterCols = [
    { col: 'role_id', def: "TEXT NOT NULL DEFAULT 'role_customer'" },
    { col: 'status', def: "TEXT NOT NULL DEFAULT 'active'" },
    { col: 'email', def: "TEXT DEFAULT ''" },
    { col: 'notes', def: "TEXT DEFAULT ''" },
    { col: 'last_login_at', def: 'TEXT' },
  ];
  for (const { col, def } of userAlterCols) {
    try {
      if (activeEngine === 'postgresql') {
        await dbExec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } else {
        const info = await dbQuery<{ name: string }>('PRAGMA table_info(users)');
        if (!info.some((r) => r.name === col)) {
          await dbExec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
        }
      }
    } catch {
      // Ignore if column exists
    }
  }

  const sessionAlterCols = [
    { col: 'user_display', def: "TEXT DEFAULT ''" },
    { col: 'device_label', def: "TEXT DEFAULT ''" },
    { col: 'ip_masked', def: "TEXT DEFAULT ''" },
    { col: 'status', def: "TEXT NOT NULL DEFAULT 'active'" },
    { col: 'last_active_at', def: 'TEXT' },
  ];
  for (const { col, def } of sessionAlterCols) {
    try {
      if (activeEngine === 'postgresql') {
        await dbExec(`ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } else {
        const info = await dbQuery<{ name: string }>('PRAGMA table_info(auth_sessions)');
        if (!info.some((r) => r.name === col)) {
          await dbExec(`ALTER TABLE auth_sessions ADD COLUMN ${col} ${def}`);
        }
      }
    } catch {
      // Ignore if column exists
    }
  }

  const gatewayAlterCols = [
    { col: 'gateway_kind', def: "TEXT DEFAULT 'cash'" },
    { col: 'installment_months', def: 'INTEGER DEFAULT 0' },
    { col: 'bnpl_fee_percent', def: 'REAL DEFAULT 0' },
    { col: 'cash_discount_percent', def: 'REAL DEFAULT 0' },
  ];
  for (const { col, def } of gatewayAlterCols) {
    try {
      if (activeEngine === 'postgresql') {
        await dbExec(`ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } else {
        const info = await dbQuery<{ name: string }>('PRAGMA table_info(payment_gateways)');
        if (!info.some((r) => r.name === col)) {
          await dbExec(`ALTER TABLE payment_gateways ADD COLUMN ${col} ${def}`);
        }
      }
    } catch {
      // Ignore if column exists
    }
  }

  try {
    if (activeEngine === 'postgresql') {
      await dbExec(`ALTER TABLE sms_triggers ADD COLUMN IF NOT EXISTS provider_override TEXT DEFAULT 'default'`);
    } else {
      const info = await dbQuery<{ name: string }>('PRAGMA table_info(sms_triggers)');
      if (!info.some((r) => r.name === 'provider_override')) {
        await dbExec(`ALTER TABLE sms_triggers ADD COLUMN provider_override TEXT DEFAULT 'default'`);
      }
    }
  } catch {
    // Ignore if column exists
  }
}

async function seedInitialData(): Promise<void> {
  const nowIso = new Date().toISOString();
  const activeEngine = getActiveEngine();
  const envCfg = getEnvConfig();

  // Seed Super Admin ONLY from environment configuration (zero hardcoded credentials in source)
  if (envCfg.adminPhone) {
    await dbExec(
      `INSERT INTO users (phone, full_name, role, role_id, status, email, notes, claimed_skill_ids_json, last_login_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (phone) DO UPDATE SET
         role = 'super_admin',
         role_id = 'role_super_admin',
         status = 'active'`,
      [
        envCfg.adminPhone,
        'مدیر ارشد سیستم',
        'super_admin',
        'role_super_admin',
        'active',
        envCfg.adminEmail || '',
        'حساب مدیر کل و مالک سیستم (پیکربندی‌شده از متغیر محیطی)',
        '[]',
        nowIso,
        nowIso,
        nowIso,
      ]
    );
  }

  // Clean legacy hardcoded callback URLs & fake demo orders
  try {
    await dbExec(
      `UPDATE payment_gateways
       SET callback_url = ''
       WHERE callback_url IN ('https://skill98.dpatech.ir/?payment_verify=1', 'https://skill98.ir/?payment_verify=1')`
    );
    await dbExec(
      `DELETE FROM orders WHERE id = 'ord_981042' OR buyer_phone IN ('guest_preview', 'customer_98')`
    );
  } catch {
    // ignore non-critical migration
  }

  // Idempotently insert any new flagship products from INITIAL_SKILL98_CATALOG without overwriting admin edits
  for (const p of INITIAL_SKILL98_CATALOG) {
    await dbExec(
      `INSERT INTO products (id, slug, title, category, item_type, price, original_price, status, featured, payload_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.slug,
        p.title,
        p.category,
        p.itemType,
        p.price,
        p.originalPrice,
        p.status,
        p.featured ? 1 : 0,
        JSON.stringify(p),
        nowIso,
      ]
    );
  }

  // Idempotently insert new authentic engineering articles & upgrade legacy v1 default articles once
  const upgradedFlag = await getSetting<boolean>('content_v2_editorial_synced', false);
  for (const a of INITIAL_ARTICLES) {
    if (!upgradedFlag) {
      await dbExec(
        `INSERT INTO articles (id, slug, title, category, status, featured, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           featured = EXCLUDED.featured,
           payload_json = EXCLUDED.payload_json,
           updated_at = EXCLUDED.updated_at`,
        [a.id, a.slug, a.title, a.category, a.status, a.featured ? 1 : 0, JSON.stringify(a), nowIso]
      );
    } else {
      await dbExec(
        `INSERT INTO articles (id, slug, title, category, status, featured, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.slug, a.title, a.category, a.status, a.featured ? 1 : 0, JSON.stringify(a), nowIso]
      );
    }
  }
  if (!upgradedFlag) {
    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['content_v2_editorial_synced', 'true', nowIso]
    );
  }

  const couponCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM coupons');
  if (Number(couponCount[0]?.cnt || 0) === 0) {
    for (const c of INITIAL_COUPONS) {
      await dbExec(
        `INSERT INTO coupons (code, discount_percent, description, active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        [c.code, c.discountPercent, c.description, c.active ? 1 : 0]
      );
    }
  }

  const mediaCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM media_items');
  if (Number(mediaCount[0]?.cnt || 0) === 0) {
    for (const m of INITIAL_MEDIA_LIBRARY) {
      await dbExec(
        `INSERT INTO media_items (id, title, url, category, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.title, m.url, m.category || 'article', JSON.stringify(m), nowIso]
      );
    }
  }

  // Idempotently seed all 16 Iranian Cash, BNPL & Wallet gateways so newly added gateways appear automatically
  for (let i = 0; i < INITIAL_PAYMENT_GATEWAYS.length; i++) {
    const gw = INITIAL_PAYMENT_GATEWAYS[i];
    await dbExec(
      `INSERT INTO payment_gateways (
         id, title, subtitle, enabled, merchant_id, terminal_id, api_key, pass_phrase, public_key,
         callback_url, use_host_router, host_router_url, is_shaparak_direct, sandbox_mode, sort_order,
         gateway_kind, installment_months, bnpl_fee_percent, cash_discount_percent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO NOTHING`,
      [
        gw.id,
        gw.title,
        gw.subtitle,
        gw.enabled ? 1 : 0,
        gw.merchantId || '',
        gw.terminalId || '',
        gw.apiKey || '',
        gw.passPhrase || '',
        gw.publicKey || '',
        gw.callbackUrl || '',
        gw.useHostRouter ? 1 : 0,
        gw.hostRouterUrl || '',
        gw.isShaparakDirect ? 1 : 0,
        gw.sandboxMode ? 1 : 0,
        i + 1,
        gw.gatewayKind || 'cash',
        gw.installmentMonths || 0,
        gw.bnplFeePercent || 0,
        gw.cashDiscountPercent || 0,
      ]
    );
  }

  const smsCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM sms_triggers');
  if (Number(smsCount[0]?.cnt || 0) === 0) {
    for (const trg of INITIAL_SMS_TRIGGER_RULES) {
      await dbExec(
        `INSERT INTO sms_triggers (id, title, event_key, section_label, send_mode, pattern_code, message_template, enabled, priority_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          trg.id,
          trg.title,
          trg.eventKey,
          trg.sectionLabel,
          trg.sendMode,
          trg.patternCode,
          trg.messageTemplate,
          trg.enabled ? 1 : 0,
          trg.priorityOrder,
        ]
      );
    }
  }

  const settingDefaults: [string, unknown][] = [
    ['theme_config', DEFAULT_THEME_CONFIG],
    ['ai_config', DEFAULT_AI_ENGINE_CONFIG],
    ['otp_config', DEFAULT_OTP_SECURITY_CONFIG],
    ['roles_config', INITIAL_CMS_ROLES],
    ['sessions_config', INITIAL_CMS_SESSIONS],
    ['payment_display_config', DEFAULT_PAYMENT_DISPLAY_CONFIG],
    ['sms_gateway_config', DEFAULT_SMS_GATEWAY_SETTINGS],
    ['backup_schedule_config', DEFAULT_BACKUP_SCHEDULE_CONFIG],
  ];

  for (const [k, v] of settingDefaults) {
    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [k, JSON.stringify(v), nowIso]
    );
  }

  // One-time idempotent migration: keep ONLY NovinoPay enabled & default; disable all other payment gateways
  const novinoMigrationRows = await dbQuery<{ key: string }>(
    `SELECT key FROM site_settings WHERE key = 'migration_only_novinopay_enabled_v292' LIMIT 1`
  );
  if (novinoMigrationRows.length === 0) {
    await dbExec(
      `UPDATE payment_gateways SET enabled = CASE WHEN id = 'novinopay' THEN 1 ELSE 0 END`
    );
    const currentPayDisplay = await getSetting<PaymentDisplayConfig>(
      'payment_display_config',
      DEFAULT_PAYMENT_DISPLAY_CONFIG
    );
    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      [
        'payment_display_config',
        JSON.stringify({
          ...DEFAULT_PAYMENT_DISPLAY_CONFIG,
          ...currentPayDisplay,
          defaultGatewayId: 'novinopay',
        }),
        nowIso,
      ]
    );
    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['migration_only_novinopay_enabled_v292', JSON.stringify({ appliedAt: nowIso }), nowIso]
    );
  }

  // Synchronize Hashed RBAC Permissions to SQL table AND data/permissions.hash.json
  const roles = await getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES);
  await syncPermissionsToDbAndFile(roles);

  // Seed Dynamic Hierarchical Taxonomies for Fatehan Robotics Academy
  const initialTaxonomies = [
    { id: 'tax_dept_robotics', type: 'product_category', slug: 'دپارتمان رباتیک', titleFa: 'دپارتمان رباتیک', parentId: null, icon: 'Bot', order: 1 },
    { id: 'tax_dept_robotics_sub1', type: 'product_category', slug: 'کیت کامل رباتیک', titleFa: 'کیت کامل رباتیک (مسیریاب، فوتبالیست، حل ماز)', parentId: 'tax_dept_robotics', icon: 'Cpu', order: 2 },
    { id: 'tax_dept_3dp', type: 'product_category', slug: 'دپارتمان پرینترهای سه‌بعدی', titleFa: 'دپارتمان پرینترهای سه‌بعدی', parentId: null, icon: 'Layers', order: 3 },
    { id: 'tax_dept_3dp_sub1', type: 'product_category', slug: 'تجهیزات و فیلامنت چاپ سه‌بعدی', titleFa: 'پرینتر سه‌بعدی، فیلامنت PLA و ابزار کارگاهی', parentId: 'tax_dept_3dp', icon: 'Palette', order: 4 },
    { id: 'tax_dept_electronics', type: 'product_category', slug: 'دپارتمان الکترونیک', titleFa: 'دپارتمان الکترونیک', parentId: null, icon: 'Zap', order: 5 },
    { id: 'tax_dept_electronics_sub1', type: 'product_category', slug: 'بردهای آردوینو و اینترنت اشیاء', titleFa: 'بردهای آردوینو UNO، سنسورها و اینترنت اشیاء ESP32', parentId: 'tax_dept_electronics', icon: 'Terminal', order: 6 },
    { id: 'tax_dept_coding_ai', type: 'product_category', slug: 'دپارتمان برنامه‌نویسی و هوش مصنوعی', titleFa: 'دپارتمان برنامه‌نویسی و هوش مصنوعی', parentId: null, icon: 'Sparkles', order: 7 },
    { id: 'tax_dept_coding_ai_sub1', type: 'product_category', slug: 'کیت هوش مصنوعی و بازی‌سازی', titleFa: 'کیت بینایی ماشین پایتون و کنسول بازی‌سازی', parentId: 'tax_dept_coding_ai', icon: 'Globe', order: 8 },
    { id: 'tax_dept_mechanics', type: 'product_category', slug: 'دپارتمان مکانیک و سازه', titleFa: 'دپارتمان مکانیک و سازه', parentId: null, icon: 'Shield', order: 9 },
    { id: 'tax_dept_mechanics_sub1', type: 'product_category', slug: 'سازه، چرخ‌دنده و بازوی مکانیکی', titleFa: 'پک چرخ‌دنده، انتقال قدرت و بازوهای هیدرولیکی و سروو', parentId: 'tax_dept_mechanics', icon: 'Award', order: 10 },
    { id: 'tax_art_parents', type: 'article_category', slug: 'parenting-talent-guide', titleFa: 'راهنمای والدین و استعدادیابی', parentId: null, icon: 'FileText', order: 1 },
    { id: 'tax_art_robotics', type: 'article_category', slug: 'robotics-mechatronics', titleFa: 'رباتیک و مکاترونیک', parentId: null, icon: 'Bot', order: 2 },
    { id: 'tax_art_coding_ai', type: 'article_category', slug: 'coding-and-ai', titleFa: 'کدنویسی و هوش مصنوعی', parentId: null, icon: 'Sparkles', order: 3 },
    { id: 'tax_art_competitions', type: 'article_category', slug: 'competitions-and-honors', titleFa: 'افتخارات و مسابقات', parentId: null, icon: 'Award', order: 4 },
    { id: 'tax_art_3dp_elec', type: 'article_category', slug: '3d-printing-electronics', titleFa: 'چاپ سه‌بعدی و الکترونیک', parentId: null, icon: 'Layers', order: 5 },
    { id: 'tax_brand_fatehan', type: 'brand', slug: 'fatehan-robotics', titleFa: 'کیت‌های استاندارد آموزشگاه رباتیک فاتحان', parentId: null, icon: 'Crown', order: 1 },
    { id: 'tax_brand_arduino', type: 'brand', slug: 'arduino-esp32', titleFa: 'Arduino & ESP32 Official Modules', parentId: null, icon: 'Cpu', order: 2 },
    { id: 'tax_brand_3dp_eco', type: 'brand', slug: 'fatehan-3d-lab', titleFa: 'واحد ساخت و پرینت سه‌بعدی فاتحان', parentId: null, icon: 'Award', order: 3 },
    { id: 'tax_tag_stem', type: 'tag', slug: 'stem-education', titleFa: 'آموزش عملی و کارگاهی STEM', parentId: null, icon: 'Tag', order: 1 },
    { id: 'tax_tag_tvto', type: 'tag', slug: 'tvto-certificate', titleFa: 'مدرک معتبر فنی و حرفه‌ای و بازار کار', parentId: null, icon: 'Zap', order: 2 },
  ];
  for (const tx of initialTaxonomies) {
    await dbExec(
      `INSERT INTO taxonomies (id, taxonomy_type, slug, title_fa, parent_id, icon_name, image_url, description, sort_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [tx.id, tx.type, tx.slug, tx.titleFa, tx.parentId, tx.icon, '', tx.titleFa, tx.order, nowIso]
    );
  }

  // Seed Phase 3 Dynamic Pages, Hierarchical Menus & Visual Invoice Templates
  await seedPhase3Tables(nowIso);

  // One-time idempotent migration: Full Rebranding from legacy Skill98 to Fatehan Robotics Academy (v3.0.0)
  const fatehanMigrationRows = await dbQuery<{ key: string }>(
    `SELECT key FROM site_settings WHERE key = 'migration_fatehan_full_rebrand_v300' LIMIT 1`
  );
  if (fatehanMigrationRows.length === 0) {
    // 1. Purge legacy Skill98 products (skill-*, pkg-*) and seed Fatehan Robotics Kits
    await dbExec(`DELETE FROM products WHERE id LIKE 'skill-%' OR id LIKE 'pkg-%'`);
    for (const p of INITIAL_SKILL98_CATALOG) {
      await dbExec(
        `INSERT INTO products (id, slug, title, category, item_type, price, original_price, status, featured, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           item_type = EXCLUDED.item_type,
           price = EXCLUDED.price,
           original_price = EXCLUDED.original_price,
           status = EXCLUDED.status,
           featured = EXCLUDED.featured,
           payload_json = EXCLUDED.payload_json,
           updated_at = EXCLUDED.updated_at`,
        [
          p.id,
          p.slug,
          p.title,
          p.category,
          p.itemType,
          p.price,
          p.originalPrice,
          p.status,
          p.featured ? 1 : 0,
          JSON.stringify(p),
          nowIso,
        ]
      );
    }

    // 2. Purge legacy Skill98 articles (art-*) and seed the 8 Fatehan Robotics & Parenting articles
    await dbExec(`DELETE FROM articles WHERE id LIKE 'art-%'`);
    for (const a of INITIAL_ARTICLES) {
      await dbExec(
        `INSERT INTO articles (id, slug, title, category, status, featured, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           status = EXCLUDED.status,
           featured = EXCLUDED.featured,
           payload_json = EXCLUDED.payload_json,
           updated_at = EXCLUDED.updated_at`,
        [a.id, a.slug, a.title, a.category, a.status || 'published', a.featured ? 1 : 0, JSON.stringify(a), nowIso]
      );
    }

    // 3. Replace legacy Skill98 taxonomies with Fatehan Robotics departments & categories
    await dbExec(
      `DELETE FROM taxonomies WHERE id IN (
        'tax_cat_claude', 'tax_cat_claude_sub1', 'tax_cat_claude_sub2',
        'tax_cat_chatgpt', 'tax_cat_chatgpt_sub1',
        'tax_cat_codex', 'tax_cat_codex_sub1', 'tax_cat_codex_sub2',
        'tax_cat_devops', 'tax_art_mcp', 'tax_art_motion', 'tax_art_backend',
        'tax_brand_anthropic', 'tax_brand_openai', 'tax_brand_dpatech',
        'tax_tag_rtl', 'tax_tag_webgpu'
      )`
    );
    for (const tx of initialTaxonomies) {
      await dbExec(
        `INSERT INTO taxonomies (id, taxonomy_type, slug, title_fa, parent_id, icon_name, image_url, description, sort_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           taxonomy_type = EXCLUDED.taxonomy_type,
           slug = EXCLUDED.slug,
           title_fa = EXCLUDED.title_fa,
           parent_id = EXCLUDED.parent_id,
           icon_name = EXCLUDED.icon_name,
           description = EXCLUDED.description,
           sort_order = EXCLUDED.sort_order,
           updated_at = EXCLUDED.updated_at`,
        [tx.id, tx.type, tx.slug, tx.titleFa, tx.parentId, tx.icon, '', tx.titleFa, tx.order, nowIso]
      );
    }

    // 4. Re-seed pages, menus, invoice templates, coupons, SMS triggers, and media items with Fatehan defaults
    await dbExec(`DELETE FROM pages WHERE id IN ('page_about_us', 'page_contact_us', 'page_terms', 'page_b2b_enterprise')`);
    await dbExec(`DELETE FROM menus`);
    await dbExec(`DELETE FROM invoice_templates WHERE id IN ('inv_tpl_official_tax_a4', 'inv_tpl_thermal_80mm')`);
    await seedPhase3Tables(nowIso);

    await dbExec(`DELETE FROM coupons WHERE code IN ('SKILL98', 'DPATECH', 'MUURI15')`);
    for (const c of INITIAL_COUPONS) {
      await dbExec(
        `INSERT INTO coupons (code, discount_percent, description, active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           discount_percent = EXCLUDED.discount_percent,
           description = EXCLUDED.description,
           active = EXCLUDED.active`,
        [c.code, c.discountPercent, c.description, c.active ? 1 : 0]
      );
    }

    for (const trg of INITIAL_SMS_TRIGGER_RULES) {
      await dbExec(
        `INSERT INTO sms_triggers (id, title, event_key, section_label, send_mode, pattern_code, message_template, enabled, priority_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           section_label = EXCLUDED.section_label,
           message_template = EXCLUDED.message_template`,
        [
          trg.id,
          trg.title,
          trg.eventKey,
          trg.sectionLabel,
          trg.sendMode,
          trg.patternCode,
          trg.messageTemplate,
          trg.enabled ? 1 : 0,
          trg.priorityOrder,
        ]
      );
    }

    for (const m of INITIAL_MEDIA_LIBRARY) {
      await dbExec(
        `INSERT INTO media_items (id, title, url, category, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           payload_json = EXCLUDED.payload_json,
           updated_at = EXCLUDED.updated_at`,
        [m.id, m.title, m.url, m.category || 'article', JSON.stringify(m), nowIso]
      );
    }

    // 5. Upgrade theme_config (preserving any custom uploaded logoUrl / eitaaLogoUrl) & roles_config
    const existingTheme = await getSetting<Partial<typeof DEFAULT_THEME_CONFIG>>('theme_config', {});
    const mergedTheme = {
      ...DEFAULT_THEME_CONFIG,
      logoUrl: existingTheme.logoUrl || DEFAULT_THEME_CONFIG.logoUrl,
      faviconUrl: existingTheme.faviconUrl || DEFAULT_THEME_CONFIG.faviconUrl,
      headerLogoSizePx: existingTheme.headerLogoSizePx || DEFAULT_THEME_CONFIG.headerLogoSizePx,
      socialChannels: {
        ...DEFAULT_THEME_CONFIG.socialChannels,
        ...(existingTheme.socialChannels || {}),
        instagramId: existingTheme.socialChannels?.instagramId || DEFAULT_THEME_CONFIG.socialChannels?.instagramId,
        instagramUrl: existingTheme.socialChannels?.instagramUrl || DEFAULT_THEME_CONFIG.socialChannels?.instagramUrl,
        eitaaId: existingTheme.socialChannels?.eitaaId || DEFAULT_THEME_CONFIG.socialChannels?.eitaaId,
        eitaaUrl: existingTheme.socialChannels?.eitaaUrl || DEFAULT_THEME_CONFIG.socialChannels?.eitaaUrl,
        eitaaLogoUrl: existingTheme.socialChannels?.eitaaLogoUrl || '',
      },
      contactLocation: {
        ...DEFAULT_THEME_CONFIG.contactLocation,
        ...(existingTheme.contactLocation || {}),
      },
      contactPhones: {
        ...DEFAULT_THEME_CONFIG.contactPhones,
        ...(existingTheme.contactPhones || {}),
      },
      aboutPageConfig: {
        ...DEFAULT_THEME_CONFIG.aboutPageConfig,
        ...(existingTheme.aboutPageConfig || {}),
      },
      activeThemeId: 'fatehan' as const,
    };

    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['theme_config', JSON.stringify(mergedTheme), nowIso]
    );

    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['roles_config', JSON.stringify(INITIAL_CMS_ROLES), nowIso]
    );

    // 6. Ensure mod_academy_suite is enabled in site_modules_registry
    const existingModules = await getSetting< Array<{ id: string; enabled: boolean }> >('site_modules_registry', []);
    if (Array.isArray(existingModules) && existingModules.length > 0) {
      const updatedModules = existingModules.map((m) =>
        m.id === 'mod_academy_suite' ? { ...m, enabled: true } : m
      );
      if (!updatedModules.some((m) => m.id === 'mod_academy_suite')) {
        updatedModules.push({ id: 'mod_academy_suite', enabled: true });
      }
      await dbExec(
        `INSERT INTO site_settings (key, value_json, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
        ['site_modules_registry', JSON.stringify(updatedModules), nowIso]
      );
    }

    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['migration_fatehan_full_rebrand_v300', JSON.stringify({ appliedAt: nowIso }), nowIso]
    );
  }

  // One-time safe idempotent migration: upgrade legacy default address seed (واحد ۲ -> واحد ۳)
  // Only touches exact legacy default string; never overwrites custom addresses entered by admin.
  const unit3Mig = await dbQuery<{ key: string }>(
    `SELECT key FROM site_settings WHERE key = $1 LIMIT 1`,
    ['migration_address_unit3_v301']
  );
  if (unit3Mig.length === 0) {
    const OLD_DEFAULT_ADDR = 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲';
    const NEW_DEFAULT_ADDR = 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳';

    const existingTheme = await getSetting<Record<string, any> | null>('theme_config', null);
    if (existingTheme && existingTheme.contactLocation?.fullAddress === OLD_DEFAULT_ADDR) {
      existingTheme.contactLocation.fullAddress = NEW_DEFAULT_ADDR;
      await dbExec(
        `INSERT INTO site_settings (key, value_json, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
        ['theme_config', JSON.stringify(existingTheme), nowIso]
      );
    }

    const contactPages = await dbQuery<{ id: string; seo_description: string; composer_rows_json: string }>(
      `SELECT id, seo_description, composer_rows_json FROM pages WHERE id = $1 LIMIT 1`,
      ['page_contact_us']
    );
    if (contactPages[0]) {
      const nextSeo = (contactPages[0].seo_description || '').split(OLD_DEFAULT_ADDR).join(NEW_DEFAULT_ADDR);
      const nextRows = (contactPages[0].composer_rows_json || '').split(OLD_DEFAULT_ADDR).join(NEW_DEFAULT_ADDR);
      if (nextSeo !== contactPages[0].seo_description || nextRows !== contactPages[0].composer_rows_json) {
        await dbExec(
          `UPDATE pages SET seo_description = $1, composer_rows_json = $2, updated_at = $3 WHERE id = $4`,
          [nextSeo, nextRows, nowIso, contactPages[0].id]
        );
      }
    }

    await dbExec(
      `UPDATE invoice_templates SET seller_address = $1, updated_at = $2 WHERE seller_address = $3`,
      [NEW_DEFAULT_ADDR, nowIso, OLD_DEFAULT_ADDR]
    );

    await dbExec(
      `INSERT INTO site_settings (key, value_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      ['migration_address_unit3_v301', JSON.stringify({ appliedAt: nowIso }), nowIso]
    );
  }

  // Create & Seed Phase 5 Isolated Modular Tables (mod_payment_hub, mod_inventory_accounting, mod_forms, mod_ecommerce_suite)
  await createAndSeedPhase5ModulesSchema(nowIso);

  // Create & Seed Phase 6 Final Enterprise Modular Tables (mod_live_chat, mod_analytics_gsc, mod_ai_digikala, mod_seo_redirects, mod_booking, mod_auto_backup)
  await createAndSeedPhase6ModulesSchema(nowIso);

  // Create & Seed Phase 9 Isolated Modular Tables (mod_smart_crm, mod_subscriptions)
  await ensureSmartCrmSchema();
  await ensureSubscriptionsSchema();

  const logCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM system_logs');
  if (Number(logCount[0]?.cnt || 0) === 0) {
    await writeSystemLog({
      level: 'success',
      category: 'database',
      title: `راه‌اندازی دیتابیس آموزشگاه رباتیک فاتحان (${activeEngine === 'postgresql' ? 'PostgreSQL 16' : 'SQLite Sandbox'}) با ${TABLE_METADATA.length} جدول فعال`,
      detail:
        'تمامی جداول دوره‌های رباتیک، کیت‌های فروشگاهی، مقالات علمی، برگه‌ها، کاربران، پیامک، درگاه‌ها و دسترسی‌های RBAC همگام‌سازی شدند.',
      sqlOrEndpoint: `INIT SCHEMA · ${TABLE_METADATA.length} TABLES READY`,
      payload: { engine: activeEngine, tablesCount: TABLE_METADATA.length },
    });
  }
}

export async function initDatabase(): Promise<{ engine: SqlEngineKind; error?: string }> {
  const result = await connectStorageEngine(async (wasSelfHealed, healError) => {
    await createSchema();

    if (wasSelfHealed) {
      let restoredFromBackup = false;
      try {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .reverse();
        if (files[0]) {
          const content = fs.readFileSync(path.join(BACKUP_DIR, files[0]), 'utf-8');
          await restoreBackupFromContent(content, 'json');
          restoredFromBackup = true;
          console.log(`[Skill 98 DB] Auto-restored from backup ${files[0]}`);
        }
      } catch {
        // fallback to fresh seed
      }

      if (!restoredFromBackup) {
        await seedInitialData();
      } else {
        const roles = await getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES);
        await syncPermissionsToDbAndFile(roles);
      }

      await writeSystemLog({
        level: 'warning',
        category: 'database',
        title: 'بازیابی خودکار فایل دیتابیس SQLite',
        detail: `فایل آسیب‌دیده قبلی قرنطینه و دیتابیس سالم جایگزین شد. علت: ${healError || 'unknown'}`,
        sqlOrEndpoint: 'INIT SELF-HEAL',
      });
    } else {
      await seedInitialData();
    }
  });

  if (!getSchedulerHandle()) {
    const handle = setInterval(() => {
      void runScheduledBackupTick();
    }, 60_000);
    setSchedulerHandle(handle);
  }

  return result;
}
