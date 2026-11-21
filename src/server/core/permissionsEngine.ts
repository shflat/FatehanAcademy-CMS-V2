import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import type {
  CmsPermissionKey,
  CmsRoleDefinition,
  HashedPermissionRecord,
} from '../../core/types.js';
import { ALL_CAPABILITY_KEYS } from '../../core/permissions.js';
import { INITIAL_CMS_ROLES } from '../../data/defaults.js';
import { getEnvConfig } from './envConfig.js';
import { clearSessionCookie, extractSessionToken, timingSafeHexEqual } from './cryptoSecurity.js';
import { DATA_DIR, dbExec, dbQuery } from '../database/connection.js';
import { getSetting, writeSystemLog } from '../database/settingsLogsRepo.js';
import {
  findAuthSession,
  findUserByPhone,
  type DbAuthSessionRow,
} from '../database/usersSessionsRepo.js';

const PERMISSIONS_HASH_FILE = path.join(DATA_DIR, 'permissions.hash.json');

export interface PermissionsHashManifest {
  algorithm: 'HMAC-SHA256';
  generatedAt: string;
  records: HashedPermissionRecord[];
  manifestSignature: string;
}

export interface AuthenticatedRequest extends express.Request {
  authSession?: DbAuthSessionRow;
}

export function computePermissionHash(
  roleId: string,
  roleSlug: string,
  capabilityKey: CmsPermissionKey,
  granted: boolean
): string {
  const { permissionHashSecret } = getEnvConfig();
  return crypto
    .createHmac('sha256', permissionHashSecret)
    .update(`${roleId}::${roleSlug}::${capabilityKey}::${granted ? '1' : '0'}`)
    .digest('hex');
}

function computeManifestSignature(records: HashedPermissionRecord[]): string {
  const { permissionHashSecret } = getEnvConfig();
  const payload = records
    .map((r) => `${r.id}:${r.permissionHash}:${r.granted ? '1' : '0'}`)
    .sort()
    .join('|');
  return crypto
    .createHmac('sha256', permissionHashSecret)
    .update(payload)
    .digest('hex');
}

