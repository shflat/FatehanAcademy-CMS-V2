import dns from 'dns/promises';
import net from 'net';
import { GoogleGenAI } from '@google/genai';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { getEnvConfig } from '../../src/server/core/envConfig.js';
import { optimizeAndStoreImageBuffer } from '../../core/agents/media-optimizer.js';
import { getAiHubSettings } from './aiHubSchema.js';
import { generateTextViaSlot, getSlotConfig } from './aiProviderGateway.js';
import type { AgentToolContext, ExecutedToolRecord } from './agentToolCallingEngine.js';

const MAX_FETCH_BYTES = 512 * 1024; // 512 KB cap for public URL scraping
const MAX_FETCH_REDIRECTS = 3;

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // Link-local / Cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // Private RFC1918
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  if (a === 192 && b === 168) return true; // Private RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmark
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

function isPrivateOrReservedIp(ipRaw: string): boolean {
  const ip = String(ipRaw || '').trim().toLowerCase();
  if (!ip) return true;
  const family = net.isIP(ip);
  if (family === 4) return isPrivateOrReservedIpv4(ip);
  if (family === 6) {
    if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // ULA
    if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
      return true; // Link-local
    }
    const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Mapped?.[1]) return isPrivateOrReservedIpv4(v4Mapped[1]);
    return false;
  }
  return true;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('آدرس URL واردشده معتبر نیست.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('فقط آدرس‌های عمومی با پروتکل http یا https مجاز هستند.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('آدرس‌های دارای نام کاربری یا رمز عبور در URL مجاز نیستند.');
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'metadata'
  ) {
    throw new Error('دسترسی به آدرس‌های داخلی، محلی یا متادیتای ابری مسدود است.');
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error('دسترسی به آی‌پی‌های خصوصی یا لوکال مجاز نیست.');
    }
    return parsed;
  }

  let addresses: { address: string }[] = [];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`امکان شناسایی دامنه (${host}) از طریق DNS وجود ندارد.`);
  }
  if (addresses.length === 0) {
    throw new Error(`آدرسی برای دامنه (${host}) یافت نشد.`);
  }
  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr.address)) {
      throw new Error('این دامنه به شبکه داخلی یا خصوصی اشاره دارد و درخواست مسدود شد.');
    }
  }
  return parsed;
}

function normalizeGithubBlobToRaw(urlStr: string): string {
  const m = urlStr.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (m) {
    return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
  }
  return urlStr;
}

function stripHtmlToCleanText(raw: string): string {
  return String(raw || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchPublicSourceText(rawUrl: string): Promise<{
  text: string;
  finalUrl: string;
  contentType: string;
}> {
  let currentUrl = normalizeGithubBlobToRaw(String(rawUrl || '').trim());

  for (let hop = 0; hop <= MAX_FETCH_REDIRECTS; hop++) {
    const safeUrl = await assertSafePublicUrl(currentUrl);
    const resp = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Skill98-CMS-ContentBot/2.9 (+public-fetch)',
        Accept: 'text/markdown, text/plain, text/html, application/json;q=0.8',
      },
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (!location) {
        throw new Error(`ریدایرکت نامعتبر از مبدا (HTTP ${resp.status})`);
      }
      if (hop === MAX_FETCH_REDIRECTS) {
        throw new Error('تعداد ریدایرکت‌های آدرس بیش از حد مجاز است.');
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    if (!resp.ok) {
      throw new Error(`دریافت محتوا از لینک ناموفق بود (HTTP ${resp.status}).`);
    }

    const contentType = String(resp.headers.get('content-type') || 'text/plain').toLowerCase();
    if (
      !contentType.includes('text/') &&
      !contentType.includes('json') &&
      !contentType.includes('xml') &&
      !contentType.includes('markdown')
    ) {
      throw new Error(`نوع محتوای لینک (${contentType.split(';')[0]}) متنی یا قابل خواندن نیست.`);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    const sliced = buf.length > MAX_FETCH_BYTES ? buf.subarray(0, MAX_FETCH_BYTES) : buf;
    const rawText = sliced.toString('utf-8');
    const cleanText = contentType.includes('html') ? stripHtmlToCleanText(rawText) : rawText.trim();

    return {
      text: cleanText.slice(0, 12000),
      finalUrl: safeUrl.toString(),
      contentType,
    };
  }

  throw new Error('دریافت محتوا از لینک به پایان نرسید.');
}

function sanitizeGeneratedHtml(rawHtml: string): string {
  return String(rawHtml || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim();
}

function sanitizeAsciiSlug(raw: string, fallbackPrefix: string): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
  return cleaned.length >= 3 ? cleaned : `${fallbackPrefix}-${Date.now().toString(36)}`;
}

async function ensureUniqueSlug(table: 'products' | 'articles', desiredSlug: string): Promise<string> {
  let candidate = desiredSlug;
  for (let i = 0; i < 6; i++) {
    const rows = await dbQuery<{ id: string }>(
      table === 'products'
        ? 'SELECT id FROM products WHERE slug = $1 LIMIT 1'
        : 'SELECT id FROM articles WHERE slug = $1 LIMIT 1',
      [candidate]
    ).catch(() => []);
    if (rows.length === 0) return candidate;
    candidate = `${desiredSlug}-${Math.random().toString(36).slice(2, 5)}`;
  }
  return `${desiredSlug}-${Date.now().toString(36).slice(-4)}`;
}

function parseJsonObjectLoose(raw: string): Record<string, unknown> {
  const trimmed = String(raw || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] || trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // fallback below
      }
    }
  }
  return {};
}

