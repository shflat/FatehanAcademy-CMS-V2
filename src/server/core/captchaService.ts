import crypto from 'crypto';
import express from 'express';
import { getEnvConfig } from './envConfig.js';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;

function signChallengePayload(payloadB64: string): string {
  const secret = getEnvConfig().permissionHashSecret || 'skill98-captcha-hmac';
  return crypto.createHmac('sha256', `${secret}:captcha-v26`).update(payloadB64).digest('hex');
}

function normalizeDigits(input: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return String(input || '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .replace(/\s+/g, '');
}

function buildOfflineCaptchaSvg(expression: string): string {
  const chars = expression.split('');
  const noiseLines = Array.from({ length: 5 }, (_, idx) => {
    const x1 = crypto.randomInt(2, 35);
    const y1 = crypto.randomInt(6, 48);
    const x2 = crypto.randomInt(145, 196);
    const y2 = crypto.randomInt(6, 48);
    const opacity = (0.2 + idx * 0.05).toFixed(2);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1D4ED8" stroke-width="1.3" opacity="${opacity}"/>`;
  }).join('');

  const noiseDots = Array.from({ length: 18 }, () => {
    const cx = crypto.randomInt(6, 194);
    const cy = crypto.randomInt(6, 48);
    return `<circle cx="${cx}" cy="${cy}" r="1.2" fill="#64748B" opacity="0.45"/>`;
  }).join('');

  const charNodes = chars
    .map((ch, idx) => {
      const x = 18 + idx * 24 + crypto.randomInt(-2, 3);
      const y = 34 + crypto.randomInt(-4, 5);
      const rot = crypto.randomInt(-14, 15);
      const colors = ['#0F172A', '#1D4ED8', '#047857', '#B45309', '#4338CA'];
      const fill = colors[idx % colors.length];
      return `<text x="${x}" y="${y}" fill="${fill}" font-family="monospace, sans-serif" font-size="22" font-weight="800" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="54" viewBox="0 0 200 54" role="img" aria-label="کد امنیتی آفلاین">
  <rect width="200" height="54" rx="10" fill="#F8FAFC"/>
  ${noiseLines}
  ${noiseDots}
  ${charNodes}
</svg>`;
}

export function generateOfflineCaptchaChallenge() {
  const mode = crypto.randomInt(0, 2);
  let expression = '';
  let answer = '';

  if (mode === 0) {
    const a = crypto.randomInt(11, 49);
    const b = crypto.randomInt(3, 19);
    expression = `${a} + ${b} = ?`;
    answer = String(a + b);
  } else {
    const code = String(crypto.randomInt(10421, 98765));
    expression = code;
    answer = code;
  }

  const nonce = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const answerHash = crypto
    .createHash('sha256')
    .update(`${nonce}:${answer}`)
    .digest('hex');

  const payloadB64 = Buffer.from(
    JSON.stringify({ nonce, answerHash, expiresAt }),
    'utf8'
  ).toString('base64url');
  const signature = signChallengePayload(payloadB64);

  const svg = buildOfflineCaptchaSvg(expression);
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

  return {
    token: `${payloadB64}.${signature}`,
    svgDataUrl,
    hintFa: mode === 0 ? 'حاصل جمع را به عدد وارد کنید' : 'عدد ۵ رقمی تصویر را وارد کنید',
    expiresAt,
  };
}

export function verifyCaptchaToken(
  token: string,
  userAnswer: string
): { valid: boolean; reason?: string } {
  const cleanToken = String(token || '').trim();
  const cleanAnswer = normalizeDigits(userAnswer);
  if (!cleanToken || !cleanAnswer) {
    return { valid: false, reason: 'لطفاً پاسخ کپچای امنیتی را وارد کنید.' };
  }

  const parts = cleanToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'توکن کپچا نامعتبر است.' };
  }
  const [payloadB64, providedSig] = parts;
  const expectedSig = signChallengePayload(payloadB64);
  const sigA = Buffer.from(providedSig, 'utf8');
  const sigB = Buffer.from(expectedSig, 'utf8');
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return { valid: false, reason: 'امضای امنیتی کپچا معتبر نیست.' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      nonce: string;
      answerHash: string;
      expiresAt: number;
    };
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      return { valid: false, reason: 'زمان کپچا منقضی شده است؛ لطفاً کد جدید بگیرید.' };
    }
    const candidateHash = crypto
      .createHash('sha256')
      .update(`${parsed.nonce}:${cleanAnswer}`)
      .digest('hex');
    if (candidateHash !== parsed.answerHash) {
      return { valid: false, reason: 'پاسخ کپچای امنیتی نادرست است.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'ساختار توکن کپچا آسیب دیده است.' };
  }
}

export function createCaptchaRouter() {
  const router = express.Router();

  router.get('/api/v1/captcha/challenge', (_req, res) => {
    const challenge = generateOfflineCaptchaChallenge();
    res.json({ ok: true, ...challenge });
  });

  router.post('/api/v1/captcha/verify', (req, res) => {
    const { token, answer } = req.body as { token?: string; answer?: string };
    const result = verifyCaptchaToken(String(token || ''), String(answer || ''));
    if (!result.valid) {
      res.status(400).json({ ok: false, error: result.reason });
      return;
    }
    res.json({ ok: true, verified: true });
  });

  return router;
}
