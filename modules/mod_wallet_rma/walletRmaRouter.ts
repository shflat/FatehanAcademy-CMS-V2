import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';

let walletSchemaReady = false;

async function ensureWalletRmaSchema() {
  if (walletSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_wallet_transactions (
      id TEXT PRIMARY KEY,
      user_phone TEXT NOT NULL,
      user_name TEXT,
      tx_type TEXT NOT NULL,
      amount_toman INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_rma_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      reason TEXT NOT NULL,
      refund_amount INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  walletSchemaReady = true;
}

export function createWalletRmaRouter() {
  const router = express.Router();

  router.get('/api/v1/modules/wallet-rma/overview', requireAdmin, async (_req, res) => {
    try {
      await ensureWalletRmaSchema();
      const transactions = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_wallet_transactions ORDER BY created_at DESC LIMIT 100'
      );
      const rmaRequests = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_rma_requests ORDER BY created_at DESC LIMIT 100'
      );
      const balances = await dbQuery<{ user_phone: string; balance: number }>(
        `SELECT user_phone,
          SUM(CASE WHEN tx_type IN ('credit', 'cashback', 'refund') THEN amount_toman ELSE -amount_toman END) AS balance
         FROM mod_wallet_transactions GROUP BY user_phone ORDER BY balance DESC LIMIT 50`
      );
      res.json({ ok: true, transactions, rmaRequests, balances });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Wallet error' });
    }
  });

  router.post('/api/v1/modules/wallet-rma/transaction', requireAdmin, async (req, res) => {
    try {
      await ensureWalletRmaSchema();
      const { userPhone, userName, txType, amountToman, reason } = (req.body || {}) as {
        userPhone?: string;
        userName?: string;
        txType?: 'credit' | 'debit' | 'cashback' | 'refund';
        amountToman?: number;
        reason?: string;
      };
      if (!userPhone?.trim() || !amountToman || Number(amountToman) <= 0) {
        res.status(400).json({ ok: false, error: 'شماره موبایل و مبلغ معتبر الزامی است.' });
        return;
      }
      const id = `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_wallet_transactions (id, user_phone, user_name, tx_type, amount_toman, reason, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          userPhone.trim().slice(0, 32),
          String(userName || 'کاربر').trim().slice(0, 80),
          txType || 'credit',
          Math.round(Number(amountToman)),
          String(reason || 'شارژ دستی کیف پول').trim().slice(0, 240),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Tx error' });
    }
  });

  router.post('/api/v1/modules/wallet-rma/rma', async (req, res) => {
    try {
      await ensureWalletRmaSchema();
      const { orderId, userPhone, reason, refundAmount } = (req.body || {}) as {
        orderId?: string;
        userPhone?: string;
        reason?: string;
        refundAmount?: number;
      };
      if (!orderId?.trim() || !userPhone?.trim() || !reason?.trim()) {
        res.status(400).json({ ok: false, error: 'شماره سفارش، موبایل و علت مرجوعی الزامی است.' });
        return;
      }
      const id = `rma_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_rma_requests (id, order_id, user_phone, reason, refund_amount, status, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
        [
          id,
          orderId.trim(),
          userPhone.trim(),
          reason.trim(),
          Math.max(0, Math.round(Number(refundAmount || 0))),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'RMA error' });
    }
  });

  router.post('/api/v1/modules/wallet-rma/rma/:id/resolve', requireAdmin, async (req, res) => {
    try {
      await ensureWalletRmaSchema();
      const { status, adminNote, creditWallet } = (req.body || {}) as {
        status?: 'approved_refunded' | 'rejected';
        adminNote?: string;
        creditWallet?: boolean;
      };
      const rows = await dbQuery<{ id: string; user_phone: string; refund_amount: number; order_id: string }>(
        'SELECT id, user_phone, refund_amount, order_id FROM mod_rma_requests WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      const rma = rows[0];
      if (!rma) {
        res.status(404).json({ ok: false, error: 'درخواست مرجوعی یافت نشد.' });
        return;
      }
      await dbExec('UPDATE mod_rma_requests SET status = $1, admin_note = $2 WHERE id = $3', [
        status || 'approved_refunded',
        String(adminNote || '').trim(),
        rma.id,
      ]);
      if (status === 'approved_refunded' && creditWallet && Number(rma.refund_amount) > 0) {
        const now = new Date();
        const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);
        await dbExec(
          `INSERT INTO mod_wallet_transactions (id, user_phone, user_name, tx_type, amount_toman, reason, created_at_fa, created_at)
           VALUES ($1, $2, 'مشتری', 'refund', $3, $4, $5, $6)`,
          [
            `wtx_ref_${Date.now()}`,
            rma.user_phone,
            Number(rma.refund_amount),
            `عودت وجه سفارش ${rma.order_id}`,
            nowFa,
            now.toISOString(),
          ]
        );
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Resolve error' });
    }
  });

  return router;
}
