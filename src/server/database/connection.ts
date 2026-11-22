import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export type SqlEngineKind = 'postgresql' | 'sqlite';

export interface SqliteStatementLike {
  all: (...params: unknown[]) => Record<string, unknown>[];
  run: (...params: unknown[]) => { changes?: number | bigint };
}

export interface SqliteDbLike {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementLike;
  close?: () => void;
}

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const SQLITE_PATH = path.join(DATA_DIR, 'skill98.db');

export const TABLE_METADATA: { name: string; description: string; defaultQuery: string }[] = [
  {
    name: 'users',
    description: 'کاربران، مدیران و مالکیت اسکیل‌ها',
    defaultQuery: 'SELECT phone, full_name, role, created_at, updated_at FROM users ORDER BY updated_at DESC LIMIT 50;',
  },
  {
    name: 'products',
    description: 'محصولات و مخزن ۶۰+ اسکیل',
    defaultQuery: 'SELECT id, title, category, item_type, price, status FROM products ORDER BY featured DESC, id ASC LIMIT 50;',
  },
  {
    name: 'articles',
    description: 'مقالات آموزشی و سئو',
    defaultQuery: 'SELECT id, title, slug, category, status, updated_at FROM articles ORDER BY updated_at DESC LIMIT 50;',
  },
  {
    name: 'orders',
    description: 'سفارشات و تراکنش‌های پرداخت',
    defaultQuery: 'SELECT id, buyer_phone, buyer_name, total_amount, payment_method, status, created_at_label FROM orders ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'payment_gateways',
    description: 'تنظیمات درگاه‌های بانکی (ایران‌کیش/نوینوپی/زرین‌پال)',
    defaultQuery: 'SELECT id, title, enabled, merchant_id, terminal_id, sandbox_mode FROM payment_gateways ORDER BY sort_order ASC LIMIT 50;',
  },
  {
    name: 'sms_triggers',
    description: 'شرط‌های اولویت‌دار ارسال پیامک',
    defaultQuery: 'SELECT priority_order, id, title, event_key, send_mode, pattern_code, enabled FROM sms_triggers ORDER BY priority_order ASC LIMIT 50;',
  },
  {
    name: 'coupons',
    description: 'کدهای تخفیف فروشگاه',
    defaultQuery: 'SELECT code, discount_percent, description, active FROM coupons LIMIT 50;',
  },
  {
    name: 'media_items',
    description: 'گالری رسانه و متادیتای تصاویر',
    defaultQuery: 'SELECT id, title, url, category FROM media_items LIMIT 50;',
  },
  {
    name: 'site_settings',
    description: 'تنظیمات کلان سیستم، پوسته و زمان‌بندی بکاپ',
    defaultQuery: 'SELECT key, updated_at FROM site_settings ORDER BY key ASC LIMIT 50;',
  },
  {
    name: 'system_logs',
    description: 'لاگ سیستم، درگاه‌ها، پیامک و کوئری‌ها',
    defaultQuery: 'SELECT id, level, category, title, created_at_fa FROM system_logs ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'backup_history',
    description: 'تاریخچه فایل‌های پشتیبان و وضعیت ارسال',
    defaultQuery: 'SELECT id, filename, format, trigger_type, destination, status, size_bytes, created_at_fa FROM backup_history ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'auth_sessions',
    description: 'نشست‌های فعال ورود کاربران و مدیران',
    defaultQuery: 'SELECT token, phone, user_display, role, device_label, ip_masked, status, last_active_at, expires_at FROM auth_sessions ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'rbac_permission_hashes',
    description: 'جدول هش‌شده سطوح دسترسی و قابلیت‌های نقش‌ها (HMAC-SHA256)',
    defaultQuery: 'SELECT id, role_id, role_slug, capability_key, granted, permission_hash, updated_at FROM rbac_permission_hashes ORDER BY role_id ASC, capability_key ASC LIMIT 100;',
  },
  {
    name: 'taxonomies',
    description: 'دسته‌بندی‌های درختی مادر/فرزند، برندها و برچسب‌های پویا',
    defaultQuery: 'SELECT id, taxonomy_type, slug, title_fa, parent_id, icon_name, sort_order, updated_at FROM taxonomies ORDER BY taxonomy_type ASC, sort_order ASC LIMIT 100;',
  },
  {
    name: 'pages',
    description: 'برگه‌های پویا (Dynamic Pages) با چیدمان صفحه‌ساز بصری و تنظیمات سئو',
    defaultQuery: 'SELECT id, slug, title, status, template_type, schema_type, updated_at FROM pages ORDER BY updated_at DESC LIMIT 50;',
  },
  {
    name: 'menus',
    description: 'آیتم‌های منوساز درختی (هدر، فوتر و موبایل)',
    defaultQuery: 'SELECT id, location, title_fa, parent_id, target_type, target_value, sort_order, enabled FROM menus ORDER BY location ASC, sort_order ASC LIMIT 100;',
  },
  {
    name: 'invoice_templates',
    description: 'قالب‌های بصری فاکتور رسمی مالیاتی و غیررسمی فروشگاهی',
    defaultQuery: 'SELECT id, template_code, title_fa, invoice_kind, paper_size, vat_percent, is_default, updated_at FROM invoice_templates ORDER BY is_default DESC LIMIT 50;',
  },
  {
    name: 'mod_payment_hub_drivers',
    description: 'هاب یکپارچه پی‌زیتو (۸ درگاه نقدی بانکی/شاپرک + ۹ درگاه اقساطی BNPL)',
    defaultQuery: 'SELECT driver_id, category, title_fa, provider_name, enabled, discount_percent, fee_percent, installment_counts_json, sort_order FROM mod_payment_hub_drivers ORDER BY category ASC, sort_order ASC;',
  },
  {
    name: 'mod_inventory_stock',
    description: 'موجودی لحظه‌ای انبار، تعداد رزرو موقت و هشدار اتمام موجودی',
    defaultQuery: 'SELECT product_id, sku_code, total_stock, reserved_stock, sold_count, low_stock_threshold, allow_backorder, updated_at FROM mod_inventory_stock ORDER BY total_stock ASC LIMIT 100;',
  },
  {
    name: 'mod_inventory_reservations',
    description: 'قفل رزرو موقت موجودی سبد خرید در ترافیک بلک‌فرایدی (TTL)',
    defaultQuery: 'SELECT id, session_key, product_id, quantity, status, expires_at, created_at FROM mod_inventory_reservations ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'mod_accounting_ledger',
    description: 'دفتر کل حسابداری فروشگاهی (فروش ناخالص، کارمزد درگاه، مالیات ارزش افزوده و سود خالص)',
    defaultQuery: 'SELECT id, order_id, invoice_serial, invoice_kind, gross_amount, gateway_fee_amount, tax_vat_amount, net_profit_amount, created_at_fa FROM mod_accounting_ledger ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'mod_forms_definitions',
    description: 'فرم‌ساز چندمرحله‌ای گرویتی با منطق شرطی و فرمول محاسباتی',
    defaultQuery: 'SELECT id, slug, title_fa, steps_count, conditional_rules_json, pricing_formula, honeypot_enabled, submissions_count FROM mod_forms_definitions ORDER BY updated_at DESC;',
  },
  {
    name: 'mod_forms_submissions',
    description: 'ورودی‌های ثبت‌شده فرم‌ها با قابلیت خروجی اکسل UTF-8 BOM',
    defaultQuery: 'SELECT id, form_id, submitter_name, submitter_phone, national_id, province, city, calculated_price, status, created_at_fa FROM mod_forms_submissions ORDER BY created_at DESC LIMIT 100;',
  },
  {
    name: 'mod_ecommerce_shipments',
    description: 'رهگیری مرسولات پستی (پست پیشتاز، تیپاکس، پیک شهری) و اطلاع‌رسانی پیامکی',
    defaultQuery: 'SELECT id, order_id, buyer_phone, carrier_code, carrier_title_fa, tracking_code, status, sms_notified, created_at_fa FROM mod_ecommerce_shipments ORDER BY updated_at DESC LIMIT 50;',
  },
  {
    name: 'mod_ecommerce_stock_alerts',
    description: 'درخواست‌های اطلاع‌رسانی پیامکی «موجود شد خبرم کن»',
    defaultQuery: 'SELECT id, product_id, product_title, phone, status, created_at_fa FROM mod_ecommerce_stock_alerts ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'mod_ecommerce_wallets',
    description: 'کیف پول مشتریان و اعتبار کش‌بک وفاداری',
    defaultQuery: 'SELECT phone, balance_toman, total_cashback_earned, loyalty_points, updated_at FROM mod_ecommerce_wallets ORDER BY balance_toman DESC LIMIT 50;',
  },
  {
    name: 'mod_live_chat_sessions',
    description: 'نشست‌های گفتگوی آنلاین بومی (مشابه گفتینو) با وضعیت اپراتور',
    defaultQuery: 'SELECT id, visitor_name, visitor_phone, subject, department, status, unread_admin_count, last_message_preview, created_at_fa FROM mod_live_chat_sessions ORDER BY updated_at DESC LIMIT 50;',
  },
  {
    name: 'mod_live_chat_messages',
    description: 'پیام‌ها و فایل‌های پیوست گفتگوی آنلاین بومی',
    defaultQuery: 'SELECT id, session_id, sender_role, sender_name, message_text, attachment_url, created_at_fa FROM mod_live_chat_messages ORDER BY created_at DESC LIMIT 100;',
  },
  {
    name: 'mod_analytics_events',
    description: 'رویدادهای آمارگیر بومی بازدید صفحات (بدون نیاز به اینترنت بین‌الملل)',
    defaultQuery: 'SELECT id, page_path, page_title, referrer_source, device_type, province_id, city_name, created_at_fa FROM mod_analytics_events ORDER BY created_at DESC LIMIT 100;',
  },
  {
    name: 'mod_analytics_province_sales',
    description: 'آمار فروش، درآمد و بازدید به تفکیک ۳۱ استان و شهرهای ایران',
    defaultQuery: 'SELECT province_id, province_name_fa, top_city_fa, orders_count, revenue_toman, visitors_count FROM mod_analytics_province_sales ORDER BY revenue_toman DESC;',
  },
  {
    name: 'mod_gsc_keywords',
    description: 'داده‌های کلمات کلیدی، کلیک، ایمپرشن و وضعیت ایندکس Google Search Console',
    defaultQuery: 'SELECT id, query_text, target_page, clicks, impressions, ctr_percent, avg_position, index_status FROM mod_gsc_keywords ORDER BY clicks DESC;',
  },
  {
    name: 'mod_ai_digikala_imports',
    description: 'تاریخچه محصولات استخراج‌شده از دیجی‌کالا با بازنویسی هوش مصنوعی و امتیاز سئو RankMath',
    defaultQuery: 'SELECT id, dkp_code, original_title, rewritten_title, seo_score, focus_keyword, created_at_fa FROM mod_ai_digikala_imports ORDER BY created_at DESC LIMIT 50;',
  },
  {
    name: 'mod_seo_redirects',
    description: 'قوانین ریدایرکت 301/302 و مانیتورینگ خطاهای 404',
    defaultQuery: 'SELECT id, from_path, to_path, redirect_code, hits_count, is_404_captured, note_fa, enabled FROM mod_seo_redirects ORDER BY hits_count DESC;',
  },
  {
    name: 'mod_booking_slots',
    description: 'سانس‌ها و ظرفیت تقویم رزرواسیون و نوبت‌دهی شمسی',
    defaultQuery: 'SELECT id, service_title_fa, expert_name_fa, jalali_date, time_window, capacity, booked_count, price_toman, status FROM mod_booking_slots ORDER BY jalali_date ASC;',
  },
  {
    name: 'mod_booking_appointments',
    description: 'نوبت‌های رزروشده مشتریان در تقویم شمسی',
    defaultQuery: 'SELECT id, slot_id, service_title_fa, jalali_date, time_window, customer_name, customer_phone, status, tracking_code, created_at_fa FROM mod_booking_appointments ORDER BY created_at DESC;',
  },
  {
    name: 'mod_auto_backup_archives',
    description: 'آرشیو بکاپ‌های خودکار رمزنگاری‌شده ZIP (دیتابیس + /uploads) و ارسال وب‌هوک/S3',
    defaultQuery: 'SELECT id, archive_name, includes_summary, encryption_algo, checksum_sha256, size_bytes, storage_target, cron_expression, status, created_at_fa FROM mod_auto_backup_archives ORDER BY created_at DESC;',
  },
  {
    name: 'mod_ai_provider_configs',
    description: 'تنظیمات ۴ اسلات موتور هوش مصنوعی (متن، تصویر، ایجنت ۲۴/۷ و صوت Whisper)',
    defaultQuery: 'SELECT slot_key, provider_kind, base_url, model_name, enabled, updated_by, updated_at FROM mod_ai_provider_configs ORDER BY slot_key ASC;',
  },
  {
    name: 'mod_ai_agent_skills',
    description: 'حافظه مهارت‌ها و دستورالعمل‌های دائمی SKILL.md ایجنت ۲۴/۷',
    defaultQuery: 'SELECT id, slug, title_fa, category, source_type, usage_count, enabled, updated_at FROM mod_ai_agent_skills ORDER BY updated_at DESC;',
  },
  {
    name: 'mod_ai_agent_memory',
    description: 'حافظه بلندمدت تفکیک‌شده ایجنت به تفکیک نقش و کاربر (Zero Cross-User Leakage)',
    defaultQuery: 'SELECT id, scope_type, user_id, visitor_session_id, memory_key, memory_value, updated_at FROM mod_ai_agent_memory ORDER BY updated_at DESC LIMIT 100;',
  },
  {
    name: 'mod_ai_agent_conversations',
    description: 'تاریخچه فرمان‌ها و ابزارهای اجراشده توسط ایجنت ۲۴/۷',
    defaultQuery: 'SELECT id, channel, sender_phone, role, message_text, created_at_fa FROM mod_ai_agent_conversations ORDER BY created_at DESC LIMIT 50;',
  },
];

