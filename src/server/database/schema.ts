import fs from 'fs';
import path from 'path';
import type { CmsRoleDefinition } from '../../core/types.js';
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
      logo_url TEXT DEFAULT '/logo-skill98.svg',
      stamp_signature_url TEXT DEFAULT '/logo-skill98-emblem.svg',
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

  // Synchronize Hashed RBAC Permissions to SQL table AND data/permissions.hash.json
  const roles = await getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES);
  await syncPermissionsToDbAndFile(roles);

  // Seed Dynamic Hierarchical Taxonomies (unlimited parent/child categories, brands & tags)
  const initialTaxonomies = [
    { id: 'tax_cat_claude', type: 'product_category', slug: 'Claude', titleFa: 'اسکیل‌های Claude Code و پروتکل MCP', parentId: null, icon: 'Sparkles', order: 1 },
    { id: 'tax_cat_claude_sub1', type: 'product_category', slug: 'Claude-MCP', titleFa: 'سرورهای MCP (Context7، Playwright و Figma)', parentId: 'tax_cat_claude', icon: 'Layers', order: 2 },
    { id: 'tax_cat_claude_sub2', type: 'product_category', slug: 'Cursor-Rules-MDC', titleFa: 'قوانین .cursor/rules (.mdc) و بهینه‌سازی توکن', parentId: 'tax_cat_claude', icon: 'Zap', order: 3 },
    { id: 'tax_cat_chatgpt', type: 'product_category', slug: 'ChatGPT', titleFa: 'اسکیل‌های ChatGPT و دیزاین سیستم', parentId: null, icon: 'Bot', order: 4 },
    { id: 'tax_cat_chatgpt_sub1', type: 'product_category', slug: 'ChatGPT-SEO', titleFa: 'سئو معنایی و معماری محتوا', parentId: 'tax_cat_chatgpt', icon: 'Globe', order: 5 },
    { id: 'tax_cat_codex', type: 'product_category', slug: 'Codex', titleFa: 'کتابخانه‌های مدرن JS و فول‌استک', parentId: null, icon: 'Terminal', order: 6 },
    { id: 'tax_cat_codex_sub1', type: 'product_category', slug: 'Modern-JS-Motion', titleFa: 'انیمیشن و سه‌بعدی (GSAP، Motion، Anime.js، WebGPU)', parentId: 'tax_cat_codex', icon: 'Palette', order: 7 },
    { id: 'tax_cat_codex_sub2', type: 'product_category', slug: 'Fullstack-Edge', titleFa: 'استک مدرن (Hono، Drizzle ORM، TanStack، Biome)', parentId: 'tax_cat_codex', icon: 'Cpu', order: 8 },
    { id: 'tax_cat_devops', type: 'product_category', slug: 'DevOps-Security', titleFa: 'امنیت OWASP، دواپس و زیرساخت', parentId: null, icon: 'Shield', order: 9 },
    { id: 'tax_art_mcp', type: 'article_category', slug: 'mcp-skills-engineering', titleFa: 'پروتکل MCP و اسکیل‌نویسی', parentId: null, icon: 'FileText', order: 1 },
    { id: 'tax_art_motion', type: 'article_category', slug: 'web-motion-ui', titleFa: 'مهندسی فرانت‌اند و انیمیشن', parentId: null, icon: 'Sparkles', order: 2 },
    { id: 'tax_art_backend', type: 'article_category', slug: 'backend-architecture', titleFa: 'معماری نرم‌افزار و بک‌اند', parentId: null, icon: 'Database', order: 3 },
    { id: 'tax_brand_anthropic', type: 'brand', slug: 'anthropic-claude', titleFa: 'Anthropic Claude & MCP', parentId: null, icon: 'Award', order: 1 },
    { id: 'tax_brand_openai', type: 'brand', slug: 'openai-codex', titleFa: 'OpenAI Codex & Cursor', parentId: null, icon: 'Cpu', order: 2 },
    { id: 'tax_brand_dpatech', type: 'brand', slug: 'skill98-studio', titleFa: 'استودیو مهندسی اسکیل ۹۸', parentId: null, icon: 'Crown', order: 3 },
    { id: 'tax_tag_rtl', type: 'tag', slug: 'persian-rtl', titleFa: 'بومی‌سازی فارسی و RTL', parentId: null, icon: 'Tag', order: 1 },
    { id: 'tax_tag_webgpu', type: 'tag', slug: 'webgpu-waapi', titleFa: 'WebGPU و انیمیشن ۶۰ فریم', parentId: null, icon: 'Zap', order: 2 },
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
      title: `راه‌اندازی دیتابیس ${activeEngine === 'postgresql' ? 'PostgreSQL 16' : 'SQLite Sandbox'} با ${TABLE_METADATA.length} جدول فعال`,
      detail:
        'تمامی جداول فروشگاه، کاربران، پیامک، درگاه‌ها، سفارشات، تاریخچه بکاپ و هش دسترسی‌های RBAC با موفقیت همگام‌سازی شدند.',
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
