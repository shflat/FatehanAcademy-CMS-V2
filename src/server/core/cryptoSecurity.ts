import crypto from 'crypto';
import type express from 'express';
import { GoogleGenAI } from '@google/genai';
import { getEnvConfig, normalizeIranPhone } from './envConfig.js';

export { normalizeIranPhone };

let cachedAiClient: GoogleGenAI | null = null;
export function getAiClient(): GoogleGenAI {
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey: getEnvConfig().geminiApiKey || undefined,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

const ipRateLimits = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now - record.windowStart > windowMs) {
    ipRateLimits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}

export function hashOtpCode(phone: string, code: string): string {
  const { otpHmacSecret } = getEnvConfig();
  return crypto
    .createHmac('sha256', otpHmacSecret)
    .update(`${phone}:${code}`)
    .digest('hex');
}

export function timingSafeHexEqual(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, 'hex');
    const b = Buffer.from(bHex, 'hex');
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function resolveServerPort(): number {
  const argvPortIdx = process.argv.findIndex(
    (arg) => arg === '--port' || arg.startsWith('--port=')
  );
  if (argvPortIdx !== -1) {
    const rawArg = process.argv[argvPortIdx];
    const val = rawArg.includes('=') ? rawArg.split('=')[1] : process.argv[argvPortIdx + 1];
    const parsed = Number(val);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }
  return 3000;
}

export function getRequestBaseUrl(req: express.Request): string {
  const { appUrl, appDomain } = getEnvConfig();
  if (appUrl) {
    return appUrl.replace(/\/+$/, '');
  }
  const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
    .split(',')[0]
    .trim();
  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (hostHeader) {
    return `${protoHeader || 'https'}://${hostHeader}`;
  }
  return appDomain ? `https://${appDomain}` : 'http://localhost:3000';
}

export function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

export function extractSessionToken(req: express.Request): string {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  const cookies = parseCookies(req);
  if (cookies.skill98_session) return cookies.skill98_session;
  return '';
}

export function setSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string,
  ttlHours = 24
): void {
  const isHttps =
    req.secure ||
    String(req.headers['x-forwarded-proto'] || '').toLowerCase().includes('https');
  const clampedHours =
    Number.isFinite(ttlHours) && ttlHours >= 1 && ttlHours <= 720 ? Math.round(ttlHours) : 24;
  const maxAgeSec = clampedHours * 60 * 60;
  const parts = [
    `skill98_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSec}`,
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    parts.push('Secure');
    parts.push('Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: express.Response, req?: express.Request): void {
  const isHttps = Boolean(
    req &&
      (req.secure ||
        String(req.headers['x-forwarded-proto'] || '').toLowerCase().includes('https'))
  );
  const cookiesToClear = [
    'skill98_session=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
  ];
  if (isHttps) {
    cookiesToClear.push(
      'skill98_session=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; Partitioned'
    );
  }
  res.setHeader('Set-Cookie', cookiesToClear);
}

export function extractClientDeviceAndIp(req: express.Request): {
  deviceLabel: string;
  ipMasked: string;
} {
  const ua = String(req.headers['user-agent'] || '');
  let deviceLabel = 'مرورگر وب';
  if (/iPhone|iPad/i.test(ua)) deviceLabel = 'Safari / iOS';
  else if (/Android/i.test(ua)) deviceLabel = 'Chrome / Android';
  else if (/Edg\//i.test(ua)) deviceLabel = 'Edge / Desktop';
  else if (/Firefox/i.test(ua)) deviceLabel = 'Firefox / Desktop';
  else if (/Chrome/i.test(ua)) deviceLabel = 'Chrome / Desktop';

  const rawIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
    .split(',')[0]
    .trim()
    .replace('::ffff:', '');
  const parts = rawIp.split('.');
  const ipMasked = parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : rawIp || '127.0.0.1';
  return { deviceLabel, ipMasked };
}