let activeEngine: SqlEngineKind = 'sqlite';
let pgPool: Pool | null = null;
let sqliteDb: SqliteDbLike | null = null;
let lastConnectionError: string | null = null;
let isInitialized = false;
let schedulerIntervalHandle: ReturnType<typeof setInterval> | null = null;

export function formatPersianDateTime(dateInput?: Date | string): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    return d.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return new Date().toISOString();
  }
}

export function getActiveEngine(): SqlEngineKind {
  return activeEngine;
}

export function getLastConnectionError(): string | null {
  return lastConnectionError;
}

export function isDbInitialized(): boolean {
  return isInitialized;
}

export function setSchedulerHandle(handle: ReturnType<typeof setInterval> | null): void {
  schedulerIntervalHandle = handle;
}

export function getSchedulerHandle(): ReturnType<typeof setInterval> | null {
  return schedulerIntervalHandle;
}

export function checkpointSqlitePassive(): void {
  if (activeEngine === 'sqlite' && sqliteDb) {
    try {
      sqliteDb.exec('PRAGMA wal_checkpoint(PASSIVE);');
    } catch {
      // ignore checkpoint hint
    }
  }
}

function convertPgParamsToSqlite(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
  const orderedParams: unknown[] = [];
  const converted = sql.replace(/\$(\d+)/g, (_match, numStr) => {
    const idx = Number(numStr) - 1;
    orderedParams.push(params[idx] ?? null);
    return '?';
  });
  return { sql: converted, params: orderedParams };
}

