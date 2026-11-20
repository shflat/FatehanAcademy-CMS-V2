import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { BackupHistoryItem, BackupScheduleConfig } from '../../core/types.js';
import { DEFAULT_BACKUP_SCHEDULE_CONFIG } from '../../data/defaults.js';
import {
  BACKUP_DIR,
  SQLITE_PATH,
  TABLE_METADATA,
  dbExec,
  dbQuery,
  formatPersianDateTime,
  getActiveEngine,
  getLastConnectionError,
  type SqlEngineKind,
} from './connection.js';
import { getSetting, setSetting, writeSystemLog } from './settingsLogsRepo.js';

export async function getDatabaseStatus() {
  const activeEngine = getActiveEngine();
  const tables: {
    name: string;
    description: string;
    rowCount: number;
    defaultQuery: string;
  }[] = [];

  for (const meta of TABLE_METADATA) {
    try {
      const cntRows = await dbQuery<{ cnt: number | string }>(
        `SELECT COUNT(*) AS cnt FROM ${meta.name}`
      );
      tables.push({
        name: meta.name,
        description: meta.description,
        rowCount: Number(cntRows[0]?.cnt || 0),
        defaultQuery: meta.defaultQuery,
      });
    } catch {
      tables.push({
        name: meta.name,
        description: meta.description,
        rowCount: 0,
        defaultQuery: meta.defaultQuery,
      });
    }
  }

  let sizeKb = 0;
  try {
    if (activeEngine === 'postgresql') {
      const sz = await dbQuery<{ bytes: string | number }>(
        'SELECT pg_database_size(current_database()) AS bytes'
      );
      sizeKb = Math.round(Number(sz[0]?.bytes || 0) / 1024);
    } else if (fs.existsSync(SQLITE_PATH)) {
      const stat = fs.statSync(SQLITE_PATH);
      sizeKb = Math.max(1, Math.round(stat.size / 1024));
    }
  } catch {
    sizeKb = 0;
  }

  const pgConfigured = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
  const pgTargetHost =
    process.env.PGHOST ||
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/^postgresql:\/\/[^@]+@/i, '').split('/')[0]
      : null);

  return {
    engine: activeEngine,
    engineLabel:
      activeEngine === 'postgresql'
        ? 'PostgreSQL 16 (متصل به کانتینر داکر)'
        : 'SQLite پایدار داخلی (فایل محلی سرور)',
    connected: true,
    pgConfigured,
    pgTargetHost,
    databasePathOrHost:
      activeEngine === 'postgresql'
        ? `${pgTargetHost || 'skill98-postgres:5432'}/${process.env.PGDATABASE || 'skill98_db'}`
        : 'data/skill98.db',
    sizeKb,
    tablesCount: tables.length,
    tables,
    lastConnectionError: getLastConnectionError(),
  };
}