function clampSeoText(val: string, fallback: string, maxLen: number): string {
  const clean = String(val || '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback.slice(0, maxLen);
  return clean.slice(0, maxLen);
}

/**
 * Generates a cover image via AI Hub Slot 2 (`image_visual`), optimizes it to WebP
 * inside UPLOAD_DIR via `media-optimizer.js`, and registers it in `media_items`.
 * Gracefully returns empty URL + note if Slot 2 is unconfigured or errors.
 */
export async function generateAndOptimizeWebpCover(params: {
  promptEn: string;
  slug: string;
  titleFa: string;
  category: 'product' | 'article';
}): Promise<{ imageUrl: string; note?: string }> {
  const imgSlot = await getSlotConfig('image_visual');
  if (imgSlot && !imgSlot.enabled) {
    return { imageUrl: '', note: 'اسلات ۲ تصویر غیرفعال است؛ ذخیره بدون کاور انجام شد.' };
  }

  const provider = imgSlot?.provider_kind || 'gemini';
  const model = (imgSlot?.model_name || '').trim() || 'gemini-3.1-flash-lite-image';
  const savedKey = imgSlot?.api_key_enc ? decryptSecret(imgSlot.api_key_enc) : '';
  const apiKey =
    savedKey ||
    (provider === 'gemini'
      ? (process.env.GEMINI_API_KEY || '').trim() || getEnvConfig().geminiApiKey || ''
      : (process.env.OPENAI_API_KEY || '').trim());

  if (!apiKey) {
    return {
      imageUrl: '',
      note: 'کلید API اسلات ۲ تصویر تنظیم نشده است؛ محتوا بدون تصویر کاور ذخیره شد.',
    };
  }

  let imgBuffer: Buffer | null = null;
  let mimeType = 'image/png';

  try {
    if (provider === 'openai_compatible' && imgSlot?.base_url) {
      const safeBase = await assertSafePublicUrl(imgSlot.base_url);
      const endpoint = `${safeBase.toString().replace(/\/+$/, '')}/images/generations`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(45000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: params.promptEn,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        data?: { b64_json?: string; url?: string }[];
      };
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        imgBuffer = Buffer.from(b64, 'base64');
        mimeType = 'image/png';
      } else if (data.data?.[0]?.url) {
        const safeImgUrl = await assertSafePublicUrl(data.data[0].url);
        const imgResp = await fetch(safeImgUrl.toString(), { signal: AbortSignal.timeout(20000) });
        if (imgResp.ok) {
          imgBuffer = Buffer.from(await imgResp.arrayBuffer());
          mimeType = imgResp.headers.get('content-type')?.split(';')[0] || 'image/png';
        }
      }
    } else if (provider === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const resp = await ai.models.generateContent({
        model,
        contents: params.promptEn,
        config: { responseModalities: ['IMAGE'] },
      });
      const parts = resp.candidates?.[0]?.content?.parts || [];
      const inlinePart = parts.find((p) => p.inlineData?.data);
      if (inlinePart?.inlineData?.data) {
        imgBuffer = Buffer.from(inlinePart.inlineData.data, 'base64');
        mimeType = inlinePart.inlineData.mimeType || 'image/png';
      }
    }
  } catch (err) {
    return {
      imageUrl: '',
      note: `تولید تصویر با اسلات ۲ ناموفق بود (${err instanceof Error ? err.message.slice(0, 120) : 'خطا'})؛ آیتم بدون تصویر ذخیره شد.`,
    };
  }

  if (!imgBuffer || imgBuffer.length < 128) {
    return { imageUrl: '', note: 'تصویری از اسلات ۲ دریافت نشد؛ آیتم بدون کاور ذخیره شد.' };
  }

  try {
    const optimized = await optimizeAndStoreImageBuffer({
      buffer: imgBuffer,
      mimeType,
      baseName: `jarvis-${params.slug}`,
    });

    const mediaId = `med_jarvis_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const nowIso = new Date().toISOString();
    const mediaPayload = {
      id: mediaId,
      title: params.titleFa,
      url: optimized.url,
      variants: optimized.variants,
      mediaType: 'image',
      mimeType: 'image/webp',
      altText: params.titleFa,
      caption: `تصویر کاور WebP ساخته‌شده توسط جارویس برای ${params.titleFa}`,
      seoTitle: params.titleFa.slice(0, 62),
      seoDescription: `کاور اختصاصی WebP برای ${params.titleFa}`.slice(0, 155),
      seoKeywords: params.slug.replace(/-/g, ', '),
      dimensionsLabel: 'WebP 4-Size Optimized',
      category: params.category === 'product' ? 'product_poster' : 'article_cover',
      createdAtLabel: formatPersianDateTime(),
    };
    await dbExec(
      `INSERT INTO media_items (id, title, url, category, payload_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [mediaId, params.titleFa, optimized.url, params.category, JSON.stringify(mediaPayload), nowIso]
    ).catch(() => {});

    return { imageUrl: optimized.url };
  } catch (err) {
    return {
      imageUrl: '',
      note: `خطا در بهینه‌سازی WebP تصویر (${err instanceof Error ? err.message : 'نامشخص'})؛ آیتم بدون تصویر ذخیره شد.`,
    };
  }
}

