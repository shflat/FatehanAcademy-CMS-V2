import express from 'express';
import type { BackupScheduleConfig } from '../../../core/types.js';
import { DEFAULT_BACKUP_SCHEDULE_CONFIG } from '../../../data/defaults.js';
import {
  requireAuth,
  requirePermission,
  syncPermissionsToDbAndFile,
} from '../../core/permissionsEngine.js';
import {
  BackupRestoreError,
  createBackupSnapshot,
  executeReadOnlySql,
  getBackupFileById,
  getBackupHistory,
  getDatabaseStatus,
  getSetting,
  restoreBackupFromContent,
  runDatabaseReadWriteHealthTest,
  sendBaleNotification,
  sendSmtpBackupEmail,
  setSetting,
  writeSystemLog,
} from '../../database/index.js';

export function createAdminDbBackupRouter(): express.Router {
  const router = express.Router();

  router.get(
    '/api/admin/db/status',
    requireAuth,
    requirePermission('canManageBackups'),
    async (_req, res) => {
      try {
        const status = await getDatabaseStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطای وضعیت دیتابیس',
        });
      }
    }
  );

  router.post(
    '/api/admin/db/test-connection',
    requireAuth,
    requirePermission('canManageBackups'),
    async (_req, res) => {
      try {
        const report = await runDatabaseReadWriteHealthTest();
        res.json(report);
      } catch (error) {
        res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : 'خطا در تست اتصال دیتابیس',
        });
      }
    }
  );

  router.post(
    '/api/admin/db/query',
    requireAuth,
    requirePermission('super_admin'),
    async (req, res) => {
      try {
        const sql = String(req.body?.sql || '');
        const result = await executeReadOnlySql(sql);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'خطای اجرای کوئری SQL',
        });
      }
    }
  );

  router.get(
    '/api/admin/backup/history',
    requireAuth,
    requirePermission('canManageBackups'),
    async (_req, res) => {
      try {
        const history = await getBackupHistory();
        const scheduleConfig = await getSetting<BackupScheduleConfig>(
          'backup_schedule_config',
          DEFAULT_BACKUP_SCHEDULE_CONFIG
        );
        res.json({ history, scheduleConfig });
      } catch {
        res.status(500).json({ error: 'خطا در دریافت تاریخچه بکاپ' });
      }
    }
  );

  router.post(
    '/api/admin/backup/create',
    requireAuth,
    requirePermission('canManageBackups'),
    async (req, res) => {
      try {
        const format = req.body?.format === 'sql' ? 'sql' : 'json';
        const dispatchRemote = Boolean(req.body?.dispatchRemote);
        const scheduleOverride =
          req.body?.scheduleConfig && typeof req.body.scheduleConfig === 'object'
            ? (req.body.scheduleConfig as Partial<BackupScheduleConfig>)
            : undefined;
        if (scheduleOverride) {
          const existingCfg = await getSetting<BackupScheduleConfig>(
            'backup_schedule_config',
            DEFAULT_BACKUP_SCHEDULE_CONFIG
          );
          await setSetting('backup_schedule_config', {
            ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
            ...existingCfg,
            ...scheduleOverride,
          });
        }
        const snapshot = await createBackupSnapshot({
          format,
          triggerType: 'manual',
          dispatchRemote,
          scheduleOverride,
        });
        res.json({
          ok: true,
          item: snapshot.item,
          content: snapshot.content,
          dispatchReport: snapshot.dispatchReport,
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در تهیه نسخه پشتیبان',
        });
      }
    }
  );

  router.get(
    '/api/admin/backup/download/:id',
    requireAuth,
    requirePermission('canManageBackups'),
    async (req, res) => {
      try {
        const found = await getBackupFileById(String(req.params.id || ''));
        if (!found) {
          res.status(404).json({ error: 'فایل پشتیبان یافت نشد.' });
          return;
        }
        res.setHeader('Content-Disposition', `attachment; filename="${found.filename}"`);
        res.setHeader(
          'Content-Type',
          found.filename.endsWith('.json')
            ? 'application/json; charset=utf-8'
            : 'application/sql; charset=utf-8'
        );
        res.send(found.content);
      } catch {
        res.status(500).json({ error: 'خطا در دانلود فایل پشتیبان' });
      }
    }
  );

  router.post(
    '/api/admin/backup/restore',
    requireAuth,
    requirePermission('super_admin'),
    async (req, res) => {
      try {
        const content = String(req.body?.content || '');
        const format =
          req.body?.format === 'sql'
            ? 'sql'
            : req.body?.format === 'json'
            ? 'json'
            : undefined;
        const result = await restoreBackupFromContent(content, format);
        await syncPermissionsToDbAndFile();
        res.json({ ok: true, ...result });
      } catch (error) {
        if (error instanceof BackupRestoreError) {
          res.status(error.statusCode).json({
            ok: false,
            error: error.message,
            ...error.details,
          });
          return;
        }
        await writeSystemLog({
          level: 'error',
          category: 'backup',
          title: 'خطا در بازیابی فایل پشتیبان',
          detail: error instanceof Error ? error.message : String(error),
          sqlOrEndpoint: 'POST /api/admin/backup/restore',
        });
        res.status(400).json({
          ok: false,
          error: error instanceof Error ? error.message : 'خطا در بازیابی فایل',
        });
      }
    }
  );

  router.post(
    '/api/admin/backup/settings',
    requireAuth,
    requirePermission('canManageBackups'),
    async (req, res) => {
      try {
        const cfg = req.body as BackupScheduleConfig;
        await setSetting('backup_schedule_config', cfg);
        await writeSystemLog({
          level: 'success',
          category: 'backup',
          title: 'ذخیره تنظیمات زمان‌بندی بکاپ روزانه، ایمیل و بله',
          detail: `وضعیت خودکار: ${cfg.autoDailyEnabled ? `فعال (ساعت ${cfg.scheduleHour}:۰۰)` : 'غیرفعال'}`,
          sqlOrEndpoint: 'POST /api/admin/backup/settings',
        });
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در ذخیره تنظیمات بکاپ' });
      }
    }
  );

  router.post(
    '/api/admin/backup/test-bale',
    requireAuth,
    requirePermission('canManageBackups'),
    async (req, res) => {
      try {
        const { baleBotToken, baleChatId } = req.body || {};
        const resp = await sendBaleNotification(
          baleBotToken,
          baleChatId,
          `تست اتصال موفق ربات بله با سامانه Skill 98 (${new Date().toLocaleString('fa-IR')})`
        );
        await writeSystemLog({
          level: 'success',
          category: 'backup',
          title: 'تست موفق ارسال پیام به ربات بله',
          detail: `پیام تست به شناسه چت ${baleChatId} ارسال شد.`,
          sqlOrEndpoint: 'POST https://tapi.bale.ai/bot***/sendMessage',
          payload: resp,
        });
        res.json({ ok: true, message: 'پیام تست با موفقیت به ربات بله ارسال شد.' });
      } catch (error) {
        await writeSystemLog({
          level: 'error',
          category: 'backup',
          title: 'خطا در تست ربات بله',
          detail: error instanceof Error ? error.message : String(error),
          sqlOrEndpoint: 'POST /api/admin/backup/test-bale',
        });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'خطا در اتصال به بله',
        });
      }
    }
  );

  router.post(
    '/api/admin/backup/test-smtp',
    requireAuth,
    requirePermission('canManageBackups'),
    async (req, res) => {
      try {
        const cfg = req.body as BackupScheduleConfig;
        const msgId = await sendSmtpBackupEmail(
          cfg,
          'تست اتصال موفق سرور ایمیل پشتیبان (Skill 98)',
          `سلام، اتصال SMTP پورت ${cfg.smtpPort || 587} برای ارسال بکاپ روزانه اسکیل ۹۸ با موفقیت برقرار شد.`
        );
        await writeSystemLog({
          level: 'success',
          category: 'backup',
          title: 'تست موفق ارسال ایمیل بکاپ (SMTP Port 587)',
          detail: `ایمیل تست به ${cfg.smtpTargetEmail} ارسال شد (${msgId}).`,
          sqlOrEndpoint: `SMTP ${cfg.smtpHost}:${cfg.smtpPort}`,
        });
        res.json({ ok: true, message: 'ایمیل تست با موفقیت ارسال شد.' });
      } catch (error) {
        await writeSystemLog({
          level: 'error',
          category: 'backup',
          title: 'خطا در تست ارسال ایمیل SMTP',
          detail: error instanceof Error ? error.message : String(error),
          sqlOrEndpoint: 'POST /api/admin/backup/test-smtp',
        });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'خطا در ارسال ایمیل تست',
        });
      }
    }
  );

  return router;
}