export async function runDatabaseReadWriteHealthTest(): Promise<{
  ok: boolean;
  engine: SqlEngineKind;
  engineLabel: string;
  databasePathOrHost: string;
  pgConfigured: boolean;
  lastConnectionError: string | null;
  latencyMs: number;
  tablesCount: number;
  testedAtFa: string;
  message: string;
}> {
  const activeEngine = getActiveEngine();
  const start = Date.now();
  const probeKey = `_health_probe_${Date.now()}`;
  const probeValue = { probe: true, ts: new Date().toISOString(), engine: activeEngine };

  await setSetting(probeKey, probeValue);
  const readBack = await getSetting<{ probe?: boolean; ts?: string } | null>(probeKey, null);
  await dbExec('DELETE FROM site_settings WHERE key = $1', [probeKey]);

  const latencyMs = Math.max(1, Date.now() - start);
  const status = await getDatabaseStatus();
  const verified = Boolean(readBack && readBack.probe === true);

  await writeSystemLog({
    level: verified ? 'success' : 'error',
    category: 'database',
    title: `تست زنده نوشتن/خواندن دیتابیس (${status.engineLabel})`,
    detail: verified
      ? `عملیات INSERT، SELECT و DELETE آزمایشی با موفقیت در ${latencyMs} میلی‌ثانیه روی موتور ${status.engine.toUpperCase()} انجام شد.`
      : 'خطا در تایید داده نوشته‌شده در دیتابیس.',
    sqlOrEndpoint: 'POST /api/admin/db/test-connection',
    payload: {
      engine: status.engine,
      databasePathOrHost: status.databasePathOrHost,
      pgConfigured: status.pgConfigured,
      lastConnectionError: status.lastConnectionError,
      latencyMs,
    },
  });

  return {
    ok: verified,
    engine: status.engine,
    engineLabel: status.engineLabel,
    databasePathOrHost: status.databasePathOrHost,
    pgConfigured: status.pgConfigured,
    lastConnectionError: status.lastConnectionError,
    latencyMs,
    tablesCount: status.tablesCount,
    testedAtFa: formatPersianDateTime(),
    message:
      status.engine === 'postgresql'
        ? `اتصال به دیتابیس PostgreSQL 16 برقرار است و تست نوشتن/خواندن واقعی در ${latencyMs} میلی‌ثانیه تایید شد.`
        : status.pgConfigured && status.lastConnectionError
        ? `توجه: متغیر PostgreSQL تنظیم شده اما به دلیل خطای (${status.lastConnectionError}) سیستم به صورت خودکار روی SQLite داخلی (${status.databasePathOrHost}) در حال ذخیره‌سازی پایدار است (تست نوشتن/خواندن در ${latencyMs}ms موفق بود).`
        : `دیتابیس SQLite داخلی (${status.databasePathOrHost}) فعال است و تست نوشتن/خواندن واقعی در ${latencyMs} میلی‌ثانیه تایید شد.`,
  };
}

export async function executeReadOnlySql(rawSql: string) {
  const start = Date.now();
  const trimmed = String(rawSql || '').trim();
  if (!trimmed) {
    throw new Error('کوئری SQL نمی‌تواند خالی باشد.');
  }

  const cleanSql = trimmed.replace(/;\s*$/, '').trim();
  if (cleanSql.includes(';')) {
    throw new Error('اجرای هم‌زمان چند دستور SQL (Multi-statement) به دلایل امنیتی مجاز نیست.');
  }

  if (!/^SELECT\b/i.test(cleanSql)) {
    throw new Error('این کنسول فقط دستورات SELECT را برای بررسی داده‌ها می‌پذیرد.');
  }

  const forbiddenPattern =
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|ATTACH|DETACH|PRAGMA\s+writable_schema|VACUUM)\b/i;
  if (forbiddenPattern.test(cleanSql)) {
    throw new Error('دستورات تغییردهنده ساختار یا داده در کنسول فقط‌خواندنی مجاز نیستند.');
  }

  const finalSql = /\bLIMIT\s+\d+\s*$/i.test(cleanSql) ? cleanSql : `${cleanSql} LIMIT 50`;
  const rows = await dbQuery<Record<string, unknown>>(finalSql);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const executionMs = Date.now() - start;

  return {
    columns,
    rows: rows.slice(0, 50),
    rowCount: rows.length,
    executionMs,
    executedSql: finalSql,
  };
}

function escapeSqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function discoverAllDatabaseTables(): Promise<string[]> {
  const activeEngine = getActiveEngine();
  try {
    if (activeEngine === 'postgresql') {
      const rows = await dbQuery<{ name: string }>(
        `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC`
      );
      return rows
        .map((r) => String(r.name || ''))
        .filter((n) => /^[a-zA-Z0-9_]+$/.test(n) && n !== 'backup_history');
    }
    const rows = await dbQuery<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
    );
    return rows
      .map((r) => String(r.name || ''))
      .filter((n) => /^[a-zA-Z0-9_]+$/.test(n) && n !== 'backup_history');
  } catch {
    return [
      'users',
      'products',
      'articles',
      'orders',
      'coupons',
      'media_items',
      'payment_gateways',
      'sms_triggers',
      'site_settings',
      'rbac_permission_hashes',
    ];
  }
}

