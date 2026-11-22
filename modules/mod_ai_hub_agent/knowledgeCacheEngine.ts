import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { getSetting } from '../../src/server/database/settingsLogsRepo.js';
import { upsertAgentMemory } from './aiHubSchema.js';

export type KnowledgeCacheCategory = 'greeting' | 'faq' | 'catalog' | 'auto_learned';
export type KnowledgeCacheStatus = 'active' | 'pending_review' | 'disabled';
export type KnowledgeCacheSource = 'seed' | 'admin' | 'ai_learned';

export interface KnowledgeCacheRow {
  id: string;
  question_pattern: string;
  normalized_keywords: string;
  answer_text: string;
  category: KnowledgeCacheCategory;
  status: KnowledgeCacheStatus;
  hit_count: number;
  source: KnowledgeCacheSource;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeMatchResult {
  matched: boolean;
  entryId?: string;
  category?: KnowledgeCacheCategory;
  score?: number;
  answerText?: string;
  triggerOtpForGuest?: boolean;
  tokenSaved?: boolean;
}

const PERSIAN_STOPWORDS = new Set([
  'از', 'به', 'در', 'با', 'برای', 'که', 'این', 'آن', 'یک', 'را', 'تا', 'یا', 'و', 'هم',
  'است', 'هست', 'شد', 'می', 'میشه', 'میشود', 'می‌شود', 'می‌شه', 'دارد', 'داره', 'دارید',
  'کنم', 'کنید', 'بکنم', 'بشم', 'شوم', 'باشه', 'باشید', 'لطفا', 'لطفاً', 'ببخشید',
  'من', 'ما', 'شما', 'او', 'آنها', 'خود', 'چند', 'چه', 'چی', 'کجا', 'کی', 'آیا',
  'رو', 'تو', 'توی', 'روی', 'داخل', 'پیش', 'فقط', 'خیلی', 'یه', 'ها', 'های',
]);

const EXACT_GREETING_PHRASES = new Set([
  'سلام',
  'درود',
  'سلام علیکم',
  'سلام وقت بخیر',
  'وقت بخیر',
  'روز بخیر',
  'شب بخیر',
  'صبح بخیر',
  'خسته نباشید',
  'خسته نباشی',
  'سلام خسته نباشید',
  'سلام روز بخیر',
  'سلام شب بخیر',
  'سلام صبح بخیر',
  'سلام خوبی',
  'سلام خوبید',
  'سلام هستید',
  'الو',
  'hi',
  'hello',
  'hey',
]);

const EXACT_THANKS_PHRASES = new Set([
  'ممنون',
  'ممنونم',
  'مرسی',
  'تشکر',
  'متشکرم',
  'سپاس',
  'سپاسگزارم',
  'خیلی ممنون',
  'ممنون از شما',
  'ممنون خسته نباشید',
  'خداحافظ',
  'خدانگهدار',
  'فعلا',
  'thanks',
  'thank you',
]);

export function normalizePersianText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, 'ی') // Arabic yeh -> Persian yeh
    .replace(/\u0643/g, 'ک') // Arabic kaf -> Persian kaf
    .replace(/[\u0622\u0623\u0625]/g, 'ا') // Alef variants
    .replace(/\u0629/g, 'ه') // Teh marbuta
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // diacritics & tatweel
    .replace(/[\u200C\u200D]/g, ' ') // ZWNJ/ZWJ -> space
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNormalizedTokens(input: string): string[] {
  const norm = normalizePersianText(input);
  if (!norm) return [];
  const rawTokens = norm.split(' ').filter((w) => w.length >= 2);
  const filtered = rawTokens.filter((w) => !PERSIAN_STOPWORDS.has(w));
  const unique = Array.from(new Set(filtered.length > 0 ? filtered : rawTokens));
  return unique.slice(0, 32);
}

export async function getLiveSiteTitleAndDesc(): Promise<{
  siteTitle: string;
  siteDescription: string;
}> {
  const themeCfg = await getSetting<Record<string, unknown>>('theme_config', {});
  const siteTitle = String(
    themeCfg?.brandNameFa || themeCfg?.siteTitle || 'این سامانه'
  ).trim();
  const siteDescription = String(
    themeCfg?.heroSubtitle || themeCfg?.footerDescription || ''
  )
    .trim()
    .slice(0, 240);
  return { siteTitle, siteDescription };
}

