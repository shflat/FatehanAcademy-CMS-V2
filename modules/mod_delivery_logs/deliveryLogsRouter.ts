import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

export type DeliveryChannelType = 'sms' | 'push' | 'bot' | 'webhook';

export interface DeliveryLogInput {
  channel: DeliveryChannelType;
  provider: string;
  recipient: string;
  eventKey?: string;
  messagePreview: string;
  status: 'sent' | 'failed' | 'sandbox';
  httpStatus?: number;
  errorMessage?: string;
  responsePayload?: unknown;
}

let deliverySchemaReady = false;

export async function ensureDeliveryLogsSchema() {
  if (deliverySchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_delivery_logs (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      provider TEXT NOT NULL,
      recipient TEXT NOT NULL,
      event_key TEXT,
      message_preview TEXT NOT NULL,
      status TEXT NOT NULL,
      http_status INTEGER,
      error_message TEXT,
      response_json TEXT,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  deliverySchemaReady = true;
}

export async function logDeliveryEvent(input: DeliveryLogInput): Promise<string> {
  try {
    await ensureDeliveryLogsSchema();
    const id = `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const createdAtFa = new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(now);
    await dbExec(
      `INSERT INTO mod_delivery_logs
        (id, channel, provider, recipient, event_key, message_preview, status, http_status, error_message, response_json, created_at_fa, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        input.channel,
        String(input.provider || 'system').slice(0, 64),
        String(input.recipient || '-').slice(0, 160),
        input.eventKey ? String(input.eventKey).slice(0, 80) : null,
        String(input.messagePreview || '').slice(0, 500),
        input.status,
        typeof input.httpStatus === 'number' ? input.httpStatus : null,
        input.errorMessage ? String(input.errorMessage).slice(0, 600) : null,
        input.responsePayload ? JSON.stringify(input.responsePayload).slice(0, 2000) : null,
        createdAtFa,
        now.toISOString(),
      ]
    );
    return id;
  } catch {
    return '';
  }
}

export function createDeliveryLogsRouter() {
  const router = express.Router();

  router.get('/api/v1/modules/delivery-logs', requireAdmin, async (req, res) => {
    try {
      await ensureDeliveryLogsSchema();
      const channel = String(req.query.channel || 'all').trim();
      const status = String(req.query.status || 'all').trim();
      const search = String(req.query.q || '').trim().toLowerCase();

      const conditions: string[] = [];
      const params: unknown[] = [];
      let pIdx = 1;

      if (channel && channel !== 'all') {
        conditions.push(`channel = $${pIdx++}`);
        params.push(channel);
      }
      if (status && status !== 'all') {
        conditions.push(`status = $${pIdx++}`);
        params.push(status);
      }
      if (search) {
        conditions.push(
          `(LOWER(recipient) LIKE $${pIdx} OR LOWER(provider) LIKE $${pIdx} OR LOWER(message_preview) LIKE $${pIdx})`
        );
        params.push(`%${search}%`);
        pIdx++;
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbQuery<Record<string, unknown>>(
        `SELECT * FROM mod_delivery_logs ${whereSql} ORDER BY created_at DESC LIMIT 150`,
        params
      );

      const summaryRows = await dbQuery<{ channel: string; status: string; cnt: number }>(
        `SELECT channel, status, COUNT(*) AS cnt FROM mod_delivery_logs GROUP BY channel, status`
      );

      res.json({
        ok: true,
        logs: rows,
        summary: summaryRows,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در خواندن لاگ ارسال‌ها',
      });
    }
  });

  router.delete('/api/v1/modules/delivery-logs/clear', requireAdmin, async (_req, res) => {
    try {
      await ensureDeliveryLogsSchema();
      await dbExec('DELETE FROM mod_delivery_logs');
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در پاک‌سازی لاگ ارسال‌ها',
      });
    }
  });

  return router;
}