export async function generateFullBackupPayload(): Promise<{
  tables: Record<string, Record<string, unknown>[]>;
  jsonString: string;
  sqlString: string;
}> {
  const activeEngine = getActiveEngine();
  const exportedTables: Record<string, Record<string, unknown>[]> = {};
  const tableNames = await discoverAllDatabaseTables();

  for (const tName of tableNames) {
    exportedTables[tName] = await dbQuery<Record<string, unknown>>(`SELECT * FROM ${tName}`);
  }

  const envelope = {
    meta: {
      service: 'skill98-platform',
      engine: activeEngine,
      exportedAt: new Date().toISOString(),
      version: '2.6',
      tablesCount: tableNames.length,
    },
    tables: exportedTables,
  };

  const jsonString = JSON.stringify(envelope, null, 2);

  const sqlLines: string[] = [
    `-- Skill 98 Full Relational SQL Backup`,
    `-- Exported At: ${envelope.meta.exportedAt} (Engine: ${activeEngine})`,
    `BEGIN;`,
  ];

  for (const tName of tableNames) {
    const rows = exportedTables[tName] || [];
    sqlLines.push(`\n-- Table: ${tName} (${rows.length} rows)`);
    sqlLines.push(`DELETE FROM ${tName};`);
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const vals = cols.map((c) => escapeSqlLiteral(row[c]));
      sqlLines.push(`INSERT INTO ${tName} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
    }
  }
  sqlLines.push(`COMMIT;`);

  return {
    tables: exportedTables,
    jsonString,
    sqlString: sqlLines.join('\n'),
  };
}

export async function sendSmtpBackupEmail(
  cfg: Pick<
    BackupScheduleConfig,
    'smtpHost' | 'smtpPort' | 'smtpUser' | 'smtpPass' | 'smtpTargetEmail'
  >,
  subject: string,
  textBody: string,
  attachment?: { filename: string; content: Buffer | string }
) {
  const smtpHost = (cfg.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(cfg.smtpPort || process.env.SMTP_PORT || 587);
  const smtpUser = (cfg.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = (cfg.smtpPass || process.env.SMTP_PASS || '').trim();
  const smtpTargetEmail = (cfg.smtpTargetEmail || smtpUser).trim();

  if (!smtpUser || !smtpPass || !smtpTargetEmail) {
    throw new Error('نام کاربری جیمیل، رمز برنامه (App Password) و ایمیل مقصد باید تکمیل شوند.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.verify();
  const info = await transporter.sendMail({
    from: `"Skill 98 Backup" <${smtpUser}>`,
    to: smtpTargetEmail,
    subject,
    text: textBody,
    attachments: attachment
      ? [{ filename: attachment.filename, content: attachment.content }]
      : undefined,
  });

  return info.messageId;
}

export async function sendBaleNotification(
  token: string,
  chatId: string,
  textOrCaption: string,
  attachment?: { filename: string; content: Buffer }
) {
  const cleanToken = String(token || '').trim();
  const cleanChatId = String(chatId || '').trim();
  if (!cleanToken || !cleanChatId) {
    throw new Error('توکن ربات بله (Bot Token) و شناسه چت/کانال (Chat ID) الزامی هستند.');
  }

  if (attachment) {
    const form = new FormData();
    form.append('chat_id', cleanChatId);
    form.append('caption', textOrCaption);
    const blob = new Blob([new Uint8Array(attachment.content)], {
      type: 'application/octet-stream',
    });
    form.append('document', blob, attachment.filename);

    const resp = await fetch(`https://tapi.bale.bot/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    const data = (await resp.json()) as { ok?: boolean; description?: string };
    if (!resp.ok || data.ok === false) {
      throw new Error(data.description || `خطا در ارسال سند به ربات بله (${resp.status})`);
    }
    return data;
  }

  const resp = await fetch(`https://tapi.bale.bot/bot${cleanToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text: textOrCaption,
    }),
  });
  const data = (await resp.json()) as { ok?: boolean; description?: string };
  if (!resp.ok || data.ok === false) {
    throw new Error(data.description || `خطا در ارسال پیام تست به ربات بله (${resp.status})`);
  }
  return data;
}

export async function createBackupSnapshot(params: {
  format: 'json' | 'sql';
  triggerType: 'manual' | 'scheduled';
  destination?: string;
  dispatchRemote?: boolean;
}): Promise<{ item: BackupHistoryItem; content: string; dispatchReport: string[] }> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const { jsonString, sqlString } = await generateFullBackupPayload();
  const content = params.format === 'sql' ? sqlString : jsonString;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `skill98_backup_${stamp}.${params.format}`;
  const filePath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filePath, content, 'utf-8');
  const sizeBytes = Buffer.byteLength(content, 'utf-8');
  const id = `bkp_${Date.now()}_${crypto.randomInt(100, 999)}`;
  const nowIso = new Date().toISOString();
  const nowFa = formatPersianDateTime(nowIso);
  const dispatchReport: string[] = [];
  let destLabel = params.destination || `ذخیره و دانلود محلی (${params.format.toUpperCase()})`;

  if (params.dispatchRemote) {
    const cfg = await getSetting<BackupScheduleConfig>(
      'backup_schedule_config',
      DEFAULT_BACKUP_SCHEDULE_CONFIG
    );
    const destParts: string[] = ['دیسک سرور (data/backups)'];

    const effectiveSmtpUser = (cfg.smtpUser || process.env.SMTP_USER || '').trim();
    const effectiveSmtpPass = (cfg.smtpPass || process.env.SMTP_PASS || '').trim();
    const effectiveSmtpTarget = (cfg.smtpTargetEmail || effectiveSmtpUser).trim();

    if (cfg.smtpEnabled && effectiveSmtpUser && effectiveSmtpPass && effectiveSmtpTarget) {
      try {
        await sendSmtpBackupEmail(
          cfg,
          `Skill 98 Auto Backup (${nowFa})`,
          `فایل پشتیبان کامل دیتابیس اسکیل ۹۸ پیوست است.\nتاریخ: ${nowFa}\nفایل: ${filename}`,
          { filename, content }
        );
        destParts.push(`ایمیل (${effectiveSmtpTarget})`);
        dispatchReport.push('ایمیل با موفقیت ارسال شد.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dispatchReport.push(`خطای ایمیل: ${msg}`);
      }
    }

    if (cfg.baleEnabled && cfg.baleBotToken && cfg.baleChatId) {
      try {
        await sendBaleNotification(
          cfg.baleBotToken,
          cfg.baleChatId,
          `بکاپ خودکار دیتابیس اسکیل ۹۸\nزمان: ${nowFa}`,
          { filename, content: Buffer.from(content, 'utf-8') }
        );
        destParts.push('پیام‌رسان بله');
        dispatchReport.push('فایل بکاپ به ربات بله ارسال شد.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dispatchReport.push(`خطای بله: ${msg}`);
      }
    }

    destLabel = destParts.join(' + ');
  }

  await dbExec(
    `INSERT INTO backup_history (id, filename, format, trigger_type, destination, status, size_bytes, file_path, created_at, created_at_fa)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      filename,
      params.format,
      params.triggerType,
      destLabel,
      'success',
      sizeBytes,
      filePath,
      nowIso,
      nowFa,
    ]
  );

  await writeSystemLog({
    level: 'success',
    category: 'backup',
    title: `تهیه نسخه پشتیبان (${filename})`,
    detail: `نسخه پشتیبان ${params.format.toUpperCase()} با حجم ${Math.round(sizeBytes / 1024)} کیلوبایت ایجاد شد.`,
    sqlOrEndpoint: `POST /api/admin/backup/create (${params.triggerType})`,
    payload: { filename, sizeBytes, destination: destLabel, dispatchReport },
  });

  return {
    item: {
      id,
      filename,
      format: params.format,
      triggerType: params.triggerType,
      destination: destLabel,
      status: 'success',
      sizeBytes,
      createdAtIso: nowIso,
      createdAtFa: nowFa,
    },
    content,
    dispatchReport,
  };
}