function buildFallbackSeoPack(params: {
  sourceText: string;
  targetType: 'product' | 'article';
  sourceUrl?: string;
}): {
  title: string;
  slug: string;
  summary: string;
  fullHtmlContent: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  imagePrompt: string;
  faq: { q: string; a: string }[];
  category: string;
} {
  const firstHeading =
    params.sourceText.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    params.sourceText.split('\n').find((l) => l.trim().length > 6)?.trim() ||
    (params.targetType === 'product' ? 'اسکیل تخصصی جدید هوش مصنوعی' : 'مقاله تخصصی جدید هوش مصنوعی');
  const cleanTitle = firstHeading.replace(/[#*_`]/g, '').trim().slice(0, 75);
  const summary = params.sourceText
    .replace(/[#*_`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  const faq = [
    {
      q: `این ${params.targetType === 'product' ? 'اسکیل/محصول' : 'راهنما'} برای چه افرادی مناسب است؟`,
      a: `برای تیم‌های فنی، توسعه‌دهندگان و مدیران وب‌سایت که به دنبال بهره‌وری بیشتر با ${cleanTitle} هستند.`,
    },
    {
      q: 'نحوه استفاده و پیاده‌سازی چگونه است؟',
      a: 'پس از بررسی راهنما و ساختار مستند، می‌توانید گام‌به‌گام آن را در پروژه خود فعال کنید.',
    },
  ];
  const escapedBody = params.sourceText
    .slice(0, 3500)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return {
    title: cleanTitle,
    slug: sanitizeAsciiSlug(cleanTitle, params.targetType),
    summary: summary || cleanTitle,
    fullHtmlContent: `<article dir="rtl"><h2>معرفی ${cleanTitle}</h2><p>${summary}</p><div>${escapedBody}</div><h3>سوالات متداول (FAQ)</h3><ul>${faq
      .map((f) => `<li><strong>${f.q}</strong><p>${f.a}</p></li>`)
      .join('')}</ul></article>`,
    seoTitle: `${cleanTitle} | اسکیل ۹۸`.slice(0, 62),
    seoDescription: `${summary || cleanTitle} — بررسی کامل، کاربردها و سوالات متداول.`.slice(0, 155),
    tags: ['هوش مصنوعی', 'اسکیل ۹۸', params.targetType === 'product' ? 'اسکیل آماده' : 'مقاله تخصصی'],
    imagePrompt: `Editorial minimalist 3D studio hero illustration for "${cleanTitle}", modern Iranian tech SaaS aesthetic, cobalt blue and obsidian glass lighting, ultra crisp, no text, no watermark`,
    faq,
    category: params.targetType === 'product' ? 'Claude' : 'مهندسی هوش مصنوعی',
  };
}

/**
 * Tool 14.2.1: `skill_to_product`
 * Converts a .md file, public URL, or notes into a full Persian SEO Product or Article + WebP cover.
 */
export async function runSkillToProductTool(
  args: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<ExecutedToolRecord> {
  const toolName = 'skill_to_product';
  if (ctx.actorRole !== 'super_admin') {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: 'دسترسی رد شد: ابزار skill_to_product فقط مخصوص سوپر ادمین است.',
    };
  }

  const settings = await getAiHubSettings();
  if (!settings.jarvisSettings?.allowSkillToProduct) {
    return {
      tool: toolName,
      args,
      ok: false,
      summary:
        'کلید «تبدیل اسکیل/لینک به محصول و مقاله» (allowSkillToProduct) در تنظیمات دستیار جارویس خاموش است. لطفاً ابتدا از بخش هاب هوش مصنوعی ← مرکز فرماندهی ۲۴/۷ ← تنظیمات دستیار جارویس این کلید را روشن کنید.',
    };
  }

  const targetType: 'product' | 'article' = args.targetType === 'article' ? 'article' : 'product';
  const publishMode: 'draft' | 'published' =
    args.publishMode === 'published' ? 'published' : 'draft';
  const priceToman = Math.max(0, Math.round(Number(args.priceToman || 0) || 0));
  const generateCoverImage = args.generateCoverImage !== false;
  const sourceUrl = typeof args.sourceUrl === 'string' ? args.sourceUrl.trim() : '';
  const rawMarkdownOrNotes =
    typeof args.rawMarkdownOrNotes === 'string' ? args.rawMarkdownOrNotes.trim() : '';

  let fetchedText = '';
  let fetchedUrl = '';
  if (sourceUrl) {
    try {
      const fetched = await fetchPublicSourceText(sourceUrl);
      fetchedText = fetched.text;
      fetchedUrl = fetched.finalUrl;
    } catch (err) {
      return {
        tool: toolName,
        args,
        ok: false,
        summary: `خطا در خواندن آدرس منبع: ${err instanceof Error ? err.message : 'لینک نامعتبر'}`,
      };
    }
  }

  const combinedSource = [
    fetchedUrl ? `Source URL: ${fetchedUrl}\n${fetchedText}` : '',
    rawMarkdownOrNotes ? `Uploaded Markdown / Notes:\n${rawMarkdownOrNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')
    .slice(0, 16000);

  if (combinedSource.trim().length < 12) {
    return {
      tool: toolName,
      args,
      ok: false,
      summary:
        'لطفاً حداقل یک آدرس عمومی (sourceUrl)، فایل .md آپلودشده یا توضیح متنی (rawMarkdownOrNotes) ارائه دهید.',
    };
  }

  const fallback = buildFallbackSeoPack({
    sourceText: combinedSource,
    targetType,
    sourceUrl: fetchedUrl,
  });

  let seoPack = fallback;
  let slot1Used = 'fallback';
  try {
    const slotRes = await generateTextViaSlot({
      slot: 'text_seo',
      jsonMode: true,
      systemPrompt: `You are an elite Iranian Persian-First SEO Editor & Product Architect for Skill 98 / DPATech CMS.
Transform the provided source (.md / URL / notes) into a complete, authentic Persian ${
        targetType === 'product' ? 'Digital Skill Product' : 'Technical Editorial Article'
      }.
Return ONLY a valid JSON object with these exact keys:
{
  "title": "عنوان جذاب و حرفه‌ای فارسی (حداکثر ۷۵ کاراکتر)",
  "slug": "clean-lowercase-english-url-slug",
  "category": "${targetType === 'product' ? 'Claude | ChatGPT | Codex' : 'مهندسی هوش مصنوعی | آموزش | سئو و محتوا'}",
  "summary": "چکیده فارسی روان و دقیق (۱۴۰ تا ۲۴۰ کاراکتر)",
  "fullHtmlContent": "متن جامع فارسی با تگ‌های h2, h3, p, ul, li, strong و حتماً یک بخش <h2>سوالات متداول (FAQ)</h2> با حداقل ۳ پرسش و پاسخ واقعی",
  "seoTitle": "عنوان سئو فارسی دقیقاً بین ۴۵ تا ۶۲ کاراکتر",
  "seoDescription": "توضیحات متا فارسی ترغیب‌کننده دقیقاً بین ۱۲۵ تا ۱۵۵ کاراکتر",
  "tags": ["تگ ۱", "تگ ۲", "تگ ۳", "تگ ۴"],
  "faq": [{"q": "سوال فارسی", "a": "پاسخ فارسی"}],
  "imagePrompt": "Rich English visual art-direction prompt for a modern 16:9 WebP cover illustration, studio lighting, zero text, zero watermark"
}`,
      userPrompt: combinedSource,
    });
    const parsed = parseJsonObjectLoose(slotRes.text);
    const parsedFaq = Array.isArray(parsed.faq)
      ? parsed.faq
          .filter((x): x is { q?: string; a?: string } => Boolean(x && typeof x === 'object'))
          .map((x) => ({ q: String(x.q || '').trim(), a: String(x.a || '').trim() }))
          .filter((x) => x.q && x.a)
      : fallback.faq;
    const parsedTags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 8)
      : fallback.tags;

    seoPack = {
      title: clampSeoText(String(parsed.title || ''), fallback.title, 90),
      slug: sanitizeAsciiSlug(String(parsed.slug || ''), targetType),
      category:
        String(args.category || parsed.category || fallback.category).trim().slice(0, 60) ||
        fallback.category,
      summary: clampSeoText(String(parsed.summary || ''), fallback.summary, 320),
      fullHtmlContent:
        sanitizeGeneratedHtml(String(parsed.fullHtmlContent || '')) || fallback.fullHtmlContent,
      seoTitle: clampSeoText(String(parsed.seoTitle || ''), fallback.seoTitle, 62),
      seoDescription: clampSeoText(
        String(parsed.seoDescription || ''),
        fallback.seoDescription,
        155
      ),
      tags: parsedTags.length > 0 ? parsedTags : fallback.tags,
      faq: parsedFaq.length > 0 ? parsedFaq : fallback.faq,
      imagePrompt: clampSeoText(String(parsed.imagePrompt || ''), fallback.imagePrompt, 420),
    };
    slot1Used = `${slotRes.providerUsed}/${slotRes.modelUsed}`;
  } catch {
    // Gracefully keep deterministic Persian SEO pack if Slot 1 is unconfigured
  }

  const finalSlug = await ensureUniqueSlug(
    targetType === 'product' ? 'products' : 'articles',
    seoPack.slug
  );

  let coverImageUrl = '';
  let coverNote: string | undefined;
  if (generateCoverImage) {
    const coverRes = await generateAndOptimizeWebpCover({
      promptEn: seoPack.imagePrompt,
      slug: finalSlug,
      titleFa: seoPack.title,
      category: targetType,
    });
    coverImageUrl = coverRes.imageUrl;
    coverNote = coverRes.note;
  }

  const nowIso = new Date().toISOString();
  const nowFa = formatPersianDateTime();
  const itemId =
    targetType === 'product'
      ? `prod_jarvis_${Date.now().toString(36)}`
      : `art_jarvis_${Date.now().toString(36)}`;

  const faqRowId = `row_faq_${Date.now().toString(36)}`;
  const bodyRowId = `row_body_${Date.now().toString(36)}`;
  const composerRows = [
    {
      id: bodyRowId,
      rowTitle: 'توضیحات جامع و سئو',
      columns: 1 as const,
      backgroundStyle: 'default' as const,
      widgets: [
        {
          id: `w_html_${Date.now().toString(36)}`,
          widgetType: 'rich_text' as const,
          title: seoPack.title,
          content: seoPack.fullHtmlContent,
          colSpan: 1 as const,
        },
      ],
    },
    ...(seoPack.faq.length > 0
      ? [
          {
            id: faqRowId,
            rowTitle: 'سوالات متداول (FAQ)',
            columns: 1 as const,
            backgroundStyle: 'muted' as const,
            widgets: [
              {
                id: `w_faq_${Date.now().toString(36)}`,
                widgetType: 'faq_accordion' as const,
                title: 'سوالات متداول',
                content: seoPack.faq.map((f) => `${f.q}\n${f.a}`).join('\n\n'),
                colSpan: 1 as const,
                configJson: { items: seoPack.faq },
              },
            ],
          },
        ]
      : []),
  ];

  if (targetType === 'product') {
    const validProdCat = ['Claude', 'ChatGPT', 'Codex'].includes(seoPack.category)
      ? seoPack.category
      : 'Claude';
    const productPayload = {
      id: itemId,
      title: seoPack.title,
      slug: finalSlug,
      category: validProdCat,
      subCategory: seoPack.tags[0] || 'اسکیل هوشمند',
      itemType: 'product' as const,
      price: priceToman,
      originalPrice: priceToman > 0 ? Math.round(priceToman * 1.2) : 0,
      shortDescription: seoPack.summary,
      modulesCount: Math.max(1, seoPack.faq.length + 1),
      durationHours: 1,
      level: 'حرفه‌ای',
      imageUrl: coverImageUrl,
      imageAlt: seoPack.title,
      featured: false,
      status: publishMode,
      authorId: ctx.userId || 'super_admin',
      version: '1.0.0',
      skillMarkdownContent: rawMarkdownOrNotes || combinedSource.slice(0, 8000),
      githubSourceRepo: fetchedUrl || undefined,
      seoTitle: seoPack.seoTitle,
      seoDescription: seoPack.seoDescription,
      seoKeywords: seoPack.tags.join('، '),
      deliveryType: 'digital' as const,
      productType: 'downloadable' as const,
      composerRows,
    };

    await dbExec(
      `INSERT INTO products
       (id, slug, title, category, item_type, price, original_price, status, featured, payload_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10)`,
      [
        itemId,
        finalSlug,
        seoPack.title,
        validProdCat,
        'product',
        priceToman,
        productPayload.originalPrice,
        publishMode,
        JSON.stringify(productPayload),
        nowIso,
      ]
    );
  } else {
    const articlePayload = {
      id: itemId,
      title: seoPack.title,
      slug: finalSlug,
      category: seoPack.category || 'مهندسی هوش مصنوعی',
      authorName: 'تحریریه هوشمند اسکیل ۹۸',
      featuredImageUrl: coverImageUrl,
      featuredImageAlt: seoPack.title,
      summary: seoPack.summary,
      bodyMarkdown: `${seoPack.fullHtmlContent}\n\n${
        seoPack.faq.length > 0
          ? `## سوالات متداول\n${seoPack.faq.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}`
          : ''
      }`,
      readingTimeMinutes: Math.max(3, Math.ceil(seoPack.fullHtmlContent.length / 900)),
      publishedDateLabel: nowFa,
      status: publishMode,
      seoTitle: seoPack.seoTitle,
      seoDescription: seoPack.seoDescription,
      seoKeywords: seoPack.tags.join('، '),
      featured: false,
      composerRows,
    };

    await dbExec(
      `INSERT INTO articles
       (id, slug, title, category, status, featured, payload_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
      [
        itemId,
        finalSlug,
        seoPack.title,
        articlePayload.category,
        publishMode,
        JSON.stringify(articlePayload),
        nowIso,
      ]
    );
  }

  const adminEditUrl =
    targetType === 'product'
      ? `/#admin?section=catalog&edit=${itemId}`
      : `/#admin?section=articles&edit=${itemId}`;

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `ساخت خودکار ${targetType === 'product' ? 'محصول' : 'مقاله'} توسط ابزار skill_to_product`,
    detail: `id=${itemId} · slug=${finalSlug} · status=${publishMode} · slot1=${slot1Used} · cover=${coverImageUrl ? 'WebP' : 'none'}`,
    sqlOrEndpoint: 'TOOL skill_to_product',
  });

  return {
    tool: toolName,
    args: { targetType, publishMode, priceToman, hasUrl: Boolean(sourceUrl), generateCoverImage },
    ok: true,
    summary: `${targetType === 'product' ? 'محصول' : 'مقاله'} «${seoPack.title}» با وضعیت «${
      publishMode === 'published' ? 'منتشرشده' : 'پیش‌نویس'
    }» و اسلاگ ${finalSlug} ایجاد شد${coverImageUrl ? ' (همراه با کاور WebP)' : ''}.${
      coverNote ? ` (${coverNote})` : ''
    }`,
    data: {
      id: itemId,
      targetType,
      title: seoPack.title,
      slug: finalSlug,
      status: publishMode,
      priceToman: targetType === 'product' ? priceToman : undefined,
      imageUrl: coverImageUrl || null,
      seoTitle: seoPack.seoTitle,
      seoDescription: seoPack.seoDescription,
      tags: seoPack.tags,
      adminEditUrl,
      coverNote,
    },
  };
}

function isMissingImageUrl(url?: unknown): boolean {
  const s = String(url || '').trim();
  if (!s) return true;
  if (/placeholder|no-image|missing/i.test(s)) return true;
  return false;
}

/**
 * Tool 14.2.2A: `audit_missing_seo_and_media`
 * Scans products & articles for missing cover images, SEO titles, meta descriptions, or short descriptions.
 */
export async function runAuditMissingSeoAndMediaTool(
  args: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<ExecutedToolRecord> {
  const toolName = 'audit_missing_seo_and_media';
  if (ctx.actorRole !== 'super_admin') {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: 'دسترسی رد شد: ابزار ممیزی سئو و رسانه فقط مخصوص سوپر ادمین است.',
    };
  }

  const scope = String(args.targetType || 'all');
  const maxItems = Math.min(40, Math.max(5, Number(args.limit || 25)));

  const [prodRows, artRows] = await Promise.all([
    scope === 'article'
      ? Promise.resolve([])
      : dbQuery<{ id: string; slug: string; title: string; status: string; payload_json: string }>(
          'SELECT id, slug, title, status, payload_json FROM products ORDER BY updated_at DESC'
        ).catch(() => []),
    scope === 'product'
      ? Promise.resolve([])
      : dbQuery<{ id: string; slug: string; title: string; status: string; payload_json: string }>(
          'SELECT id, slug, title, status, payload_json FROM articles ORDER BY updated_at DESC'
        ).catch(() => []),
  ]);

  const findings: {
    targetType: 'product' | 'article';
    id: string;
    title: string;
    slug: string;
    status: string;
    missingFields: string[];
  }[] = [];

  const counts = {
    totalProducts: prodRows.length,
    totalArticles: artRows.length,
    productsWithIssues: 0,
    articlesWithIssues: 0,
    missingCoverImage: 0,
    missingSeoTitle: 0,
    missingSeoDescription: 0,
    missingShortDescription: 0,
  };

  for (const row of prodRows) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json || '{}') as Record<string, unknown>;
    } catch {
      payload = {};
    }
    const missing: string[] = [];
    if (isMissingImageUrl(payload.imageUrl)) {
      missing.push('cover_image');
      counts.missingCoverImage += 1;
    }
    if (String(payload.seoTitle || '').trim().length < 15) {
      missing.push('seo_title');
      counts.missingSeoTitle += 1;
    }
    if (String(payload.seoDescription || '').trim().length < 40) {
      missing.push('seo_description');
      counts.missingSeoDescription += 1;
    }
    if (String(payload.shortDescription || '').trim().length < 20) {
      missing.push('short_description');
      counts.missingShortDescription += 1;
    }
    if (missing.length > 0) {
      counts.productsWithIssues += 1;
      if (findings.length < maxItems) {
        findings.push({
          targetType: 'product',
          id: row.id,
          title: row.title,
          slug: row.slug,
          status: row.status,
          missingFields: missing,
        });
      }
    }
  }

  for (const row of artRows) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json || '{}') as Record<string, unknown>;
    } catch {
      payload = {};
    }
    const missing: string[] = [];
    if (isMissingImageUrl(payload.featuredImageUrl)) {
      missing.push('cover_image');
      counts.missingCoverImage += 1;
    }
    if (String(payload.seoTitle || '').trim().length < 15) {
      missing.push('seo_title');
      counts.missingSeoTitle += 1;
    }
    if (String(payload.seoDescription || '').trim().length < 40) {
      missing.push('seo_description');
      counts.missingSeoDescription += 1;
    }
    if (String(payload.summary || '').trim().length < 20) {
      missing.push('short_description');
      counts.missingShortDescription += 1;
    }
    if (missing.length > 0) {
      counts.articlesWithIssues += 1;
      if (findings.length < maxItems) {
        findings.push({
          targetType: 'article',
          id: row.id,
          title: row.title,
          slug: row.slug,
          status: row.status,
          missingFields: missing,
        });
      }
    }
  }

  const totalIssues = counts.productsWithIssues + counts.articlesWithIssues;
  return {
    tool: toolName,
    args,
    ok: true,
    summary:
      totalIssues === 0
        ? `ممیزی کامل شد: همه ${counts.totalProducts} محصول و ${counts.totalArticles} مقاله دارای تصویر و متاتگ‌های سئوی کامل هستند.`
        : `ممیزی کامل شد: ${counts.productsWithIssues} محصول (از ${counts.totalProducts}) و ${counts.articlesWithIssues} مقاله (از ${counts.totalArticles}) دارای نقص سئو یا تصویر شاخص هستند.`,
    data: {
      counts,
      itemsNeedingFix: findings,
    },
  };
}

