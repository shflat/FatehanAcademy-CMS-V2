import express from 'express';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../src/server/core/permissionsEngine.js';
import {
  dbExec,
  dbQuery,
  dispatchEventSms,
  formatPersianDateTime,
  writeSystemLog,
} from '../../src/server/database/index.js';

export function createModBookingRouter(): express.Router {
  const router = express.Router();

  // Public + Admin: List Solar (Jalali) Booking Slots & Appointments
  router.get('/api/v1/modules/booking/slots', async (_req, res) => {
    try {
      const slots = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_booking_slots ORDER BY jalali_date ASC, time_window ASC'
      );
      const appointments = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_booking_appointments ORDER BY created_at DESC LIMIT 60'
      );
      res.json({ ok: true, slots, appointments });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت تقویم نوبت‌دهی' });
    }
  });

  // Admin: Create a new Solar (Jalali) Service Time Slot
  router.post(
    '/api/v1/modules/booking/slots',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const serviceTitleFa = String(b.serviceTitleFa || '').trim();
        const expertNameFa = String(b.expertNameFa || 'تیم مشاوره تخصصی اسکیل ۹۸').trim();
        const jalaliDate = String(b.jalaliDate || '۱۴۰۵/۰۹/۰۱').trim();
        const timeWindow = String(b.timeWindow || '۱۰:۰۰ تا ۱۱:۳۰').trim();
        const capacity = Math.max(1, Number(b.capacity ?? 4));
        const priceToman = Math.max(0, Number(b.priceToman ?? 1500000));

        if (!serviceTitleFa) {
          res.status(400).json({ error: 'عنوان خدمت/جلسه الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const id = `slot_${Date.now()}`;

        await dbExec(
          `INSERT INTO mod_booking_slots (id, service_title_fa, expert_name_fa, jalali_date, time_window, capacity, booked_count, price_toman, status, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,0,$7,'available',$8)`,
          [id, serviceTitleFa, expertNameFa, jalaliDate, timeWindow, capacity, priceToman, nowIso]
        );

        const slots = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_booking_slots ORDER BY jalali_date ASC, time_window ASC'
        );
        res.json({ ok: true, slots });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ایجاد سانس رزرو' });
      }
    }
  );

  // Public + Admin: Reserve a Solar Appointment Slot + Send SMS Confirmation
  router.post('/api/v1/modules/booking/appointments', async (req, res) => {
    try {
      const b = req.body || {};
      const slotId = String(b.slotId || '').trim();
      const customerName = String(b.customerName || '').trim();
      const customerPhone = String(b.customerPhone || '').trim();
      const notes = String(b.notes || '').trim();

      if (!slotId || !customerName || !/^09\d{9}$/.test(customerPhone)) {
        res.status(400).json({ error: 'انتخاب سانس، نام مراجع و شماره موبایل معتبر الزامی است.' });
        return;
      }

      const slotRows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_booking_slots WHERE id = $1',
        [slotId]
      );
      const slot = slotRows[0];
      if (!slot) {
        res.status(404).json({ error: 'سانس انتخاب‌شده یافت نشد.' });
        return;
      }
      const booked = Number(slot.booked_count || 0);
      const cap = Number(slot.capacity || 1);
      if (booked >= cap) {
        res.status(409).json({ error: 'ظرفیت این سانس تکمیل شده است.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const nowFa = formatPersianDateTime();
      const trackingCode = `BK-${Math.floor(100000 + Math.random() * 899999)}`;
      const appId = `app_${Date.now()}`;

      await dbExec(
        `INSERT INTO mod_booking_appointments (id, slot_id, service_title_fa, jalali_date, time_window, customer_name, customer_phone, notes, status, tracking_code, created_at_fa, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmed',$9,$10,$11)`,
        [
          appId,
          slotId,
          String(slot.service_title_fa),
          String(slot.jalali_date),
          String(slot.time_window),
          customerName,
          customerPhone,
          notes,
          trackingCode,
          nowFa,
          nowIso,
        ]
      );

      const nextBooked = booked + 1;
      await dbExec(
        `UPDATE mod_booking_slots SET booked_count = $1, status = $2, updated_at = $3 WHERE id = $4`,
        [nextBooked, nextBooked >= cap ? 'full' : 'available', nowIso, slotId]
      );

      await dispatchEventSms({
        eventKey: 'order_created',
        phone: customerPhone,
        variables: {
          name: customerName,
          tracking_code: trackingCode,
          amount: Number(slot.price_toman || 0).toLocaleString('fa-IR'),
        },
      });

      await writeSystemLog({
        level: 'success',
        category: 'system',
        title: `ثبت رزرو نوبت شمسی (${trackingCode}) برای ${customerName}`,
        detail: `${slot.service_title_fa} — ${slot.jalali_date} (${slot.time_window})`,
        sqlOrEndpoint: 'POST /api/v1/modules/booking/appointments',
      });

      const slots = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_booking_slots ORDER BY jalali_date ASC, time_window ASC'
      );
      const appointments = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_booking_appointments ORDER BY created_at DESC LIMIT 60'
      );
      res.json({ ok: true, trackingCode, slots, appointments });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ثبت نوبت شمسی' });
    }
  });

  return router;
}
