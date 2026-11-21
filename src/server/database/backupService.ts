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

function escapeSqlLiteral(val: unknown, engine: SqlEngineKind): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') {
    return engine === 'postgresql' ? (val ? 'TRUE' : 'FALSE') : val ? '1' : '0';
  }
  if (val instanceof Date) {
    return `'${val.toISOString().replace(/'/g, "''")}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`شناسه نامعتبر در دیتابیس: ${name}`);
  }
  return `"${name}"`;
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

async function getActualTableColumns(tableName: string): Promise<string[]> {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) return [];
  const activeEngine = getActiveEngine();
  if (activeEngine === 'postgresql') {
    const rows = await dbQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position ASC`,
      [tableName]
    );
    return rows
      .map((r) => String(r.column_name || ''))
      .filter((c) => /^[a-zA-Z0-9_]+$/.test(c));
  }
  const rows = await dbQuery<{ name: string }>(`PRAGMA table_info(${quoteIdent(tableName)})`);
  return rows
    .map((r) => String(r.name || ''))
    .filter((c) => /^[a-zA-Z0-9_]+$/.test(c));
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
    exportedTables[tName] = await dbQuery<Record<string, unknown>>(
      `SELECT * FROM ${quoteIdent(tName)}`
    );
  }

  const envelope = {
    meta: {
      service: 'skill98-platform',
      engine: activeEngine,
      exportedAt: new Date().toISOString(),
      version: '2.8',
      tablesCount: tableNames.length,
    },
    tables: exportedTables,
  };

  const jsonString = JSON.stringify(envelope, null, 2);

  const sqlLines: string[] = [
    `-- Skill 98 Full Relational SQL Backup (PostgreSQL & SQLite Compatible)`,
    `-- Exported At: ${envelope.meta.exportedAt} (Engine: ${activeEngine})`,
    `BEGIN;`,
  ];

  // Emit TRUNCATE statements upfront so PostgreSQL CASCADE clears cleanly before inserts
  for (const tName of tableNames) {
    sqlLines.push(`TRUNCATE TABLE ${quoteIdent(tName)} RESTART IDENTITY CASCADE;`);
  }

  for (const tName of tableNames) {
    const rows = exportedTables[tName] || [];
    sqlLines.push(`\n-- Table: ${tName} (${rows.length} rows)`);
    for (const row of rows) {
      const cols = Object.keys(row).filter((c) => /^[a-zA-Z0-9_]+$/.test(c));
      if (cols.length === 0) continue;
      const quotedCols = cols.map((c) => quoteIdent(c)).join(', ');
      const vals = cols.map((c) => escapeSqlLiteral(row[c], activeEngine));
      sqlLines.push(`INSERT INTO ${quoteIdent(tName)} (${quotedCols}) VALUES (${vals.join(', ')});`);
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

function sanitizeBaleBotToken(token: string): string {
  return String(token || '')
    .trim()
    .replace(/^bot/i, '')
    .replace(/[^\w:-]/g, '');
}

async function parseBaleApiResponse(
  resp: Response,
  fallbackError: string
): Promise<{ ok?: boolean; description?: string; result?: unknown; rawText?: string }> {
  const rawText = await resp.text().catch(() => '');
  let parsed: { ok?: boolean; description?: string; result?: unknown } = {};
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as { ok?: boolean; description?: string; result?: unknown };
    } catch {
      parsed = { ok: false, description: rawText.slice(0, 220) };
    }
  }
  if (!resp.ok || parsed.ok === false) {
    throw new Error(
      parsed.description || `${fallbackError} (HTTP ${resp.status})`
    );
  }
  return { ...parsed, rawText };
}

export async function sendBaleNotification(
  token: string,
  chatId: string,
  textOrCaption: string,
  attachment?: { filename: string; content: Buffer }
) {
  const cleanToken = sanitizeBaleBotToken(token);
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

    const resp = await fetch(`https://tapi.bale.ai/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    return parseBaleApiResponse(resp, 'خطا در ارسال فایل بکاپ به ربات بله');
  }

  const resp = await fetch(`https://tapi.bale.ai/bot${cleanToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text: textOrCaption,
    }),
  });
  return parseBaleApiResponse(resp, 'خطا در ارسال پیام به ربات بله');
}

