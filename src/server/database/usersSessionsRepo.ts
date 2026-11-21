import crypto from 'crypto';
import type {
  AdminUserRecord,
  CmsRoleDefinition,
  CmsSessionRecord,
  OtpSecurityConfig,
} from '../../core/types.js';
import { DEFAULT_OTP_SECURITY_CONFIG, INITIAL_CMS_ROLES } from '../../data/defaults.js';
import { getEnvConfig } from '../core/envConfig.js';
import { dbExec, dbQuery, formatPersianDateTime } from './connection.js';
import { getSetting } from './settingsLogsRepo.js';

export interface DbUserRow {
  phone: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'customer';
  role_id?: string;
  status?: 'active' | 'suspended';
  email?: string;
  notes?: string;
  claimed_skill_ids_json: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbAuthSessionRow {
  token: string;
  phone: string;
  user_display?: string;
  role: string;
  role_id: string;
  device_label?: string;
  ip_masked?: string;
  status?: string;
  last_active_at?: string;
  expires_at: string;
  created_at: string;
}

export async function findUserByPhone(phone: string): Promise<DbUserRow | null> {
  const rows = await dbQuery<DbUserRow>('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone]);
  return rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<DbUserRow | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const rows = await dbQuery<DbUserRow>(
    'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [clean]
  );
  return rows[0] || null;
}

export async function countSuperAdmins(): Promise<number> {
  const rows = await dbQuery<{ cnt: number | string }>(
    "SELECT COUNT(*) AS cnt FROM users WHERE role = 'super_admin' AND status = 'active'"
  );
  return Number(rows[0]?.cnt || 0);
}

export async function upsertUserByPhone(params: {
  phone: string;
  fullName: string;
  role?: 'super_admin' | 'admin' | 'customer';
  roleId?: string;
  email?: string;
}): Promise<DbUserRow> {
  const existing = await findUserByPhone(params.phone);
  const nowIso = new Date().toISOString();
  const nextRole =
    params.role ||
    (existing?.role as 'super_admin' | 'admin' | 'customer') ||
    'customer';
  const nextRoleId =
    params.roleId ||
    existing?.role_id ||
    (nextRole === 'super_admin'
      ? 'role_super_admin'
      : nextRole === 'admin'
      ? 'role_admin'
      : 'role_customer');

  await dbExec(
    `INSERT INTO users (phone, full_name, role, role_id, status, email, notes, claimed_skill_ids_json, last_login_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (phone) DO UPDATE SET
       full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE users.full_name END,
       role = EXCLUDED.role,
       role_id = EXCLUDED.role_id,
       email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE users.email END,
       last_login_at = EXCLUDED.last_login_at,
       updated_at = EXCLUDED.updated_at`,
    [
      params.phone,
      params.fullName,
      nextRole,
      nextRoleId,
      existing?.status || 'active',
      params.email || existing?.email || '',
      existing?.notes || '',
      existing?.claimed_skill_ids_json || '[]',
      nowIso,
      existing?.created_at || nowIso,
      nowIso,
    ]
  );

  return (await findUserByPhone(params.phone))!;
}

export async function resolveSessionTtlHours(): Promise<number> {
  const envDefault = getEnvConfig().sessionTtlHours || 24;
  try {
    const otpCfg = await getSetting<OtpSecurityConfig>('otp_config', {
      ...DEFAULT_OTP_SECURITY_CONFIG,
      sessionTimeoutHours: envDefault,
    });
    const configured = Number(otpCfg?.sessionTimeoutHours);
    if (Number.isFinite(configured) && configured >= 1 && configured <= 720) {
      return Math.round(configured);
    }
  } catch {
    // fallback to env default
  }
  return envDefault;
}

export async function createAuthSession(params: {
  phone: string;
  userDisplay?: string;
  role: string;
  roleId: string;
  deviceLabel?: string;
  ipMasked?: string;
  ttlHours?: number;
}): Promise<string> {
  const token = `s98_${crypto.randomBytes(24).toString('hex')}`;
  const now = new Date();
  const timeoutHours =
    params.ttlHours && params.ttlHours >= 1 && params.ttlHours <= 720
      ? Math.round(params.ttlHours)
      : await resolveSessionTtlHours();
  const expires = new Date(now.getTime() + timeoutHours * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  await dbExec(
    `INSERT INTO auth_sessions (token, phone, user_display, role, role_id, device_label, ip_masked, status, last_active_at, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      token,
      params.phone,
      params.userDisplay || `کاربر ${params.phone}`,
      params.role,
      params.roleId,
      params.deviceLabel || 'مرورگر وب · نشست امن',
      params.ipMasked || '127.0.0.1',
      'active',
      nowIso,
      expires.toISOString(),
      nowIso,
    ]
  );
  return token;
}

export async function findAuthSession(token: string): Promise<DbAuthSessionRow | null> {
  if (!token) return null;
  const rows = await dbQuery<DbAuthSessionRow>(
    'SELECT * FROM auth_sessions WHERE token = $1 LIMIT 1',
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.status === 'revoked' || new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteAuthSession(token);
    return null;
  }
  try {
    await dbExec('UPDATE auth_sessions SET last_active_at = $1 WHERE token = $2', [
      new Date().toISOString(),
      token,
    ]);
  } catch {
    // ignore touch error
  }
  return row;
}

export async function deleteAuthSession(token: string): Promise<void> {
  if (!token) return;
  await dbExec('DELETE FROM auth_sessions WHERE token = $1', [token]);
}

export async function revokeAuthSessionByToken(token: string): Promise<void> {
  if (!token) return;
  await dbExec(`UPDATE auth_sessions SET status = 'revoked' WHERE token = $1`, [token]);
}

export async function listActiveAuthSessions(phoneFilter?: string): Promise<CmsSessionRecord[]> {
  try {
    await dbExec(`DELETE FROM auth_sessions WHERE expires_at <= $1`, [new Date().toISOString()]);
  } catch {
    // ignore cleanup error
  }
  const rows = phoneFilter
    ? await dbQuery<DbAuthSessionRow>(
        'SELECT * FROM auth_sessions WHERE phone = $1 ORDER BY created_at DESC LIMIT 50',
        [phoneFilter]
      )
    : await dbQuery<DbAuthSessionRow>(
        'SELECT * FROM auth_sessions ORDER BY created_at DESC LIMIT 100'
      );

  return rows.map((r) => {
    const roleLabel =
      r.role === 'super_admin'
        ? 'سوپر ادمین'
        : r.role === 'admin'
        ? 'ادمین'
        : 'مشتری';
    return {
      id: r.token,
      phone: r.phone,
      userDisplay: r.user_display
        ? `${r.user_display} (${r.phone})`
        : `کاربر (${r.phone})`,
      roleLabel,
      deviceLabel: r.device_label || 'مرورگر وب (OTP Session)',
      authMethod: 'otp_sms',
      ipMasked: r.ip_masked || '—',
      status: r.status === 'revoked' ? 'revoked' : 'active',
      lastActiveLabel: formatPersianDateTime(r.last_active_at || r.created_at),
    };
  });
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const [userRows, orderStatsRows] = await Promise.all([
    dbQuery<DbUserRow>('SELECT * FROM users ORDER BY updated_at DESC'),
    dbQuery<{ buyer_phone: string; cnt: number | string; total: number | string }>(
      'SELECT buyer_phone, COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total FROM orders GROUP BY buyer_phone'
    ),
  ]);

  const orderMap = new Map<string, { count: number; total: number }>();
  for (const row of orderStatsRows) {
    orderMap.set(String(row.buyer_phone || ''), {
      count: Number(row.cnt || 0),
      total: Number(row.total || 0),
    });
  }

  return userRows.map((u) => {
    let claimedSkillIds: string[] = [];
    try {
      claimedSkillIds = JSON.parse(u.claimed_skill_ids_json || '[]');
    } catch {
      claimedSkillIds = [];
    }
    const stats = orderMap.get(u.phone) || { count: 0, total: 0 };
    const roleSlug = (u.role as 'super_admin' | 'admin' | 'customer') || 'customer';
    const roleId =
      u.role_id ||
      (roleSlug === 'super_admin'
        ? 'role_super_admin'
        : roleSlug === 'admin'
        ? 'role_admin'
        : 'role_customer');
    return {
      phone: u.phone,
      fullName: u.full_name,
      email: u.email || '',
      role: roleSlug,
      roleId,
      status: u.status === 'suspended' ? 'suspended' : 'active',
      notes: u.notes || '',
      claimedSkillIds,
      ordersCount: stats.count,
      totalSpent: stats.total,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      lastLoginAt: u.last_login_at || u.updated_at,
    };
  });
}

export async function upsertAdminUser(params: {
  phone: string;
  fullName: string;
  email?: string;
  roleId: string;
  status?: 'active' | 'suspended';
  notes?: string;
}): Promise<AdminUserRecord> {
  const existing = await findUserByPhone(params.phone);
  const roles = await getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES);
  const matchedRole = roles.find((r) => r.id === params.roleId);
  const derivedRole: 'super_admin' | 'admin' | 'customer' =
    matchedRole?.roleSlug === 'super_admin'
      ? 'super_admin'
      : matchedRole?.roleSlug === 'admin' || matchedRole?.roleSlug === 'seo_editor'
      ? 'admin'
      : 'customer';

  const nowIso = new Date().toISOString();
  const nextStatus = params.status === 'suspended' ? 'suspended' : 'active';

  await dbExec(
    `INSERT INTO users (phone, full_name, role, role_id, status, email, notes, claimed_skill_ids_json, last_login_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (phone) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       role_id = EXCLUDED.role_id,
       status = EXCLUDED.status,
       email = EXCLUDED.email,
       notes = EXCLUDED.notes,
       updated_at = EXCLUDED.updated_at`,
    [
      params.phone,
      params.fullName.trim(),
      derivedRole,
      matchedRole?.id || params.roleId || 'role_customer',
      nextStatus,
      (params.email || '').trim(),
      (params.notes || '').trim(),
      existing?.claimed_skill_ids_json || '[]',
      existing?.last_login_at || nowIso,
      existing?.created_at || nowIso,
      nowIso,
    ]
  );

  const list = await listAdminUsers();
  return list.find((u) => u.phone === params.phone)!;
}

export async function deleteAdminUserByPhone(phone: string): Promise<void> {
  await dbExec('DELETE FROM users WHERE phone = $1', [phone]);
}

export async function addClaimedSkillsToUser(
  phone: string,
  skillIds: string[]
): Promise<string[]> {
  const existing = await findUserByPhone(phone);
  let currentIds: string[] = [];
  if (existing?.claimed_skill_ids_json) {
    try {
      currentIds = JSON.parse(existing.claimed_skill_ids_json);
    } catch {
      currentIds = [];
    }
  }
  const merged = Array.from(new Set([...currentIds, ...skillIds]));
  const nowIso = new Date().toISOString();
  await dbExec(
    'UPDATE users SET claimed_skill_ids_json = $1, updated_at = $2 WHERE phone = $3',
    [JSON.stringify(merged), nowIso, phone]
  );
  return merged;
}