function interpolateSiteVars(text: string, siteTitle: string): string {
  return String(text || '').replace(/\{siteTitle\}/g, siteTitle || 'این سامانه');
}

const DEFAULT_ZERO_TOKEN_SEEDS: {
  id: string;
  question_pattern: string;
  normalized_keywords: string;
  answer_text: string;
  category: KnowledgeCacheCategory;
}[] = [
  {
    id: 'kb_seed_greeting',
    question_pattern: 'سلام و خوش‌آمدگویی',
    normalized_keywords: 'سلام درود وقت بخیر روز بخیر شب بخیر صبح بخیر خسته نباشید hello hi',
    answer_text:
      'سلام و وقت بخیر! به {siteTitle} خوش آمدید. من مشاور فروش و راهنمای آنلاین سایت هستم؛ بفرمایید دنبال کدام محصول، دوره یا خدمت هستید تا سریع راهنماییتان کنم؟',
    category: 'greeting',
  },
  {
    id: 'kb_seed_thanks',
    question_pattern: 'تشکر و خداحافظی',
    normalized_keywords: 'ممنون مرسی تشکر متشکرم سپاس خداحافظ خدانگهدار thanks',
    answer_text:
      'خواهش می‌کنم، باعث افتخار ماست! هر زمان سوال یا سفارشی در {siteTitle} داشتید در خدمتتان هستیم. روز خوبی داشته باشید.',
    category: 'greeting',
  },
  {
    id: 'kb_seed_how_to_buy',
    question_pattern: 'چطور خرید کنم و چطور به فایل یا سفارش دسترسی بگیرم؟',
    normalized_keywords: 'چطور خرید کنم نحوه خرید سفارش پرداخت دانلود دسترسی سبد خرید',
    answer_text:
      'برای خرید در {siteTitle} کافی است محصول یا خدمت مورد نظرتان را به سبد خرید اضافه کنید، با شماره موبایل و کد تایید وارد شوید و از درگاه بانکی امن تسویه کنید. بلافاصله پس از پرداخت، دسترسی و فایل‌ها در «پیشخوان کاربری» شما فعال می‌شود.',
    category: 'faq',
  },
  {
    id: 'kb_seed_otp_signup',
    question_pattern: 'نحوه ثبت‌نام و ورود با شماره موبایل و کد تایید OTP',
    normalized_keywords: 'ثبت نام ورود حساب کاربری موبایل کد تایید otp رمز یکبار مصرف عضویت',
    answer_text:
      'ثبت‌نام و ورود در {siteTitle} بسیار سریع و فقط با شماره موبایل و کد تایید یک‌بارمصرف (OTP) انجام می‌شود؛ نیازی به رمز عبور پیچیده نیست. همین داخل چت یا از دکمه «ورود / عضویت» بالای صفحه می‌توانید در چند ثانیه وارد شوید.',
    category: 'faq',
  },
  {
    id: 'kb_seed_custom_request',
    question_pattern: 'ثبت درخواست اختصاصی، مشاوره یا سفارش سفارشی',
    normalized_keywords: 'درخواست اختصاصی مشاوره سفارش سفارشی فرم تماس همکاری پیگیری',
    answer_text:
      'با کمال میل درخواست اختصاصی شما را برای تیم {siteTitle} ثبت می‌کنیم تا بررسی و با شما تماس گرفته شود. برای ثبت رسمی و دریافت کد پیگیری، لطفاً شماره موبایل خود را در کادر زیر تایید کنید.',
    category: 'faq',
  },
  {
    id: 'kb_seed_invoice_payment',
    question_pattern: 'فاکتور رسمی، امنیت پرداخت و درگاه بانکی',
    normalized_keywords: 'فاکتور رسمی رسید پرداخت درگاه بانکی شاپرک امن اعتماد ضمانت',
    answer_text:
      'تمامی پرداخت‌ها در {siteTitle} از طریق درگاه بانکی امن انجام می‌شود و بلافاصله پس از تکمیل سفارش، فاکتور رسمی و جزئیات تراکنش در بخش «سفارش‌های من» در پیشخوان کاربری قابل مشاهده و چاپ است.',
    category: 'faq',
  },
  {
    id: 'kb_seed_support_tracking',
    question_pattern: 'پشتیبانی و پیگیری وضعیت سفارش',
    normalized_keywords: 'پشتیبانی پیگیری سفارش کد پیگیری مشکل خرید تماس پاسخگویی',
    answer_text:
      'تیم پشتیبانی {siteTitle} به‌صورت آنلاین در کنار شماست. برای پیگیری سریع سفارش یا فعال‌سازی اولویت فوری، کافی است با شماره موبایل وارد حساب کاربری شوید تا وضعیت سفارش‌های شما فوری بررسی شود.',
    category: 'faq',
  },
  {
    id: 'kb_seed_about_site',
    question_pattern: 'درباره سایت و خدمات این مجموعه',
    normalized_keywords: 'درباره سایت معرفی مجموعه خدمات محصولات چیه فعالیت',
    answer_text:
      'شما در وب‌سایت رسمی {siteTitle} هستید. می‌توانید فهرست کامل محصولات، خدمات و مقالات آموزشی ما را در صفحه اصلی و منوی دسته‌بندی‌ها مشاهده کنید یا موضوع مورد نظرتان را همینجا بپرسید تا بهترین گزینه را به شما معرفی کنم.',
    category: 'catalog',
  },
];