export async function createBackupSnapshot(params: {
  format: 'json' | 'sql';
  triggerType: 'manual' | 'scheduled';
  destination?: string;
  dispatchRemote?: boolean;
  scheduleOverride?: Partial<BackupScheduleConfig>;
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
    const savedCfg = await getSetting<BackupScheduleConfig>(
      'backup_schedule_config',
      DEFAULT_BACKUP_SCHEDULE_CONFIG
    );
    const cfg: BackupScheduleConfig = {
      ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
      ...savedCfg,
      ...(params.scheduleOverride || {}),
    };
    const destParts: string[] = ['دیسک سرور (data/backups)'];

    const effectiveSmtpUser = (cfg.smtpUser || process.env.SMTP_USER || '').trim();
    const effectiveSmtpPass = (cfg.smtpPass || process.env.SMTP_PASS || '').trim();
    const effectiveSmtpTarget = (cfg.smtpTargetEmail || effectiveSmtpUser).trim();

    if (cfg.smtpEnabled) {
      if (!effectiveSmtpUser || !effectiveSmtpPass || !effectiveSmtpTarget) {
        dispatchReport.push('خطای ایمیل: تنظیمات SMTP (نام کاربری، رمز برنامه یا ایمیل مقصد) ناقص است.');
      } else {
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
    }

    if (cfg.baleEnabled) {
      if (!cfg.baleBotToken?.trim() || !cfg.baleChatId?.trim()) {
        dispatchReport.push('خطای بله: توکن ربات بله یا شناسه چت (Chat ID) وارد نشده است.');
      } else {
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
    }

    if (!cfg.smtpEnabled && !cfg.baleEnabled) {
      dispatchReport.push('هیچ مقصد ارسال خارجی (ایمیل یا بله) فعال نیست؛ بکاپ فقط روی سرور ذخیره شد.');
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

export interface BackupRestoreResult {
  format: 'json' | 'sql';
  engine: SqlEngineKind;
  restoredTables: number;
  restoredTableNames: string[];
  restoredRows: number;
  attemptedRows: number;
  errors: string[];
  errorCount: number;
}

export class BackupRestoreError extends Error {
  statusCode: number;
  details: BackupRestoreResult;

  constructor(statusCode: number, message: string, details: BackupRestoreResult) {
    super(message);
    this.name = 'BackupRestoreError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizeRestoreParamValue(val: unknown): unknown {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

/**
 * Quote-aware SQL statement splitter that preserves semicolons and newlines
 * inside single-quoted string literals and double-quoted identifiers.
 */
function splitSqlStatements(rawSql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < rawSql.length; i++) {
    const ch = rawSql[i];
    const next = rawSql[i + 1] || '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        current += '\n';
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      current += ch;
      if (inSingle && next === "'") {
        current += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (ch === '"' && !inSingle) {
      current += ch;
      if (inDouble && next === '"') {
        current += next;
        i += 1;
      } else {
        inDouble = !inDouble;
      }
      continue;
    }

    if (ch === ';' && !inSingle && !inDouble) {
      const trimmedStmt = current.trim();
      if (trimmedStmt) {
        statements.push(trimmedStmt);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements.filter((s) => !/^(BEGIN|COMMIT|END|ROLLBACK)(\s+TRANSACTION)?$/i.test(s));
}

async function clearTargetTable(tableName: string, engine: SqlEngineKind): Promise<void> {
  const quoted = quoteIdent(tableName);
  if (engine === 'postgresql') {
    await dbExec(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  } else {
    await dbExec(`DELETE FROM ${quoted}`);
  }
}

export async function restoreBackupFromContent(
  rawContent: string,
  formatHint?: 'json' | 'sql'
): Promise<BackupRestoreResult> {
  const trimmed = String(rawContent || '').trim();
  if (!trimmed) {
    throw new Error('فایل پشتیبان خالی است.');
  }

  const activeEngine = getActiveEngine();
  const detectedFormat: 'json' | 'sql' =
    formatHint || (trimmed.startsWith('{') ? 'json' : 'sql');

  const discoveredTables = await discoverAllDatabaseTables();
  const allowedTables = new Set(discoveredTables);

  const restoredTablesSet = new Set<string>();
  let restoredRows = 0;
  let attemptedRows = 0;
  const errors: string[] = [];
  let errorCount = 0;

  const pushError = (msg: string) => {
    errorCount += 1;
    if (errors.length < 50) {
      errors.push(msg);
    }
  };

  if (detectedFormat === 'json') {
    let parsed: { tables?: Record<string, Record<string, unknown>[]> };
    try {
      parsed = JSON.parse(trimmed) as {
        tables?: Record<string, Record<string, unknown>[]>;
      };
    } catch (err) {
      throw new Error(
        `فایل JSON پشتیبان قابل خواندن نیست: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!parsed?.tables || typeof parsed.tables !== 'object') {
      throw new Error('ساختار فایل JSON پشتیبان معتبر نیست (کلید tables یافت نشد).');
    }

    const entries = Object.entries(parsed.tables);
    const validEntries: [string, Record<string, unknown>[]][] = [];

    for (const [tableName, rows] of entries) {
      if (!Array.isArray(rows)) continue;
      if (!allowedTables.has(tableName)) {
        if (rows.length > 0) {
          pushError(
            `جدول "${tableName}" در اسکیمای فعلی دیتابیس وجود ندارد (${rows.length} رکورد رد شد).`
          );
        }
        continue;
      }
      validEntries.push([tableName, rows]);
    }

    // Pass 1: Clear all target tables BEFORE inserting so PostgreSQL TRUNCATE CASCADE never wipes newly inserted tables
    for (const [tableName] of validEntries) {
      try {
        await clearTargetTable(tableName, activeEngine);
      } catch (err) {
        pushError(
          `[${tableName}] خطا در پاک‌سازی جدول پیش از بازیابی: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    // Pass 2: Schema-tolerant column intersection + parameterized $1..$n inserts
    for (const [tableName, rows] of validEntries) {
      if (rows.length === 0) continue;

      let actualCols: string[] = [];
      try {
        actualCols = await getActualTableColumns(tableName);
      } catch (err) {
        pushError(
          `[${tableName}] خطا در خواندن ستون‌های جدول: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        continue;
      }

      if (actualCols.length === 0) {
        pushError(`[${tableName}] هیچ ستونی برای جدول در دیتابیس یافت نشد.`);
        continue;
      }

      const actualColSet = new Set(actualCols);
      const quotedTable = quoteIdent(tableName);

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (!row || typeof row !== 'object') continue;
        attemptedRows += 1;

        const cols = Object.keys(row).filter(
          (c) => /^[a-zA-Z0-9_]+$/.test(c) && actualColSet.has(c)
        );
        if (cols.length === 0) {
          pushError(
            `[${tableName} #${rowIdx + 1}] هیچ ستون مشترکی بین رکورد بکاپ و اسکیمای فعلی یافت نشد.`
          );
          continue;
        }

        const quotedCols = cols.map((c) => quoteIdent(c)).join(', ');
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map((c) => normalizeRestoreParamValue(row[c]));

        try {
          await dbExec(
            `INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${placeholders})`,
            values
          );
          restoredRows += 1;
          restoredTablesSet.add(tableName);
        } catch (err) {
          pushError(
            `[${tableName} #${rowIdx + 1}] ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    }
  } else {
    const statements = splitSqlStatements(trimmed);
    const clearTablesOrder: string[] = [];
    const clearTablesSeen = new Set<string>();
    const insertStatements: { tableName: string; sql: string }[] = [];

    for (const stmt of statements) {
      const truncateMatch = stmt.match(
        /^TRUNCATE\s+(?:TABLE\s+)?(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+))\b/i
      );
      if (truncateMatch) {
        const tName = truncateMatch[1] || truncateMatch[2] || '';
        if (!allowedTables.has(tName)) {
          pushError(`جدول "${tName}" برای TRUNCATE در دیتابیس فعلی یافت نشد.`);
          continue;
        }
        if (!clearTablesSeen.has(tName)) {
          clearTablesSeen.add(tName);
          clearTablesOrder.push(tName);
        }
        continue;
      }

      const deleteMatch = stmt.match(
        /^DELETE\s+FROM\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+))\s*$/i
      );
      if (deleteMatch) {
        const tName = deleteMatch[1] || deleteMatch[2] || '';
        if (!allowedTables.has(tName)) {
          pushError(`جدول "${tName}" برای DELETE در دیتابیس فعلی یافت نشد.`);
          continue;
        }
        if (!clearTablesSeen.has(tName)) {
          clearTablesSeen.add(tName);
          clearTablesOrder.push(tName);
        }
        continue;
      }

      const insertMatch = stmt.match(
        /^INSERT\s+INTO\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+))\s*\(/i
      );
      if (insertMatch) {
        const tName = insertMatch[1] || insertMatch[2] || '';
        if (!allowedTables.has(tName)) {
          attemptedRows += 1;
          pushError(`جدول "${tName}" برای INSERT در اسکیمای فعلی دیتابیس یافت نشد.`);
          continue;
        }
        insertStatements.push({ tableName: tName, sql: stmt });
        continue;
      }

      pushError(`دستور غیرمجاز یا ناشناخته در فایل SQL رد شد: ${stmt.slice(0, 80)}`);
    }

    // Pass 1: Clear target tables cleanly before executing INSERT statements
    for (const tName of clearTablesOrder) {
      try {
        await clearTargetTable(tName, activeEngine);
      } catch (err) {
        pushError(
          `[${tName}] خطا در پاک‌سازی جدول: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Pass 2: Execute INSERT statements and track every error transparently
    for (let i = 0; i < insertStatements.length; i++) {
      const item = insertStatements[i];
      attemptedRows += 1;
      try {
        await dbExec(item.sql);
        restoredRows += 1;
        restoredTablesSet.add(item.tableName);
      } catch (err) {
        pushError(
          `[${item.tableName} SQL #${i + 1}] ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  const restoredTableNames = Array.from(restoredTablesSet);
  const result: BackupRestoreResult = {
    format: detectedFormat,
    engine: activeEngine,
    restoredTables: restoredTableNames.length,
    restoredTableNames,
    restoredRows,
    attemptedRows,
    errors,
    errorCount,
  };

  // Never allow a non-empty backup to silently succeed with 0 restored rows
  if (attemptedRows > 0 && restoredRows === 0) {
    const firstErr = errors[0] || 'هیچ رکوردی در دیتابیس ثبت نشد.';
    const errorMessage = `بازیابی ناموفق بود (۰ از ${attemptedRows.toLocaleString(
      'fa-IR'
    )} رکورد بازیابی شد): ${firstErr}`;

    await writeSystemLog({
      level: 'error',
      category: 'backup',
      title: `شکست بازیابی بکاپ ${detectedFormat.toUpperCase()} (۰ رکورد)`,
      detail: errorMessage,
      sqlOrEndpoint: 'POST /api/admin/backup/restore',
      payload: result,
    });

    throw new BackupRestoreError(422, errorMessage, result);
  }

  await writeSystemLog({
    level: errorCount > 0 ? 'warning' : 'success',
    category: 'backup',
    title: `بازیابی اطلاعات از فایل ${detectedFormat.toUpperCase()}`,
    detail: `تعداد ${restoredRows.toLocaleString('fa-IR')} رکورد در ${restoredTableNames.length.toLocaleString(
      'fa-IR'
    )} جدول بازیابی شد.${errorCount > 0 ? ` (${errorCount} خطای جزئی)` : ''}`,
    sqlOrEndpoint: 'POST /api/admin/backup/restore',
    payload: result,
  });

  return result;
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
