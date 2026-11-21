import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface RuntimeSecrets {
  otpHmacSecret: string;
  permissionHashSecret: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRETS_FILE = path.join(DATA_DIR, '.runtime-secrets.json');

let cachedSecrets: RuntimeSecrets | null = null;

function loadOrCreateRuntimeSecrets(): RuntimeSecrets {
  if (cachedSecrets) return cachedSecrets;

  const envOtp = (process.env.OTP_HMAC_SECRET || process.env.OTP_SECRET || '').trim();
  const envPerm = (process.env.PERMISSION_HASH_SECRET || '').trim();

  if (envOtp && envPerm) {
    cachedSecrets = {
      otpHmacSecret: envOtp,
      permissionHashSecret: envPerm,
    };
    return cachedSecrets;
  }

  let fileSecrets: Partial<RuntimeSecrets> = {};
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      fileSecrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')) as Partial<RuntimeSecrets>;
    }
  } catch {
    fileSecrets = {};
  }

  const otpHmacSecret =
    envOtp || fileSecrets.otpHmacSecret || crypto.randomBytes(32).toString('hex');
  const permissionHashSecret =
    envPerm || fileSecrets.permissionHashSecret || crypto.randomBytes(32).toString('hex');

  if (!envOtp || !envPerm) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        SECRETS_FILE,
        JSON.stringify({ otpHmacSecret, permissionHashSecret }, null, 2),
        { mode: 0o600 }
      );
    } catch {
      // If filesystem is read-only, keep secrets in memory for process lifetime
    }
  }

  cachedSecrets = { otpHmacSecret, permissionHashSecret };
  return cachedSecrets;
}

export function normalizeIranPhone(raw: string): string {
  const digits = String(raw || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^0-9]/g, '');
  if (digits.startsWith('00989') && digits.length === 14) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('989') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

export interface ServerEnvConfig {
  otpHmacSecret: string;
  permissionHashSecret: string;
  adminPhone: string;
  adminEmail: string;
  adminMasterCodeRaw: string;
  adminMasterCodeHash: string;
  geminiApiKey: string;
  databaseUrl: string;
  appUrl: string;
  appDomain: string;
  sessionTtlHours: number;
}

let cachedBuildId: string | null = null;
const SERVER_BOOT_BUILD_ID = `v2.7.0-${Date.now().toString(36)}`;

export function resolveBuildId(): string {
  if (cachedBuildId) return cachedBuildId;
  const envBuild = (process.env.BUILD_ID || '').trim();
  if (envBuild) {
    cachedBuildId = envBuild;
    return cachedBuildId;
  }
  try {
    const buildIdFile = path.resolve(process.cwd(), 'dist', 'build-id.txt');
    if (fs.existsSync(buildIdFile)) {
      const fileVal = fs.readFileSync(buildIdFile, 'utf-8').trim();
      if (fileVal) {
        cachedBuildId = fileVal;
        return cachedBuildId;
      }
    }
  } catch {
    // ignore read error
  }
  cachedBuildId = SERVER_BOOT_BUILD_ID;
  return cachedBuildId;
}

function normalizeCodeString(raw: string): string {
  return String(raw || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
}

export function getEnvConfig(): ServerEnvConfig {
  const secrets = loadOrCreateRuntimeSecrets();
  const adminPhone = normalizeIranPhone(process.env.ADMIN_PHONE || '');
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

  let adminMasterCodeHash = (process.env.ADMIN_MASTER_CODE_HASH || '').trim();
  const rawMasterCode = normalizeCodeString(process.env.ADMIN_MASTER_CODE || '');
  if (!adminMasterCodeHash && adminPhone && rawMasterCode) {
    adminMasterCodeHash = crypto
      .createHmac('sha256', secrets.otpHmacSecret)
      .update(`${adminPhone}:${rawMasterCode}`)
      .digest('hex');
  }

  const parsedTtl = Number(process.env.SESSION_TTL_HOURS || '24');
  const sessionTtlHours =
    Number.isFinite(parsedTtl) && parsedTtl >= 1 && parsedTtl <= 720 ? Math.round(parsedTtl) : 24;

  return {
    otpHmacSecret: secrets.otpHmacSecret,
    permissionHashSecret: secrets.permissionHashSecret,
    adminPhone,
    adminEmail,
    adminMasterCodeRaw: rawMasterCode,
    adminMasterCodeHash,
    geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
    databaseUrl: (process.env.DATABASE_URL || '').trim(),
    appUrl: (process.env.APP_URL || '').trim(),
    appDomain: (process.env.APP_DOMAIN || '').trim(),
    sessionTtlHours,
  };
}