export async function seedDefaultKnowledgeCache(): Promise<void> {
  const countRows = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_ai_knowledge_cache'
  ).catch(() => [{ cnt: 0 }]);
  if (Number(countRows[0]?.cnt || 0) > 0) return;

  const nowIso = new Date().toISOString();
  for (const item of DEFAULT_ZERO_TOKEN_SEEDS) {
    await dbExec(
      `INSERT INTO mod_ai_knowledge_cache
       (id, question_pattern, normalized_keywords, answer_text, category, status, hit_count, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', 0, 'seed', $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        item.id,
        item.question_pattern,
        item.normalized_keywords,
        item.answer_text,
        item.category,
        nowIso,
        nowIso,
      ]
    );
  }
}

function computeKeywordMatchScore(
  msgNorm: string,
  msgTokens: string[],
  row: KnowledgeCacheRow
): number {
  const patternNorm = normalizePersianText(row.question_pattern);
  if (msgNorm === patternNorm && msgNorm.length >= 2) return 1.0;

  // Exact short greetings/thanks check
  if (row.id === 'kb_seed_greeting' && EXACT_GREETING_PHRASES.has(msgNorm)) {
    return 0.98;
  }
  if (row.id === 'kb_seed_thanks' && EXACT_THANKS_PHRASES.has(msgNorm)) {
    return 0.98;
  }

  // Never match a greeting entry when the user also asked a real question (> 4 words)
  if (row.category === 'greeting' && msgNorm.split(' ').length > 4) {
    return 0;
  }

  const rowKwTokens = extractNormalizedTokens(
    `${row.question_pattern} ${row.normalized_keywords}`
  );
  if (msgTokens.length === 0 || rowKwTokens.length === 0) return 0;

  // For single-token non-greeting messages, require exact pattern equality to avoid false positives
  if (msgTokens.length === 1 && row.category !== 'greeting') {
    return patternNorm === msgNorm ? 0.95 : 0;
  }

  const rowKwSet = new Set(rowKwTokens);
  let matchedUserTokens = 0;
  for (const tok of msgTokens) {
    if (rowKwSet.has(tok)) {
      matchedUserTokens += 1;
    } else if (tok.length >= 4 && rowKwTokens.some((rk) => rk.length >= 4 && (rk.includes(tok) || tok.includes(rk)))) {
      matchedUserTokens += 0.75;
    }
  }

  // Coverage of user message tokens + overlap with pattern tokens
  const userCoverage = matchedUserTokens / msgTokens.length;
  const patternTokens = extractNormalizedTokens(row.question_pattern);
  let patternHits = 0;
  const msgSet = new Set(msgTokens);
  for (const pt of patternTokens) {
    if (msgSet.has(pt)) patternHits += 1;
  }
  const patternCoverage = patternTokens.length > 0 ? patternHits / patternTokens.length : 0;

  // For multi-word queries, require at least 2 meaningful token hits unless pattern coverage is very high
  if (matchedUserTokens < 1.5 && patternCoverage < 0.75) {
    return 0;
  }

  // Blend user coverage (65%) and pattern coverage (35%) with bonus when full normalized pattern is contained
  let score = userCoverage * 0.65 + patternCoverage * 0.35;
  if (patternNorm.length >= 8 && msgNorm.includes(patternNorm)) {
    score = Math.max(score, 0.9);
  }
  if (userCoverage >= 0.75 && matchedUserTokens >= 2) {
    score = Math.max(score, 0.76);
  }
  return Math.min(1, score);
}

/**
 * Zero-Token Local Knowledge Base Intercept:
 * Runs BEFORE any paid LLM call. High-confidence matches (>= 0.72) reply instantly with 0 tokens.
 */
export async function matchKnowledgeCache(params: {
  messageText: string;
  siteTitle?: string;
}): Promise<KnowledgeMatchResult> {
  const msgNorm = normalizePersianText(params.messageText);
  if (!msgNorm || msgNorm.length > 220) {
    return { matched: false };
  }

  // Never intercept personal/account/order-specific or catalog-specific product search queries
  const personalOrSpecificRegex =
    /(?:سفارش\s*من|پرداخت\s*من|حساب\s*من|اسم\s*من|نام\s*من|پروفایل\s*من|کد\s*پیگیری\s*[a-z0-9-]+|09\d{9}|موجود\s*دارید|دارید\s*برای|قیمت\s+.{3,})/i;
  if (personalOrSpecificRegex.test(params.messageText)) {
    return { matched: false };
  }

  const rows = await dbQuery<KnowledgeCacheRow>(
    `SELECT * FROM mod_ai_knowledge_cache WHERE status = 'active' ORDER BY hit_count DESC, updated_at DESC LIMIT 120`
  ).catch(() => []);
  if (rows.length === 0) return { matched: false };

  const msgTokens = extractNormalizedTokens(msgNorm);
  let bestRow: KnowledgeCacheRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    const score = computeKeywordMatchScore(msgNorm, msgTokens, row);
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  if (!bestRow || bestScore < 0.72) {
    return { matched: false };
  }

  // Increment hit_count atomically
  await dbExec(
    'UPDATE mod_ai_knowledge_cache SET hit_count = hit_count + 1, updated_at = $1 WHERE id = $2',
    [new Date().toISOString(), bestRow.id]
  ).catch(() => {});

  const resolvedTitle = params.siteTitle || (await getLiveSiteTitleAndDesc()).siteTitle;
  return {
    matched: true,
    entryId: bestRow.id,
    category: bestRow.category,
    score: Number(bestScore.toFixed(2)),
    answerText: interpolateSiteVars(bestRow.answer_text, resolvedTitle),
    triggerOtpForGuest: bestRow.id === 'kb_seed_custom_request',
    tokenSaved: true,
  };
}

/**
 * Strict PII & Security Sanitizer for Safe Self-Learning Cache:
 * Rejects any Q&A containing phone numbers, emails, secrets/tokens, order/tracking IDs,
 * internal errors/logs, admin info, or personal user/account references.
 */
export function isSafeForKnowledgeCache(question: string, answer: string): {
  safe: boolean;
  reason?: string;
} {
  const q = String(question || '').trim();
  const a = String(answer || '').trim();
  if (q.length < 6 || q.length > 180) {
    return { safe: false, reason: 'question_length_out_of_bounds' };
  }
  if (a.length < 20 || a.length > 620) {
    return { safe: false, reason: 'answer_length_out_of_bounds' };
  }

  const combined = `${q}\n${a}`;
  const blockedPatterns: { name: string; re: RegExp }[] = [
    { name: 'iran_mobile', re: /(?:\+98|0098|0)?9\d{9}/ },
    { name: 'persian_digits_phone', re: /[۰-۹]{10,11}/ },
    { name: 'email', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
    { name: 'secret_token', re: /(?:sk-[a-z0-9]{10,}|AIza[a-z0-9_-]{12,}|Bearer\s+[a-z0-9._-]{10,}|\d{6,}:[A-Za-z0-9_-]{15,}|api[_-]?key|client[_-]?secret|password|رمز\s*عبور)/i },
    { name: 'order_or_tracking_id', re: /(?:ORD|REQ|TRK|REF|SUB|INV|TKT)[-_]?[A-Z0-9]{4,}/i },
    { name: 'session_or_internal_id', re: /(?:chat_sess_|appr_|skill_|mem_|mod_ai_|system_logs|super_admin)/i },
    { name: 'system_error', re: /(?:HTTP\s*5\d\d|HTTP\s*40[13]|SQLITE_|ECONNREFUSED|stack\s*trace|خطای\s*داخلی|عدم\s*اتصال\s*موقت)/i },
    { name: 'personal_query', re: /(?:سفارش\s*من|پرداخت\s*من|حساب\s*من|پروفایل\s*من|اسم\s*من|نام\s*من|شماره\s*من|کد\s*پیگیری\s*شما|عزیز،?\s*نام\s*شما|خوشبختم)/i },
    { name: 'card_or_national_id', re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/ },
  ];

  for (const rule of blockedPatterns) {
    if (rule.re.test(combined)) {
      return { safe: false, reason: rule.name };
    }
  }
  return { safe: true };
}

/**
 * Safely learns a clean, general, non-personal Q&A pair from the LLM into `mod_ai_knowledge_cache`.
 * Defaults to `pending_review` unless Super Admin explicitly switches `kbAutoLearnMode` to `auto_active`.
 */
export async function tryLearnToKnowledgeCache(params: {
  question: string;
  answer: string;
  autoLearnMode: 'pending_review' | 'auto_active';
}): Promise<{ saved: boolean; id?: string; status?: KnowledgeCacheStatus; reason?: string }> {
  const check = isSafeForKnowledgeCache(params.question, params.answer);
  if (!check.safe) {
    return { saved: false, reason: check.reason };
  }

  const qNorm = normalizePersianText(params.question);
  const qTokens = extractNormalizedTokens(qNorm);
  if (qTokens.length < 2) {
    return { saved: false, reason: 'too_few_keywords' };
  }

  // Deduplicate against existing entries (both active and pending_review)
  const existing = await dbQuery<KnowledgeCacheRow>(
    `SELECT * FROM mod_ai_knowledge_cache WHERE status IN ('active', 'pending_review') LIMIT 150`
  ).catch(() => []);
  for (const row of existing) {
    const score = computeKeywordMatchScore(qNorm, qTokens, row);
    if (score >= 0.78) {
      return { saved: false, reason: 'duplicate_existing_entry' };
    }
  }

  const nowIso = new Date().toISOString();
  const id = `kb_learn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const status: KnowledgeCacheStatus =
    params.autoLearnMode === 'auto_active' ? 'active' : 'pending_review';

  await dbExec(
    `INSERT INTO mod_ai_knowledge_cache
     (id, question_pattern, normalized_keywords, answer_text, category, status, hit_count, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'auto_learned', $5, 0, 'ai_learned', $6, $7)`,
    [
      id,
      params.question.trim().slice(0, 180),
      qTokens.join(' '),
      params.answer.trim().slice(0, 620),
      status,
      nowIso,
      nowIso,
    ]
  );

  return { saved: true, id, status };
}

export async function listKnowledgeCache(): Promise<KnowledgeCacheRow[]> {
  return dbQuery<KnowledgeCacheRow>(
    `SELECT * FROM mod_ai_knowledge_cache
     ORDER BY CASE status WHEN 'pending_review' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
              hit_count DESC, updated_at DESC LIMIT 200`
  ).catch(() => []);
}

export async function getKnowledgeCacheStats(): Promise<{
  totalEntries: number;
  activeCount: number;
  pendingCount: number;
  disabledCount: number;
  totalHits: number;
  estimatedTokensSaved: number;
}> {
  const rows = await listKnowledgeCache();
  let activeCount = 0;
  let pendingCount = 0;
  let disabledCount = 0;
  let totalHits = 0;
  for (const r of rows) {
    if (r.status === 'active') activeCount += 1;
    else if (r.status === 'pending_review') pendingCount += 1;
    else disabledCount += 1;
    totalHits += Number(r.hit_count || 0);
  }
  return {
    totalEntries: rows.length,
    activeCount,
    pendingCount,
    disabledCount,
    totalHits,
    // Conservative estimate: ~1,200 tokens (system prompt + skills + reply) saved per zero-token cache hit
    estimatedTokensSaved: totalHits * 1200,
  };
}

export async function upsertKnowledgeCacheEntry(params: {
  id?: string;
  questionPattern: string;
  normalizedKeywords?: string;
  answerText: string;
  category?: KnowledgeCacheCategory;
  status?: KnowledgeCacheStatus;
  source?: KnowledgeCacheSource;
}): Promise<KnowledgeCacheRow> {
  const nowIso = new Date().toISOString();
  const cleanQuestion = String(params.questionPattern || '').trim().slice(0, 220);
  const cleanAnswer = String(params.answerText || '').trim().slice(0, 1200);
  if (!cleanQuestion || !cleanAnswer) {
    throw new Error('متن سوال (الگو) و پاسخ بانک دانش الزامی است.');
  }
  const cleanKeywords =
    String(params.normalizedKeywords || '').trim() ||
    extractNormalizedTokens(cleanQuestion).join(' ');
  const validCats: KnowledgeCacheCategory[] = ['greeting', 'faq', 'catalog', 'auto_learned'];
  const validStatuses: KnowledgeCacheStatus[] = ['active', 'pending_review', 'disabled'];
  const validSources: KnowledgeCacheSource[] = ['seed', 'admin', 'ai_learned'];

  const category: KnowledgeCacheCategory = validCats.includes(params.category as KnowledgeCacheCategory)
    ? (params.category as KnowledgeCacheCategory)
    : 'faq';
  const status: KnowledgeCacheStatus = validStatuses.includes(params.status as KnowledgeCacheStatus)
    ? (params.status as KnowledgeCacheStatus)
    : 'active';
  const source: KnowledgeCacheSource = validSources.includes(params.source as KnowledgeCacheSource)
    ? (params.source as KnowledgeCacheSource)
    : 'admin';

  const id =
    String(params.id || '').trim() ||
    `kb_admin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const existing = await dbQuery<KnowledgeCacheRow>(
    'SELECT * FROM mod_ai_knowledge_cache WHERE id = $1 LIMIT 1',
    [id]
  );

  if (existing[0]) {
    await dbExec(
      `UPDATE mod_ai_knowledge_cache
       SET question_pattern = $1, normalized_keywords = $2, answer_text = $3,
           category = $4, status = $5, updated_at = $6
       WHERE id = $7`,
      [cleanQuestion, cleanKeywords, cleanAnswer, category, status, nowIso, id]
    );
    return {
      ...existing[0],
      question_pattern: cleanQuestion,
      normalized_keywords: cleanKeywords,
      answer_text: cleanAnswer,
      category,
      status,
      updated_at: nowIso,
    };
  }

  await dbExec(
    `INSERT INTO mod_ai_knowledge_cache
     (id, question_pattern, normalized_keywords, answer_text, category, status, hit_count, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
    [id, cleanQuestion, cleanKeywords, cleanAnswer, category, status, source, nowIso, nowIso]
  );

  return {
    id,
    question_pattern: cleanQuestion,
    normalized_keywords: cleanKeywords,
    answer_text: cleanAnswer,
    category,
    status,
    hit_count: 0,
    source,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export async function updateKnowledgeCacheStatus(
  id: string,
  status: KnowledgeCacheStatus
): Promise<boolean> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;
  await dbExec(
    'UPDATE mod_ai_knowledge_cache SET status = $1, updated_at = $2 WHERE id = $3',
    [status, new Date().toISOString(), cleanId]
  );
  return true;
}

export async function deleteKnowledgeCacheEntry(id: string): Promise<boolean> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;
  await dbExec('DELETE FROM mod_ai_knowledge_cache WHERE id = $1', [cleanId]);
  return true;
}

/**
 * Guest AI Token Quota helpers (persisted per visitor_session_id in mod_ai_agent_memory).
 * Automatically bypassed once the visitor signs in via OTP.
 */
export async function getGuestLlmQuotaUsage(visitorSessionId: string): Promise<number> {
  const sid = String(visitorSessionId || '').trim();
  if (!sid) return 0;
  const rows = await dbQuery<{ memory_value: string }>(
    `SELECT memory_value FROM mod_ai_agent_memory
     WHERE scope_type = 'guest' AND visitor_session_id = $1 AND memory_key = 'guest_llm_turn_count'
     LIMIT 1`,
    [sid]
  ).catch(() => []);
  const n = Number(rows[0]?.memory_value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function incrementGuestLlmQuotaUsage(visitorSessionId: string): Promise<number> {
  const sid = String(visitorSessionId || '').trim();
  if (!sid) return 0;
  const current = await getGuestLlmQuotaUsage(sid);
  const next = current + 1;
  await upsertAgentMemory({
    scopeType: 'guest',
    visitorSessionId: sid,
    memoryKey: 'guest_llm_turn_count',
    memoryValue: String(next),
  }).catch(() => {});
  return next;
}