export async function dbQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (activeEngine === 'postgresql' && pgPool) {
    const result = await pgPool.query(sql, params);
    return result.rows as T[];
  }
  if (sqliteDb) {
    const mapped = convertPgParamsToSqlite(sql, params);
    const stmt = sqliteDb.prepare(mapped.sql);
    return stmt.all(...mapped.params) as T[];
  }
  return [];
}

export async function dbExec(sql: string, params: unknown[] = []): Promise<void> {
  if (activeEngine === 'postgresql' && pgPool) {
    await pgPool.query(sql, params);
    return;
  }
  if (sqliteDb) {
    if (params.length === 0) {
      sqliteDb.exec(sql);
      return;
    }
    const mapped = convertPgParamsToSqlite(sql, params);
    sqliteDb.prepare(mapped.sql).run(...mapped.params);
  }
}

export function cleanupOldCorruptSqliteArtifacts(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const file of fs.readdirSync(DATA_DIR)) {
      if (/^skill98\.db\.corrupt_/.test(file)) {
        try {
          fs.unlinkSync(path.join(DATA_DIR, file));
        } catch {
          // ignore cleanup failure
        }
      }
    }
  } catch {
    // ignore
  }
}

export function quarantineCorruptSqliteFiles(): void {
  const stamp = Date.now();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${SQLITE_PATH}${suffix}`;
    if (fs.existsSync(file)) {
      try {
        fs.renameSync(file, `${SQLITE_PATH}.corrupt_${stamp}${suffix}`);
      } catch {
        try {
          fs.unlinkSync(file);
        } catch {
          // ignore
        }
      }
    }
  }
}

export async function connectStorageEngine(
  onSchemaReady: (wasSelfHealed: boolean, healError?: string) => Promise<void>
): Promise<{ engine: SqlEngineKind; error?: string }> {
  if (isInitialized) {
    return { engine: activeEngine, error: lastConnectionError || undefined };
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  cleanupOldCorruptSqliteArtifacts();

  const pgConnectionString =
    process.env.DATABASE_URL ||
    (process.env.PGHOST
      ? `postgresql://${process.env.PGUSER || 'skill98'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'skill98_db'}`
      : '');

  if (pgConnectionString) {
    try {
      const candidatePool = new Pool({
        connectionString: pgConnectionString,
        connectionTimeoutMillis: 3500,
        max: 15,
      });
      await candidatePool.query('SELECT 1');
      pgPool = candidatePool;
      activeEngine = 'postgresql';
      lastConnectionError = null;
      isInitialized = true;
      await onSchemaReady(false);
      console.log('[Skill 98 DB] Connected to PostgreSQL database successfully.');
      return { engine: activeEngine };
    } catch (err) {
      lastConnectionError = err instanceof Error ? err.message : String(err);
      console.warn(
        '[Skill 98 DB] PostgreSQL unavailable, using built-in SQLite persistence:',
        lastConnectionError
      );
      pgPool = null;
    }
  }

  const sqliteModule = (await import('node:sqlite')) as {
    DatabaseSync: new (filePath: string) => SqliteDbLike;
  };

  const openFresh = () => {
    const db = new sqliteModule.DatabaseSync(SQLITE_PATH);
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA wal_autocheckpoint = 100;');
    const qc = db.prepare('PRAGMA quick_check;').all();
    const firstVal = qc[0] ? String(Object.values(qc[0])[0] || '') : 'ok';
    if (firstVal.toLowerCase() !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${firstVal}`);
    }
    return db;
  };

  const maxBusyRetries = 5;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxBusyRetries; attempt++) {
    try {
      sqliteDb = openFresh();
      activeEngine = 'sqlite';
      isInitialized = true;
      await onSchemaReady(false);
      console.log(`[Skill 98 DB] SQLite relational engine initialized at ${SQLITE_PATH}`);
      return { engine: activeEngine, error: lastConnectionError || undefined };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      try {
        sqliteDb?.close?.();
      } catch {
        // ignore
      }
      sqliteDb = null;
      isInitialized = false;

      const isTransientLock = msg.includes('busy') || msg.includes('locked');
      if (isTransientLock && attempt < maxBusyRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        continue;
      }
      break;
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.warn('[Skill 98 DB] SQLite corrupted or unreadable, self-healing:', msg);
  quarantineCorruptSqliteFiles();

  sqliteDb = openFresh();
  activeEngine = 'sqlite';
  isInitialized = true;
  await onSchemaReady(true, msg);
  console.log(`[Skill 98 DB] SQLite self-healed at ${SQLITE_PATH}`);
  return { engine: activeEngine, error: lastConnectionError || undefined };
}

export async function closeDatabaseCleanly(): Promise<void> {
  if (schedulerIntervalHandle) {
    clearInterval(schedulerIntervalHandle);
    schedulerIntervalHandle = null;
  }
  if (activeEngine === 'sqlite' && sqliteDb) {
    try {
      sqliteDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      sqliteDb.close?.();
    } catch {
      // ignore
    }
    sqliteDb = null;
    isInitialized = false;
  }
  if (pgPool) {
    try {
      await pgPool.end();
    } catch {
      // ignore
    }
    pgPool = null;
  }
}
