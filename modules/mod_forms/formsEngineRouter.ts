import express from 'express';
import {
  requireAuth,
  requirePermission,
} from '../../src/server/core/permissionsEngine.js';
import { dbExec, dbQuery, writeSystemLog } from '../../src/server/database/index.js';

export function createModFormsRouter(): express.Router {
  const router = express.Router();

  // List all Gravity-Style Multi-Step Forms & recent submissions
  router.get('/api/v1/modules/forms', async (_req, res) => {
    try {
      const formsRows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_forms_definitions ORDER BY updated_at DESC'
      );
      const subRows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_forms_submissions ORDER BY created_at DESC LIMIT 50'
      );
      const forms = formsRows.map((f) => ({
        id: String(f.id),
        slug: String(f.slug),
        titleFa: String(f.title_fa),
        steps: JSON.parse(String(f.steps_json || '[]')),
        conditionalLogic: JSON.parse(String(f.conditional_logic_json || '[]')),
        pricingFormula: String(f.pricing_formula || ''),
        honeypotEnabled: Number(f.honeypot_enabled) === 1,
        smsNotifyEnabled: Number(f.sms_notify_enabled) === 1,
        paymentGatewayLinked: Number(f.payment_gateway_linked) === 1,
        submissionsCount: Number(f.submissions_count || 0),
        updatedAt: String(f.updated_at || ''),
      }));
      const submissions = subRows.map((s) => ({
        id: String(s.id),
        formId: String(s.form_id),
        submitterPhone: String(s.submitter_phone || ''),
        submitterNationalId: String(s.submitter_national_id || ''),
        provinceCity: String(s.province_city || ''),
        calculatedPrice: Number(s.calculated_price || 0),
        payload: JSON.parse(String(s.payload_json || '{}')),
        createdAt: String(s.created_at || ''),
      }));
      res.json({ module: 'mod_forms', forms, submissions });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در بازیابی فرم‌های چندمرحله‌ای',
      });
    }
  });

  // Admin: Create or update a Gravity-Style Form Definition
  router.post(
    '/api/v1/modules/forms',
    requireAuth,
    requirePermission('canManagePageBuilder'),
    async (req, res) => {
      try {
        const b = req.body || {};
        const id = String(b.id || `form_${Date.now()}`);
        const nowIso = new Date().toISOString();
        await dbExec(
          `INSERT INTO mod_forms_definitions
           (id, slug, title_fa, steps_json, conditional_logic_json, pricing_formula, honeypot_enabled, sms_notify_enabled, payment_gateway_linked, submissions_count, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10)
           ON CONFLICT (id) DO UPDATE SET
             slug = EXCLUDED.slug,
             title_fa = EXCLUDED.title_fa,
             steps_json = EXCLUDED.steps_json,
             conditional_logic_json = EXCLUDED.conditional_logic_json,
             pricing_formula = EXCLUDED.pricing_formula,
             honeypot_enabled = EXCLUDED.honeypot_enabled,
             sms_notify_enabled = EXCLUDED.sms_notify_enabled,
             payment_gateway_linked = EXCLUDED.payment_gateway_linked,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            String(b.slug || id),
            String(b.titleFa || 'فرم هوشمند جدید'),
            JSON.stringify(b.steps || []),
            JSON.stringify(b.conditionalLogic || []),
            String(b.pricingFormula || 'base_price + (team_size * 450000)'),
            b.honeypotEnabled !== false ? 1 : 0,
            b.smsNotifyEnabled !== false ? 1 : 0,
            b.paymentGatewayLinked ? 1 : 0,
            nowIso,
          ]
        );
        res.json({ ok: true, id });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در ذخیره ساختار فرم',
        });
      }
    }
  );

  // Public/Admin: Submit Form Entry with Honeypot Anti-Spam & Calculated Pricing
  router.post('/api/v1/modules/forms/:id/submit', async (req, res) => {
    try {
      const formId = String(req.params.id);
      const b = req.body || {};
      // Anti-Spam Honeypot trap check
      if (b._hp_website_trap && String(b._hp_website_trap).trim() !== '') {
        res.status(400).json({ error: 'درخواست مشکوک به ربات (Honeypot Anti-Spam) مسدود شد.' });
        return;
      }
      const subId = `sub_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const calculatedPrice = Math.max(0, Number(b.calculatedPrice || 0));

      await dbExec(
        `INSERT INTO mod_forms_submissions
         (id, form_id, submitter_phone, submitter_national_id, province_city, calculated_price, payload_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          subId,
          formId,
          String(b.phone || ''),
          String(b.nationalId || ''),
          String(b.provinceCity || 'تهران - تهران'),
          calculatedPrice,
          JSON.stringify(b.payload || {}),
          nowIso,
        ]
      );
      await dbExec(
        'UPDATE mod_forms_definitions SET submissions_count = submissions_count + 1, updated_at = $1 WHERE id = $2',
        [nowIso, formId]
      );
      await writeSystemLog({
        level: 'success',
        category: 'sms',
        title: `ثبت ورودی جدید در فرم چندمرحله‌ای (${formId})`,
        detail: `موبایل: ${b.phone || '-'} | کد ملی: ${b.nationalId || '-'} | مبلغ محاسبه‌شده: ${calculatedPrice} تومان`,
        sqlOrEndpoint: `POST /api/v1/modules/forms/${formId}/submit`,
      });
      res.json({ ok: true, submissionId: subId, calculatedPrice });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در ثبت اطلاعات فرم',
      });
    }
  });

  // Excel-Compatible UTF-8 BOM CSV Export for Form Submissions
  router.get('/api/v1/modules/forms/:id/export.csv', async (req, res) => {
    try {
      const formId = String(req.params.id);
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_forms_submissions WHERE form_id = $1 ORDER BY created_at DESC',
        [formId]
      );
      const header = 'SubmissionID,FormID,Phone,NationalID,ProvinceCity,CalculatedPriceToman,CreatedAt\n';
      const lines = rows
        .map(
          (r) =>
            `"${r.id}","${r.form_id}","${r.submitter_phone}","${r.submitter_national_id}","${r.province_city}","${r.calculated_price}","${r.created_at}"`
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-export.csv"`);
      res.send('\uFEFF' + header + lines);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در تولید خروجی اکسل/CSV',
      });
    }
  });

  // Per-Form Submissions Inbox (Strictly scoped to a single form ID)
  router.get('/api/v1/modules/forms/:id/submissions', async (req, res) => {
    try {
      const formId = String(req.params.id);
      const subRows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_forms_submissions WHERE form_id = $1 ORDER BY created_at DESC LIMIT 200',
        [formId]
      );
      const submissions = subRows.map((s) => ({
        id: String(s.id),
        formId: String(s.form_id),
        submitterPhone: String(s.submitter_phone || ''),
        submitterNationalId: String(s.submitter_national_id || ''),
        provinceCity: String(s.province_city || ''),
        calculatedPrice: Number(s.calculated_price || 0),
        payload: JSON.parse(String(s.payload_json || '{}')),
        createdAt: String(s.created_at || ''),
      }));
      res.json({ ok: true, formId, count: submissions.length, submissions });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت ورودی‌های فرم',
      });
    }
  });

  // Admin: Delete a Form Definition and its associated Submissions
  router.delete(
    '/api/v1/modules/forms/:id',
    requireAuth,
    requirePermission('canManagePageBuilder'),
    async (req, res) => {
      try {
        const formId = String(req.params.id);
        await dbExec('DELETE FROM mod_forms_submissions WHERE form_id = $1', [formId]);
        await dbExec('DELETE FROM mod_forms_definitions WHERE id = $1', [formId]);
        res.json({ ok: true, deletedFormId: formId });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در حذف فرم',
        });
      }
    }
  );

  // Admin: Delete a Single Form Submission
  router.delete(
    '/api/v1/modules/forms/submissions/:subId',
    requireAuth,
    requirePermission('canManagePageBuilder'),
    async (req, res) => {
      try {
        const subId = String(req.params.subId);
        const existing = await dbQuery<{ form_id: string }>(
          'SELECT form_id FROM mod_forms_submissions WHERE id = $1',
          [subId]
        );
        await dbExec('DELETE FROM mod_forms_submissions WHERE id = $1', [subId]);
        if (existing[0]?.form_id) {
          await dbExec(
            'UPDATE mod_forms_definitions SET submissions_count = CASE WHEN submissions_count > 0 THEN submissions_count - 1 ELSE 0 END WHERE id = $1',
            [existing[0].form_id]
          );
        }
        res.json({ ok: true, deletedSubmissionId: subId });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در حذف ورودی فرم',
        });
      }
    }
  );

  return router;
}
