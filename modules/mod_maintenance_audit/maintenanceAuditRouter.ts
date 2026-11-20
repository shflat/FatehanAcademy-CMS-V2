import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { getSetting, setSetting } from '../../src/server/database/settingsLogsRepo.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

export interface MaintenanceModeConfig {
  enabled: boolean;
  titleFa: string;
  messageFa: string;
  etaTextFa: string;
  allowAdminBypass: boolean;
}

const DEFAULT_MAINTENANCE_CONFIG: MaintenanceModeConfig = {
  enabled: false,
  titleFa: 'سامانه در حال به‌روزرسانی برنامه‌ریزی‌شده است',
  messageFa: 'لطفاً چند دقیقه دیگر مجدداً تلاش کنید. دسترسی مدیران سامانه همچنان فعال است.',
  etaTextFa: 'بازگشت تا ۳۰ دقیقه آینده',
  allowAdminBypass: true,
};

let auditSchemaReady = false;

async function ensureAuditSchema() {
  if (auditSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_audit_trail (
      id TEXT PRIMARY KEY,
      actor_phone TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action_key TEXT NOT NULL,
      target_entity TEXT NOT NULL,
      summary_fa TEXT NOT NULL,
      ip_masked TEXT,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  auditSchemaReady = true;
}

export async function recordAuditTrailEvent(params: {
  actorPhone: string;
  actorRole: string;
  actionKey: string;
  targetEntity: string;
  summaryFa: string;
  ipMasked?: string;
}) {
  try {
    await ensureAuditSchema();
    const now = new Date();
    const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);
    await dbExec(
      `INSERT INTO mod_audit_trail (id, actor_phone, actor_role, action_key, target_entity, summary_fa, ip_masked, created_at_fa, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        params.actorPhone,
        params.actorRole,
        params.actionKey,
        params.targetEntity,
        params.summaryFa,
        params.ipMasked || '127.0.0.x',
        nowFa,
        now.toISOString(),
      ]
    );
  } catch {
    // non-fatal
  }
}

export function createMaintenanceAuditRouter() {
  const router = express.Router();

  // Public status check for storefront Maintenance Mode overlay
  router.get('/api/v1/modules/maintenance/status', async (_req, res) => {
    try {
      const cfg = await getSetting<MaintenanceModeConfig>(
        'mod_maintenance_mode',
        DEFAULT_MAINTENANCE_CONFIG
      );
      res.json({ ok: true, maintenance: cfg });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Status error' });
    }
  });

  router.get('/api/v1/modules/maintenance/admin/overview', requireAdmin, async (_req, res) => {
    try {
      await ensureAuditSchema();
      const maintenance = await getSetting<MaintenanceModeConfig>(
        'mod_maintenance_mode',
        DEFAULT_MAINTENANCE_CONFIG
      );
      const events = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_audit_trail ORDER BY created_at DESC LIMIT 120'
      );
      res.json({ ok: true, maintenance, events });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Audit error' });
    }
  });

  router.post('/api/v1/modules/maintenance/admin/config', requireAdmin, async (req, res) => {
    try {
      await ensureAuditSchema();
      const body = (req.body || {}) as Partial<MaintenanceModeConfig>;
      const next: MaintenanceModeConfig = {
        enabled: Boolean(body.enabled),
        titleFa: String(body.titleFa || DEFAULT_MAINTENANCE_CONFIG.titleFa).trim(),
        messageFa: String(body.messageFa || DEFAULT_MAINTENANCE_CONFIG.messageFa).trim(),
        etaTextFa: String(body.etaTextFa || DEFAULT_MAINTENANCE_CONFIG.etaTextFa).trim(),
        allowAdminBypass: body.allowAdminBypass !== false,
      };
      await setSetting('mod_maintenance_mode', next);
      await recordAuditTrailEvent({
        actorPhone: req.authUser?.phone || 'admin',
        actorRole: req.authUser?.role || 'admin',
        actionKey: next.enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
        targetEntity: 'site_maintenance',
        summaryFa: next.enabled
          ? 'حالت تعمیرات و در دست بروزرسانی سایت فعال شد.'
          : 'حالت تعمیرات غیرفعال و سایت برای عموم باز شد.',
      });
      res.json({ ok: true, maintenance: next });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save error' });
    }
  });

  return router;
}