export async function syncPermissionsToDbAndFile(
  rolesInput?: CmsRoleDefinition[]
): Promise<PermissionsHashManifest> {
  const roles =
    rolesInput ||
    (await getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES));
  const nowIso = new Date().toISOString();
  const records: HashedPermissionRecord[] = [];

  await dbExec('DELETE FROM rbac_permission_hashes');
  for (const role of roles) {
    for (const capKey of ALL_CAPABILITY_KEYS) {
      const granted =
        role.roleSlug === 'super_admin' ? true : Boolean(role.permissions?.[capKey]);
      const hash = computePermissionHash(role.id, role.roleSlug, capKey, granted);
      const id = `${role.id}__${capKey}`;
      await dbExec(
        `INSERT INTO rbac_permission_hashes (id, role_id, role_slug, capability_key, granted, permission_hash, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, role.id, role.roleSlug, capKey, granted ? 1 : 0, hash, nowIso]
      );
      records.push({
        id,
        roleId: role.id,
        roleSlug: role.roleSlug,
        capabilityKey: capKey,
        granted,
        permissionHash: hash,
        updatedAt: nowIso,
      });
    }
  }

  const manifest: PermissionsHashManifest = {
    algorithm: 'HMAC-SHA256',
    generatedAt: nowIso,
    records,
    manifestSignature: computeManifestSignature(records),
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PERMISSIONS_HASH_FILE, JSON.stringify(manifest, null, 2), {
      mode: 0o600,
    });
  } catch {
    // Ignore file write errors on read-only mounts; DB hashes remain authoritative
  }

  return manifest;
}

export async function verifyRoleCapabilityHash(
  roleId: string,
  roleSlug: string,
  capabilityKey: CmsPermissionKey
): Promise<{ allowed: boolean; integrityValid: boolean; hashMatch: string }> {
  const rows = await dbQuery<{
    role_id: string;
    role_slug: string;
    capability_key: string;
    granted: number | boolean;
    permission_hash: string;
  }>(
    'SELECT role_id, role_slug, capability_key, granted, permission_hash FROM rbac_permission_hashes WHERE role_id = $1 AND capability_key = $2 LIMIT 1',
    [roleId, capabilityKey]
  );

  const row = rows[0];
  if (!row) {
    return { allowed: false, integrityValid: false, hashMatch: 'missing_db_row' };
  }

  const granted = Boolean(row.granted);
  const expectedHash = computePermissionHash(
    row.role_id,
    row.role_slug || roleSlug,
    capabilityKey,
    granted
  );
  const dbHashValid = timingSafeHexEqual(String(row.permission_hash || ''), expectedHash);
  if (!dbHashValid) {
    return { allowed: false, integrityValid: false, hashMatch: 'tampered_db_hash' };
  }

  if (fs.existsSync(PERMISSIONS_HASH_FILE)) {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(PERMISSIONS_HASH_FILE, 'utf-8')
      ) as PermissionsHashManifest;
      const expectedSig = computeManifestSignature(manifest.records || []);
      if (!timingSafeHexEqual(manifest.manifestSignature || '', expectedSig)) {
        return { allowed: false, integrityValid: false, hashMatch: 'tampered_file_manifest' };
      }
      const fileEntry = manifest.records?.find(
        (r) => r.roleId === roleId && r.capabilityKey === capabilityKey
      );
      if (
        !fileEntry ||
        !timingSafeHexEqual(fileEntry.permissionHash, expectedHash) ||
        Boolean(fileEntry.granted) !== granted
      ) {
        return { allowed: false, integrityValid: false, hashMatch: 'file_db_mismatch' };
      }
    } catch {
      return { allowed: false, integrityValid: false, hashMatch: 'corrupt_file_manifest' };
    }
  }

  return {
    allowed: granted,
    integrityValid: true,
    hashMatch: expectedHash,
  };
}

export async function getHashedPermissionsReport(): Promise<{
  algorithm: string;
  fileManifestPath: string;
  fileManifestValid: boolean;
  recordsCount: number;
  records: (HashedPermissionRecord & { integrityValid: boolean })[];
}> {
  const rows = await dbQuery<{
    id: string;
    role_id: string;
    role_slug: string;
    capability_key: string;
    granted: number | boolean;
    permission_hash: string;
    updated_at: string;
  }>('SELECT * FROM rbac_permission_hashes ORDER BY role_id ASC, capability_key ASC');

  let fileManifestValid = false;
  if (fs.existsSync(PERMISSIONS_HASH_FILE)) {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(PERMISSIONS_HASH_FILE, 'utf-8')
      ) as PermissionsHashManifest;
      const expectedSig = computeManifestSignature(manifest.records || []);
      fileManifestValid = timingSafeHexEqual(manifest.manifestSignature || '', expectedSig);
    } catch {
      fileManifestValid = false;
    }
  }

  const records = rows.map((r) => {
    const capKey = r.capability_key as CmsPermissionKey;
    const granted = Boolean(r.granted);
    const expected = computePermissionHash(r.role_id, r.role_slug, capKey, granted);
    return {
      id: r.id,
      roleId: r.role_id,
      roleSlug: r.role_slug,
      capabilityKey: capKey,
      granted,
      permissionHash: r.permission_hash,
      updatedAt: r.updated_at,
      integrityValid: timingSafeHexEqual(r.permission_hash, expected),
    };
  });

  return {
    algorithm: 'HMAC-SHA256',
    fileManifestPath: 'data/permissions.hash.json',
    fileManifestValid,
    recordsCount: records.length,
    records,
  };
}

async function resolveActiveSession(req: express.Request): Promise<DbAuthSessionRow | null> {
  const token = extractSessionToken(req);
  if (!token) return null;
  const session = await findAuthSession(token);
  if (!session) return null;
  const user = await findUserByPhone(session.phone);
  if (user && user.status === 'suspended') {
    return null;
  }
  return session;
}

export async function attachOptionalAuth(
  req: AuthenticatedRequest,
  _res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const session = await resolveActiveSession(req);
    if (session) req.authSession = session;
  } catch {
    // ignore optional auth lookup errors
  }
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const session = await resolveActiveSession(req);
    if (!session) {
      if (extractSessionToken(req)) {
        clearSessionCookie(res, req);
      }
      res.status(401).json({
        error: 'نشست کاربری معتبر نیست یا منقضی شده است. لطفاً ابتدا وارد حساب کاربری شوید.',
      });
      return;
    }
    req.authSession = session;
    next();
  } catch {
    res.status(401).json({ error: 'خطا در اعتبارسنجی نشست کاربری' });
  }
}

export function requirePermission(
  required: CmsPermissionKey | 'super_admin' | 'admin_panel'
): express.RequestHandler {
  return async (
    req: AuthenticatedRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const session = req.authSession || (await resolveActiveSession(req));
      if (!session) {
        if (extractSessionToken(req)) {
          clearSessionCookie(res, req);
        }
        res.status(401).json({
          error: 'دسترسی غیرمجاز: برای دسترسی به این بخش باید وارد حساب مدیریتی شوید.',
        });
        return;
      }
      req.authSession = session;

      const userRow = await findUserByPhone(session.phone);
      const effectiveRole = (userRow?.role || session.role) as string;
      const effectiveRoleId = userRow?.role_id || session.role_id || 'role_customer';

      if (effectiveRole === 'super_admin') {
        if (required !== 'super_admin' && required !== 'admin_panel') {
          const check = await verifyRoleCapabilityHash(
            effectiveRoleId,
            'super_admin',
            required
          );
          if (!check.integrityValid) {
            await writeSystemLog({
              level: 'error',
              category: 'auth',
              title: 'هشدار امنیتی: مغایرت هش دسترسی‌های RBAC',
              detail: `بررسی هش دسترسی ${required} برای ${effectiveRoleId} با وضعیت ${check.hashMatch} رد شد.`,
              sqlOrEndpoint: req.originalUrl,
            });
            res.status(403).json({
              error: 'هش امنیتی دسترسی نامعتبر است. لطفاً همگام‌سازی RBAC را بررسی کنید.',
            });
            return;
          }
        }
        next();
        return;
      }

      if (required === 'super_admin') {
        res.status(403).json({
          error: 'این عملیات فقط برای مدیر ارشد سیستم (Super Admin) مجاز است.',
        });
        return;
      }

      if (effectiveRole !== 'admin') {
        res.status(403).json({
          error: 'شما مجوز دسترسی به پنل مدیریت سیستم را ندارید.',
        });
        return;
      }

      if (required === 'admin_panel') {
        next();
        return;
      }

      const check = await verifyRoleCapabilityHash(effectiveRoleId, effectiveRole, required);
      if (!check.integrityValid || !check.allowed) {
        await writeSystemLog({
          level: 'warning',
          category: 'auth',
          title: `مسدودسازی دسترسی ${required} برای کاربر ${session.phone}`,
          detail: `نقش: ${effectiveRoleId} · نتیجه هش: ${check.hashMatch} · مجاز: ${String(check.allowed)}`,
          sqlOrEndpoint: req.originalUrl,
        });
        res.status(403).json({
          error: `دسترسی «${required}» برای نقش شما مجاز یا دارای هش معتبر نیست.`,
        });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در بررسی سطح دسترسی هش‌شده',
      });
    }
  };
}
