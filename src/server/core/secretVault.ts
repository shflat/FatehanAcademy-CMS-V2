import crypto from 'crypto';
import { getEnvConfig } from './envConfig.js';

const ENC_PREFIX = 'enc:v1:';

function deriveAesKey(): Buffer {
  const secret = getEnvConfig().permissionHashSecret || 'skill98-cms-vault-fallback-key';
  return crypto.scryptSync(secret, 'skill98-aes256gcm-salt-v26', 32);
}

/**
 * Encrypts sensitive API keys, bot tokens, or VAPID private keys using AES-256-GCM.
 * Returns empty string if input is empty; passes through if already encrypted.
 */
export function encryptSecret(plainText: string): string {
  const trimmed = String(plainText || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(ENC_PREFIX)) return trimmed;

  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts AES-256-GCM ciphertext back to plaintext on the server ONLY.
 * Never send the return value directly to client responses.
 */
export function decryptSecret(storedValue: string): string {
  const raw = String(storedValue || '').trim();
  if (!raw) return '';
  if (!raw.startsWith(ENC_PREFIX)) return raw;

  const payload = raw.slice(ENC_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) return '';
  try {
    const key = deriveAesKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Returns a safe masked representation (e.g. `sk-••••1234`) for client responses.
 */
export function maskSecret(storedOrPlain: string): string {
  const plain = decryptSecret(storedOrPlain);
  if (!plain) return '';
  if (plain.length <= 6) {
    return `••••${plain.slice(-2)}`;
  }
  const prefix = plain.slice(0, Math.min(3, plain.length - 4));
  const suffix = plain.slice(-4);
  return `${prefix}••••${suffix}`;
}

export function isMaskedPlaceholder(value: string): boolean {
  const trimmed = String(value || '').trim();
  return trimmed.includes('••••') || trimmed.includes('****');
}