export async function getBackupHistory(): Promise<BackupHistoryItem[]> {
  const rows = await dbQuery<Record<string, unknown>>(
    'SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 50'
  );
  return rows.map((r) => ({
    id: String(r.id),
    filename: String(r.filename),
    format: r.format === 'sql' ? 'sql' : 'json',
    triggerType: r.trigger_type === 'scheduled' ? 'scheduled' : 'manual',
    destination: String(r.destination || ''),
    status: r.status === 'failed' ? 'failed' : 'success',
    sizeBytes: Number(r.size_bytes || 0),
    createdAtIso: String(r.created_at || ''),
    createdAtFa: String(r.created_at_fa || ''),
  }));
}

export async function getBackupFileById(
  id: string
): Promise<{ filename: string; content: string } | null> {
  const rows = await dbQuery<{ filename: string; file_path: string }>(
    'SELECT filename, file_path FROM backup_history WHERE id = $1 LIMIT 1',
    [id]
  );
  if (!rows[0]) return null;
  if (!fs.existsSync(rows[0].file_path)) return null;
  return {
    filename: rows[0].filename,
    content: fs.readFileSync(rows[0].file_path, 'utf-8'),
  };
}

export async function restoreBackupFromContent(rawContent: string, formatHint?: 'json' | 'sql') {
  const trimmed = String(rawContent || '').trim();
  if (!trimmed) {
    throw new Error('فایل پشتیبان خالی است.');
  }

  const detectedFormat: 'json' | 'sql' = formatHint || (trimmed.startsWith('{') ? 'json' : 'sql');

  const discoveredTables = await discoverAllDatabaseTables();
  const allowedTables = new Set(discoveredTables);

  let restoredRows = 0;

  if (detectedFormat === 'json') {
    const parsed = JSON.parse(trimmed) as {
      tables?: Record<string, Record<string, unknown>[]>;
    };
    if (!parsed?.tables || typeof parsed.tables !== 'object') {
      throw new Error('ساختار فایل JSON پشتیبان معتبر نیست.');
    }

    for (const [tableName, rows] of Object.entries(parsed.tables)) {
      if (!allowedTables.has(tableName) || !Array.isArray(rows)) continue;
      await dbExec(`DELETE FROM ${tableName}`);
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => /^[a-zA-Z0-9_]+$/.test(c));
        if (cols.length === 0) continue;
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map((c) => row[c] ?? null);
        await dbExec(
          `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
          values
        );
        restoredRows += 1;
      }
    }
  } else {
    const lines = trimmed
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--') && !/^(BEGIN|COMMIT)$/i.test(s));

    for (const stmt of lines) {
      if (/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)$/i.test(stmt)) {
        const tName = stmt.replace(/^DELETE\s+FROM\s+/i, '').trim();
        if (!allowedTables.has(tName)) continue;
        await dbExec(`DELETE FROM ${tName}`);
      } else if (/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(/i.test(stmt)) {
        const match = stmt.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(/i);
        const tName = match?.[1] || '';
        if (!allowedTables.has(tName)) continue;
        await dbExec(stmt);
        restoredRows += 1;
      }
    }
  }

  await writeSystemLog({
    level: 'success',
    category: 'backup',
    title: `بازیابی اطلاعات از فایل ${detectedFormat.toUpperCase()}`,
    detail: `تعداد ${restoredRows.toLocaleString('fa-IR')} رکورد در جداول سامانه بازیابی و ثبت شد.`,
    sqlOrEndpoint: 'POST /api/admin/backup/restore',
    payload: { format: detectedFormat, restoredRows },
  });

  return { format: detectedFormat, restoredRows };
}

export async function runScheduledBackupTick() {
  try {
    const cfg = await getSetting<BackupScheduleConfig>(
      'backup_schedule_config',
      DEFAULT_BACKUP_SCHEDULE_CONFIG
    );
    if (!cfg.autoDailyEnabled) return;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (cfg.lastAutoBackupDate === todayStr) return;
    if (now.getHours() !== Number(cfg.scheduleHour || 3)) return;

    const fmtPref = cfg.autoBackupFormat || 'both';
    if (fmtPref === 'sql' || fmtPref === 'both') {
      await createBackupSnapshot({
        format: 'sql',
        triggerType: 'scheduled',
        dispatchRemote: true,
      });
    }
    if (fmtPref === 'json' || fmtPref === 'both') {
      await createBackupSnapshot({
        format: 'json',
        triggerType: 'scheduled',
        dispatchRemote: fmtPref === 'json',
      });
    }
    await setSetting('backup_schedule_config', {
      ...cfg,
      lastAutoBackupDate: todayStr,
    });
  } catch (err) {
    await writeSystemLog({
      level: 'error',
      category: 'backup',
      title: 'خطا در اجرای بکاپ زمان‌بندی‌شده روزانه',
      detail: err instanceof Error ? err.message : String(err),
      sqlOrEndpoint: 'CRON / DAILY AUTO BACKUP',
    });
  }
}
