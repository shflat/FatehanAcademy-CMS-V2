import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';
import { verifyCaptchaToken } from '../../src/server/core/captchaService.js';

let reviewsSchemaReady = false;

async function ensureReviewsQaSchema() {
  if (reviewsSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_phone TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      comment_text TEXT NOT NULL,
      verified_buyer INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_product_qa (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  reviewsSchemaReady = true;
}

export function createReviewsQaRouter() {
  const router = express.Router();

  // Public approved reviews & Q&A for a product
  router.get('/api/v1/modules/reviews-qa/product/:productId', async (req, res) => {
    try {
      await ensureReviewsQaSchema();
      const pid = String(req.params.productId || '').trim();
      const reviews = await dbQuery<Record<string, unknown>>(
        `SELECT id, product_id, author_name, rating, comment_text, verified_buyer, admin_reply, created_at_fa
         FROM mod_product_reviews WHERE product_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 60`,
        [pid]
      );
      const questions = await dbQuery<Record<string, unknown>>(
        `SELECT id, product_id, author_name, question_text, answer_text, created_at_fa
         FROM mod_product_qa WHERE product_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 60`,
        [pid]
      );
      const avgRating =
        reviews.length > 0
          ? Number(
              (
                reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length
              ).toFixed(1)
            )
          : 5.0;
      res.json({ ok: true, reviews, questions, avgRating, totalReviews: reviews.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Load error' });
    }
  });

  // Public submit review (protected by Native Offline Captcha!)
  router.post('/api/v1/modules/reviews-qa/review', async (req, res) => {
    try {
      await ensureReviewsQaSchema();
      const { productId, authorName, authorPhone, rating, commentText, captchaToken, captchaAnswer } =
        (req.body || {}) as {
          productId?: string;
          authorName?: string;
          authorPhone?: string;
          rating?: number;
          commentText?: string;
          captchaToken?: string;
          captchaAnswer?: string;
        };

      const cap = verifyCaptchaToken(String(captchaToken || ''), String(captchaAnswer || ''));
      if (!cap.valid) {
        res.status(400).json({ ok: false, error: cap.reason });
        return;
      }
      if (!productId?.trim() || !authorName?.trim() || !commentText?.trim()) {
        res.status(400).json({ ok: false, error: 'نام و متن دیدگاه الزامی است.' });
        return;
      }

      // Check verified buyer status
      let verifiedBuyer = 0;
      if (authorPhone?.trim()) {
        const paidOrders = await dbQuery<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM orders WHERE buyer_id = $1 AND status IN ('paid', 'completed')`,
          [authorPhone.trim()]
        );
        if (Number(paidOrders[0]?.cnt || 0) > 0) verifiedBuyer = 1;
      }

      const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now);

      await dbExec(
        `INSERT INTO mod_product_reviews
          (id, product_id, author_name, author_phone, rating, comment_text, verified_buyer, status, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)`,
        [
          id,
          productId.trim(),
          authorName.trim().slice(0, 80),
          authorPhone ? authorPhone.trim().slice(0, 30) : null,
          Math.max(1, Math.min(5, Math.round(Number(rating || 5)))),
          commentText.trim().slice(0, 1200),
          verifiedBuyer,
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, id, pendingModeration: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Submit error' });
    }
  });

  // Public submit Q&A question (protected by Native Offline Captcha)
  router.post('/api/v1/modules/reviews-qa/question', async (req, res) => {
    try {
      await ensureReviewsQaSchema();
      const { productId, authorName, questionText, captchaToken, captchaAnswer } = (req.body || {}) as {
        productId?: string;
        authorName?: string;
        questionText?: string;
        captchaToken?: string;
        captchaAnswer?: string;
      };
      const cap = verifyCaptchaToken(String(captchaToken || ''), String(captchaAnswer || ''));
      if (!cap.valid) {
        res.status(400).json({ ok: false, error: cap.reason });
        return;
      }
      if (!productId?.trim() || !authorName?.trim() || !questionText?.trim()) {
        res.status(400).json({ ok: false, error: 'نام و متن پرسش الزامی است.' });
        return;
      }
      const id = `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_product_qa (id, product_id, author_name, question_text, status, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        [id, productId.trim(), authorName.trim().slice(0, 80), questionText.trim().slice(0, 1000), nowFa, now.toISOString()]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Question error' });
    }
  });

  // Admin moderation list
  router.get('/api/v1/modules/reviews-qa/admin/list', requireAdmin, async (_req, res) => {
    try {
      await ensureReviewsQaSchema();
      const reviews = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_product_reviews ORDER BY created_at DESC LIMIT 100'
      );
      const questions = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_product_qa ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ ok: true, reviews, questions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Admin list error' });
    }
  });

  router.post('/api/v1/modules/reviews-qa/admin/moderate', requireAdmin, async (req, res) => {
    try {
      await ensureReviewsQaSchema();
      const { kind, id, status, replyText } = (req.body || {}) as {
        kind?: 'review' | 'qa';
        id?: string;
        status?: 'approved' | 'rejected' | 'pending';
        replyText?: string;
      };
      if (!id || !status) {
        res.status(400).json({ ok: false, error: 'شناسه و وضعیت الزامی است.' });
        return;
      }
      if (kind === 'qa') {
        await dbExec(
          `UPDATE mod_product_qa SET status = $1, answer_text = COALESCE($2, answer_text) WHERE id = $3`,
          [status, replyText?.trim() || null, id]
        );
      } else {
        await dbExec(
          `UPDATE mod_product_reviews SET status = $1, admin_reply = COALESCE($2, admin_reply) WHERE id = $3`,
          [status, replyText?.trim() || null, id]
        );
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Moderation error' });
    }
  });

  return router;
}
