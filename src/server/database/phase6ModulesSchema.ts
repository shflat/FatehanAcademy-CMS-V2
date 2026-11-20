import { dbExec, dbQuery, formatPersianDateTime } from './connection.js';

export async function createAndSeedPhase6ModulesSchema(nowIso: string): Promise<void> {
  const ddlStatements = [
    // P6.1: Goftino-Style Native Live Chat (Sessions & Messages)
    `CREATE TABLE IF NOT EXISTS mod_live_chat_sessions (
      id TEXT PRIMARY KEY,
      visitor_name TEXT NOT NULL,
      visitor_phone TEXT DEFAULT '',
      subject TEXT NOT NULL DEFAULT 'گفتگوی پشتیبانی آنلاین',
      department TEXT NOT NULL DEFAULT 'فروش و پشتیبانی فنی',
      status TEXT NOT NULL DEFAULT 'open',
      unread_admin_count INTEGER NOT NULL DEFAULT 0,
      last_message_preview TEXT DEFAULT '',
      created_at_fa TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mod_live_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message_text TEXT NOT NULL,
      attachment_url TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // P6.2: Self-Hosted Native Analytics, Province Sales & Google Search Console
    `CREATE TABLE IF NOT EXISTS mod_analytics_events (
      id TEXT PRIMARY KEY,
      page_path TEXT NOT NULL,
      page_title TEXT NOT NULL,
      referrer_source TEXT NOT NULL DEFAULT 'direct',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      province_id TEXT NOT NULL DEFAULT 'tehran',
      city_name TEXT NOT NULL DEFAULT 'تهران',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mod_analytics_province_sales (
      province_id TEXT PRIMARY KEY,
      province_name_fa TEXT NOT NULL,
      top_city_fa TEXT NOT NULL,
      orders_count INTEGER NOT NULL DEFAULT 0,
      revenue_toman INTEGER NOT NULL DEFAULT 0,
      visitors_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mod_gsc_keywords (
      id TEXT PRIMARY KEY,
      query_text TEXT NOT NULL,
      target_page TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr_percent REAL NOT NULL DEFAULT 0,
      avg_position REAL NOT NULL DEFAULT 1,
      index_status TEXT NOT NULL DEFAULT 'indexed',
      updated_at TEXT NOT NULL
    )`,

    // P6.3: AI Digikala Product Importer & RankMath SEO Scorer Jobs
    `CREATE TABLE IF NOT EXISTS mod_ai_digikala_imports (
      id TEXT PRIMARY KEY,
      dkp_code TEXT NOT NULL,
      source_url TEXT NOT NULL,
      original_title TEXT NOT NULL,
      rewritten_title TEXT NOT NULL,
      rewritten_excerpt TEXT NOT NULL,
      specs_json TEXT NOT NULL DEFAULT '[]',
      images_json TEXT NOT NULL DEFAULT '[]',
      generated_reviews_json TEXT NOT NULL DEFAULT '[]',
      seo_score INTEGER NOT NULL DEFAULT 92,
      focus_keyword TEXT NOT NULL,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // P6.4a: 301/302 Redirects & 404 Error Monitor
    `CREATE TABLE IF NOT EXISTS mod_seo_redirects (
      id TEXT PRIMARY KEY,
      from_path TEXT NOT NULL UNIQUE,
      to_path TEXT NOT NULL,
      redirect_code INTEGER NOT NULL DEFAULT 301,
      hits_count INTEGER NOT NULL DEFAULT 0,
      is_404_captured INTEGER NOT NULL DEFAULT 0,
      note_fa TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,

    // P6.4b: Solar (Jalali) Service Booking & Appointment Slots
    `CREATE TABLE IF NOT EXISTS mod_booking_slots (
      id TEXT PRIMARY KEY,
      service_title_fa TEXT NOT NULL,
      expert_name_fa TEXT NOT NULL,
      jalali_date TEXT NOT NULL,
      time_window TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 5,
      booked_count INTEGER NOT NULL DEFAULT 0,
      price_toman INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mod_booking_appointments (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      service_title_fa TEXT NOT NULL,
      jalali_date TEXT NOT NULL,
      time_window TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      tracking_code TEXT NOT NULL,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // P6.5: Automated Encrypted ZIP Backups & Cron Jobs
    `CREATE TABLE IF NOT EXISTS mod_auto_backup_archives (
      id TEXT PRIMARY KEY,
      archive_name TEXT NOT NULL,
      includes_summary TEXT NOT NULL,
      encryption_algo TEXT NOT NULL DEFAULT 'AES-256-GCM + SHA256',
      checksum_sha256 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      storage_target TEXT NOT NULL DEFAULT 'local_and_webhook',
      cron_expression TEXT NOT NULL DEFAULT '0 3 * * *',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // Performance Indexes
    `CREATE INDEX IF NOT EXISTS idx_mod_chat_msg_session ON mod_live_chat_messages(session_id, created_at ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_analytics_prov ON mod_analytics_events(province_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_redirects_from ON mod_seo_redirects(from_path)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_booking_date ON mod_booking_slots(jalali_date, status)`,
  ];

  for (const stmt of ddlStatements) {
    await dbExec(stmt);
  }

  const nowFa = formatPersianDateTime();

  // Seed initial Live Chat Conversation
  const chatCnt = await dbQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mod_live_chat_sessions');
  if (Number(chatCnt[0]?.cnt || 0) === 0) {
    const sessId = 'chat_sess_1405_01';
    await dbExec(
      `INSERT INTO mod_live_chat_sessions (id, visitor_name, visitor_phone, subject, department, status, unread_admin_count, last_message_preview, created_at_fa, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [sessId, 'مهندس آریا راد', '09123456789', 'سوال درباره لایسنس سازمانی و فاکتور رسمی', 'فروش و پشتیبانی فنی', 'open', 1, 'آیا امکان صدور فاکتور رسمی مودیان برای پکیج فول‌استک وجود دارد؟', nowFa, nowIso]
    );
    await dbExec(
      `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, created_at_fa, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      ['msg_seed_1', sessId, 'visitor', 'مهندس آریا راد', 'سلام، آیا امکان صدور فاکتور رسمی مودیان برای پکیج فول‌استک وجود دارد؟', '', '', nowFa, nowIso]
    );
    await dbExec(
      `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, created_at_fa, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      ['msg_seed_2', sessId, 'operator', 'پشتیبانی اسکیل ۹۸ (گفتینو بومی)', 'سلام مهندس گرامی؛ بله، در کشوی تسویه‌حساب گزینه «فاکتور رسمی دارایی» فعال است و آنی با کد اقتصادی صادر می‌شود.', '', '', nowFa, nowIso]
    );
  }

  // Seed Iranian Province Sales & Native Analytics
  const provCnt = await dbQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mod_analytics_province_sales');
  if (Number(provCnt[0]?.cnt || 0) === 0) {
    const provincesSeed: [string, string, string, number, number, number][] = [
      ['tehran', 'تهران', 'تهران', 412, 618000000, 14820],
      ['isfahan', 'اصفهان', 'اصفهان', 164, 241000000, 5430],
      ['khorasan_razavi', 'خراسان رضوی', 'مشهد', 152, 219500000, 5110],
      ['fars', 'فارس', 'شیراز', 138, 198000000, 4690],
      ['east_azerbaijan', 'آذربایجان شرقی', 'تبریز', 97, 142000000, 3280],
      ['alborz', 'البرز', 'کرج', 91, 134500000, 3150],
      ['mazandaran', 'مازندران', 'ساری', 74, 108000000, 2640],
      ['khuzestan', 'خوزستان', 'اهواز', 68, 99500000, 2410],
      ['gilan', 'گیلان', 'رشت', 63, 91200000, 2190],
      ['yazd', 'یزد', 'یزد', 52, 76400000, 1850],
    ];
    for (const p of provincesSeed) {
      await dbExec(
        `INSERT INTO mod_analytics_province_sales (province_id, province_name_fa, top_city_fa, orders_count, revenue_toman, visitors_count, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [...p, nowIso]
      );
    }
  }

  // Seed Google Search Console Keywords
  const gscCnt = await dbQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mod_gsc_keywords');
  if (Number(gscCnt[0]?.cnt || 0) === 0) {
    const gscSeeds: [string, string, string, number, number, number, number, string][] = [
      ['gsc_1', 'اسکیل کلود و کدکس فارسی', '/product/skill-codex-project-map', 1840, 19200, 9.58, 1.4, 'indexed'],
      ['gsc_2', 'آموزش صفحه‌ساز Muuri و GSAP', '/product/skill-muuri-interactive-grid', 1290, 15400, 8.37, 1.8, 'indexed'],
      ['gsc_3', 'پکیج معماری فول‌استک Next.js', '/product/pkg-fullstack-architect', 980, 11800, 8.3, 2.1, 'indexed'],
      ['gsc_4', 'درگاه پرداخت اقساطی اسنپ‌پی و ترب‌پی', '/page/pricing-plans', 760, 9400, 8.08, 2.3, 'indexed'],
      ['gsc_5', 'ممیزی امنیت OWASP در Node.js', '/product/skill-owasp-security-auditor', 640, 8100, 7.9, 2.6, 'indexed'],
    ];
    for (const g of gscSeeds) {
      await dbExec(
        `INSERT INTO mod_gsc_keywords (id, query_text, target_page, clicks, impressions, ctr_percent, avg_position, index_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [...g, nowIso]
      );
    }
  }

  // Seed 301 Redirects & 404 Monitor
  const redirCnt = await dbQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mod_seo_redirects');
  if (Number(redirCnt[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_seo_redirects (id, from_path, to_path, redirect_code, hits_count, is_404_captured, note_fa, enabled, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      ['redir_1', '/old-catalog', '/store', 301, 148, 0, 'انتقال دائمی آدرس فروشگاه قدیم به مخزن جدید', 1, nowIso]
    );
    await dbExec(
      `INSERT INTO mod_seo_redirects (id, from_path, to_path, redirect_code, hits_count, is_404_captured, note_fa, enabled, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      ['redir_2', '/wp-admin', '/admin', 302, 63, 1, 'ریدایرکت خودکار مسیرهای اسکنر قدیمی', 1, nowIso]
    );
  }

  // Seed Solar Booking Slots
  const slotCnt = await dbQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mod_booking_slots');
  if (Number(slotCnt[0]?.cnt || 0) === 0) {
    const slots: [string, string, string, string, string, number, number, number][] = [
      ['slot_1405_1', 'جلسه ممیزی معماری نرم‌افزار و مقیاس‌پذیری', 'دکتر کیانوش فرهمند', '۱۴۰۵/۰۸/۲۸', '۱۰:۰۰ تا ۱۱:۳۰', 3, 1, 1850000],
      ['slot_1405_2', 'مشاوره اختصاصی سئو تکنیکال و Core Web Vitals', 'مهندس سارا نیک‌زاد', '۱۴۰۵/۰۸/۲۹', '۱۵:۰۰ تا ۱۶:۳۰', 5, 2, 1250000],
      ['slot_1405_3', 'راه‌اندازی پایپ‌لاین هوش مصنوعی و ایجنت‌های سازمانی', 'مهندس امیرحسین راد', '۱۴۰۵/۰۸/۳۰', '۱۷:۰۰ تا ۱۸:۳۰', 4, 0, 2400000],
    ];
    for (const s of slots) {
      await dbExec(
        `INSERT INTO mod_booking_slots (id, service_title_fa, expert_name_fa, jalali_date, time_window, capacity, booked_count, price_toman, status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'available',$9)`,
        [...s, nowIso]
      );
    }
  }
}