/**
 * Tool 14.2.2B: `fix_item_seo_and_media`
 * Fixes missing Persian SEO metadata (Slot 1) and optionally missing WebP cover image (Slot 2) for 1–5 items.
 */
export async function runFixItemSeoAndMediaTool(
  args: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<ExecutedToolRecord> {
  const toolName = 'fix_item_seo_and_media';
  if (ctx.actorRole !== 'super_admin') {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: 'دسترسی رد شد: ابزار اصلاح سئو و رسانه فقط مخصوص سوپر ادمین است.',
    };
  }

  const targetType: 'product' | 'article' = args.targetType === 'article' ? 'article' : 'product';
  const generateMissingImage = args.generateMissingImage !== false;

  const rawIds: string[] = [];
  if (typeof args.itemId === 'string' && args.itemId.trim()) {
    rawIds.push(args.itemId.trim());
  }
  if (Array.isArray(args.itemIds)) {
    for (const v of args.itemIds) {
      const s = String(v || '').trim();
      if (s && !rawIds.includes(s)) rawIds.push(s);
    }
  } else if (typeof args.itemIds === 'string' && args.itemIds.trim()) {
    for (const part of args.itemIds.split(/[,،\s]+/)) {
      const s = part.trim();
      if (s && !rawIds.includes(s)) rawIds.push(s);
    }
  }

  const cappedIds = rawIds.slice(0, 5);
  if (cappedIds.length === 0) {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: 'حداقل یک شناسه (itemId یا itemIds تا ۵ آیتم) برای اصلاح سئو و رسانه الزامی است.',
    };
  }

  const fixedResults: {
    id: string;
    title: string;
    updatedFields: string[];
    imageUrl?: string;
    note?: string;
  }[] = [];

  const nowIso = new Date().toISOString();

  for (const itemId of cappedIds) {
    const rows = await dbQuery<{ id: string; slug: string; title: string; payload_json: string }>(
      targetType === 'product'
        ? 'SELECT id, slug, title, payload_json FROM products WHERE id = $1 OR slug = $1 LIMIT 1'
        : 'SELECT id, slug, title, payload_json FROM articles WHERE id = $1 OR slug = $1 LIMIT 1',
      [itemId]
    ).catch(() => []);

    const row = rows[0];
    if (!row) {
      fixedResults.push({
        id: itemId,
        title: '-',
        updatedFields: [],
        note: 'آیتم در دیتابیس یافت نشد.',
      });
      continue;
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json || '{}') as Record<string, unknown>;
    } catch {
      payload = { id: row.id, slug: row.slug, title: row.title };
    }

    const imageField = targetType === 'product' ? 'imageUrl' : 'featuredImageUrl';
    const descField = targetType === 'product' ? 'shortDescription' : 'summary';

    const needsSeoTitle = String(payload.seoTitle || '').trim().length < 15;
    const needsSeoDesc = String(payload.seoDescription || '').trim().length < 40;
    const needsShortDesc = String(payload[descField] || '').trim().length < 20;
    const needsImage = generateMissingImage && isMissingImageUrl(payload[imageField]);

    const updatedFields: string[] = [];
    let generatedImagePrompt = `Modern editorial minimalist 3D studio cover visual for "${row.title}", Iranian tech SaaS aesthetic, crisp lighting, no text, no watermark`;
    let itemNote: string | undefined;

    if (needsSeoTitle || needsSeoDesc || needsShortDesc || needsImage) {
      const existingContext = [
        `Title: ${row.title}`,
        `Slug: ${row.slug}`,
        `Category: ${String(payload.category || '')}`,
        `Existing Description: ${String(payload[descField] || '')}`,
        `Content excerpt: ${String(
          payload.skillMarkdownContent || payload.bodyMarkdown || ''
        ).slice(0, 1200)}`,
      ].join('\n');

      try {
        const seoRes = await generateTextViaSlot({
          slot: 'text_seo',
          jsonMode: true,
          systemPrompt:
            'You are a Persian SEO specialist. Return ONLY JSON with keys: seoTitle (Persian, 45-62 chars), seoDescription (Persian, 125-155 chars), shortDescription (Persian, 100-200 chars), seoKeywords (comma-separated Persian keywords), imagePrompt (English 16:9 studio cover illustration prompt, no text).',
          userPrompt: existingContext,
        });
        const parsed = parseJsonObjectLoose(seoRes.text);
        if (needsSeoTitle && parsed.seoTitle) {
          payload.seoTitle = clampSeoText(String(parsed.seoTitle), `${row.title} | اسکیل ۹۸`, 62);
          updatedFields.push('seoTitle');
        }
        if (needsSeoDesc && parsed.seoDescription) {
          payload.seoDescription = clampSeoText(
            String(parsed.seoDescription),
            `بررسی کامل و راهنمای تخصصی ${row.title} در اسکیل ۹۸.`,
            155
          );
          updatedFields.push('seoDescription');
        }
        if (needsShortDesc && parsed.shortDescription) {
          payload[descField] = clampSeoText(String(parsed.shortDescription), row.title, 240);
          updatedFields.push(descField);
        }
        if (!payload.seoKeywords && parsed.seoKeywords) {
          payload.seoKeywords = String(parsed.seoKeywords).trim().slice(0, 180);
          updatedFields.push('seoKeywords');
        }
        if (parsed.imagePrompt) {
          generatedImagePrompt = String(parsed.imagePrompt).trim().slice(0, 400);
        }
      } catch {
        // Fallback deterministic Persian SEO values if Slot 1 is offline
        if (needsSeoTitle) {
          payload.seoTitle = `${row.title} | راهنما و بررسی تخصصی اسکیل ۹۸`.slice(0, 62);
          updatedFields.push('seoTitle');
        }
        if (needsSeoDesc) {
          payload.seoDescription =
            `معرفی کامل، کاربردها و راهنمای استفاده از ${row.title} در سامانه اسکیل ۹۸ همراه با استانداردهای روز مهندسی هوش مصنوعی.`.slice(
              0,
              155
            );
          updatedFields.push('seoDescription');
        }
        if (needsShortDesc) {
          payload[descField] = `راهنما و بسته تخصصی «${row.title}» برای پیاده‌سازی حرفه‌ای و سریع.`;
          updatedFields.push(descField);
        }
      }
    }

    if (needsImage) {
      const coverRes = await generateAndOptimizeWebpCover({
        promptEn: generatedImagePrompt,
        slug: row.slug,
        titleFa: row.title,
        category: targetType,
      });
      if (coverRes.imageUrl) {
        payload[imageField] = coverRes.imageUrl;
        if (targetType === 'product' && !payload.imageAlt) payload.imageAlt = row.title;
        if (targetType === 'article' && !payload.featuredImageAlt) {
          payload.featuredImageAlt = row.title;
        }
        updatedFields.push(imageField);
      } else if (coverRes.note) {
        itemNote = coverRes.note;
      }
    }

    if (updatedFields.length > 0) {
      await dbExec(
        targetType === 'product'
          ? 'UPDATE products SET payload_json = $1, updated_at = $2 WHERE id = $3'
          : 'UPDATE articles SET payload_json = $1, updated_at = $2 WHERE id = $3',
        [JSON.stringify(payload), nowIso, row.id]
      );
    }

    fixedResults.push({
      id: row.id,
      title: row.title,
      updatedFields,
      imageUrl: String(payload[imageField] || '') || undefined,
      note:
        updatedFields.length === 0
          ? itemNote || 'همه فیلدهای سئو و تصویر این آیتم از قبل تکمیل بودند.'
          : itemNote,
    });
  }

  const fixedCount = fixedResults.filter((r) => r.updatedFields.length > 0).length;
  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `اصلاح گروهی سئو و رسانه (${fixedCount} از ${cappedIds.length} ${targetType === 'product' ? 'محصول' : 'مقاله'})`,
    detail: fixedResults.map((r) => `${r.id}:[${r.updatedFields.join(',')}]`).join(' | '),
    sqlOrEndpoint: 'TOOL fix_item_seo_and_media',
  });

  return {
    tool: toolName,
    args: { targetType, itemIds: cappedIds, generateMissingImage },
    ok: true,
    summary: `اصلاح سئو و رسانه انجام شد: ${fixedCount} آیتم از ${cappedIds.length} مورد در دیتابیس به‌روزرسانی گردید.`,
    data: {
      targetType,
      processedCount: cappedIds.length,
      updatedCount: fixedCount,
      results: fixedResults,
    },
  };
}
