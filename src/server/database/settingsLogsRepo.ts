import crypto from 'crypto';
import type { SystemLogCategory, SystemLogEntry, SystemLogLevel } from '../../core/types.js';
import { dbExec, dbQuery, formatPersianDateTime } from './connection.js';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await dbQuery<{ value_json: string }>(
    'SELECT value_json FROM site_settings WHERE key = $1 LIMIT 1',
    [key]
  );
  if (!rows[0]?.value_json) return fallback;
  try {
    return JSON.parse(rows[0].value_json) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const nowIso = new Date().toISOString();
  const json = JSON.stringify(value);
  await dbExec(
    `INSERT INTO site_settings (key, value_json, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
    [key, json, nowIso]
  );
}

export async function writeSystemLog(entry: {
  level: SystemLogLevel;
  category: SystemLogCategory;
  title: string;
  detail: string;
  sqlOrEndpoint?: string;
  payload?: unknown;
}): Promise<void> {
  try {
    const id = `log_${Date.now()}_${crypto.randomInt(100, 999)}`;
    const nowIso = new Date().toISOString();
    const nowFa = formatPersianDateTime(nowIso);
    const payloadJson =
      entry.payload !== undefined
        ? typeof entry.payload === 'string'
          ? entry.payload
          : JSON.stringify(entry.payload, null, 2)
        : null;

    await dbExec(
      `INSERT INTO system_logs (id, level, category, title, detail, sql_or_endpoint, payload_json, created_at, created_at_fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        entry.level,
        entry.category,
        entry.title.slice(0, 240),
        entry.detail.slice(0, 1000),
        entry.sqlOrEndpoint || null,
        payloadJson,
        nowIso,
        nowFa,
      ]
    );
  } catch {
    // Prevent log failure from crashing business transactions
  }
}

export async function getSystemLogs(filters?: {
  category?: string;
  level?: string;
  search?: string;
}): Promise<SystemLogEntry[]> {
  const rows = await dbQuery<Record<string, unknown>>(
    'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 250'
  );

  let logs: SystemLogEntry[] = rows.map((r) => ({
    id: String(r.id),
    level: (r.level as SystemLogLevel) || 'success',
    category: (r.category as SystemLogCategory) || 'system',
    title: String(r.title || ''),
    detail: String(r.detail || ''),
    sqlOrEndpoint: r.sql_or_endpoint ? String(r.sql_or_endpoint) : undefined,
    payloadJson: r.payload_json ? String(r.payload_json) : undefined,
    createdAtIso: String(r.created_at || ''),
    createdAtFa: String(r.created_at_fa || ''),
  }));

  if (filters?.category && filters.category !== 'all') {
    logs = logs.filter((l) => l.category === filters.category);
  }
  if (filters?.level && filters.level !== 'all') {
    logs = logs.filter((l) => l.level === filters.level);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    logs = logs.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.detail.toLowerCase().includes(q) ||
        (l.sqlOrEndpoint || '').toLowerCase().includes(q) ||
        (l.payloadJson || '').toLowerCase().includes(q)
    );
  }

  return logs;
}

export async function clearAllSystemLogs(): Promise<void> {
  await dbExec('DELETE FROM system_logs');
  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: 'پاک‌سازی کامل لاگ‌های سیستم',
    detail: 'تمام لاگ‌های قبلی توسط مدیر ارشد سیستم تخلیه شد.',
    sqlOrEndpoint: 'DELETE FROM system_logs',
  });
}
