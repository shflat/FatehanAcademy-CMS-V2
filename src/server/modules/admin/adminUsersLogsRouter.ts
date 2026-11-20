import express from 'express';
import type { CmsRoleDefinition, SmsGatewaySettings } from '../../../core/types.js';
import {
  DEFAULT_SMS_GATEWAY_SETTINGS,
  INITIAL_CMS_ROLES,
} from '../../../data/defaults.js';
import { getEnvConfig } from '../../core/envConfig.js';
import { normalizeIranPhone } from '../../core/cryptoSecurity.js';
import {
  getHashedPermissionsReport,
  requireAuth,
  requirePermission,
  syncPermissionsToDbAndFile,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  clearAllSystemLogs,
  countSuperAdmins,
  deleteAdminUserByPhone,
  findUserByPhone,
  getAllPaymentGateways,
  getDatabaseStatus,
  getSetting,
  getSystemLogs,
  listAdminUsers,
  setSetting,
  upsertAdminUser,
  writeSystemLog,
} from '../../database/index.js';

export function createAdminUsersLogsRouter(dbInitError?: string | null): express.Router {
  const router = express.Router();

  // --- System Logs & Live Diagnostics ---
  router.get(
    '/api/admin/logs',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        const category = String(req.query.category || 'all');
        const level = String(req.query.level || 'all');
        const search = String(req.query.search || '');
        const logs = await getSystemLogs({ category, level, search });
        const allLogs = await getSystemLogs();
        const snoozeUntil = await getSetting<number>('logs_snooze_until', 0);

        res.json({
          logs,
          summary: {
            total: allLogs.length,
            success: allLogs.filter((l) => l.level === 'success').length,
            warning: allLogs.filter((l) => l.level === 'warning').length,
            error: allLogs.filter((l) => l.level === 'error').length,
            snoozed: snoozeUntil > Date.now(),
          },
        });
      } catch {
        res.status(500).json({ error: 'خطا در دریافت لاگ‌های سیستم' });
      }
    }
  );

  router.delete(
    '/api/admin/logs',
    requireAuth,
    requirePermission('super_admin'),
    async (_req, res) => {
      try {
        await clearAllSystemLogs();
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در پاک‌سازی لاگ‌ها' });
      }
    }
  );

  router.post(
    '/api/admin/logs/snooze',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req, res) => {
      try {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        await setSetting('logs_snooze_until', Date.now() + sevenDaysMs);
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در ثبت یادآوری لاگ‌ها' });
      }
    }
  );

  router.get(
    '/api/admin/logs/export-csv',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req, res) => {
      try {
        const logs = await getSystemLogs();
        const esc = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
        const header = [
          'ID',
          'Level',
          'Category',
          'Title',
          'Detail',
          'Endpoint/SQL',
          'Timestamp (FA)',
        ]
          .map(esc)
          .join(',');
        const lines = logs.map((l) =>
          [l.id, l.level, l.category, l.title, l.detail, l.sqlOrEndpoint || '', l.createdAtFa]
            .map(esc)
            .join(',')
        );
        const csv = '\uFEFF' + [header, ...lines].join('\n');
        res.setHeader('Content-Disposition', 'attachment; filename="skill98-system-logs.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send(csv);
      } catch {
        res.status(500).json({ error: 'خطا در خروجی اکسل لاگ‌ها' });
      }
    }
  );

  router.post(
    '/api/admin/logs/diagnostics',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req, res) => {
      try {
        const dbStatus = await getDatabaseStatus();
        const gateways = await getAllPaymentGateways();
        const smsCfg = await getSetting<SmsGatewaySettings>(
          'sms_gateway_config',
          DEFAULT_SMS_GATEWAY_SETTINGS
        );
        const enabledGateways = gateways.filter((g) => g.enabled).map((g) => g.title);

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: 'تست سلامت کامل سیستم (Diagnostics)',
          detail: `دیتابیس ${dbStatus.engineLabel} سالم (${dbStatus.tablesCount} جدول) · درگاه‌های فعال: ${enabledGateways.length} · پیامک: ${smsCfg.provider} (${smsCfg.sandboxMode ? 'سندباکس' : 'زنده'})`,
          sqlOrEndpoint: 'POST /api/admin/logs/diagnostics',
          payload: {
            databaseEngine: dbStatus.engine,
            databaseSizeKb: dbStatus.sizeKb,
            enabledGateways,
            smsProvider: smsCfg.provider,
            smsSandboxMode: smsCfg.sandboxMode,
            uptimeSeconds: Math.floor(process.uptime()),
            initError: dbInitError || null,
          },
        });

        res.json({
          ok: true,
          databaseEngine: dbStatus.engineLabel,
          tablesCount: dbStatus.tablesCount,
          enabledGatewaysCount: enabledGateways.length,
          smsProvider: smsCfg.provider,
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطای تست سلامت سیستم',
        });
      }
    }
  );

  // --- Hashed RBAC Permissions Endpoints ---
  router.get(
    '/api/admin/permissions/hashes',
    requireAuth,
    requirePermission('canManageRoles'),
    async (_req, res) => {
      try {
        const report = await getHashedPermissionsReport();
        res.json(report);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در خواندن هش دسترسی‌ها',
        });
      }
    }
  );

  router.post(
    '/api/admin/permissions/resync',
    requireAuth,
    requirePermission('canManageRoles'),
    async (_req, res) => {
      try {
        await syncPermissionsToDbAndFile();
        const report = await getHashedPermissionsReport();
        await writeSystemLog({
          level: 'success',
          category: 'auth',
          title: 'بازسازی و همگام‌سازی هش دسترسی‌های RBAC',
          detail: `${report.recordsCount} رکورد هش HMAC-SHA256 در دیتابیس و فایل manifest ذخیره شد.`,
          sqlOrEndpoint: 'POST /api/admin/permissions/resync',
        });
        res.json({ ok: true, ...report });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در همگام‌سازی هش دسترسی‌ها',
        });
      }
    }
  );

  // --- Users & Role Assignment CRUD ---
  router.get(
    '/api/admin/users',
    requireAuth,
    requirePermission('canManageUsers'),
    async (_req, res) => {
      try {
        const [users, roles] = await Promise.all([
          listAdminUsers(),
          getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES),
        ]);
        res.json({ users, roles });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در دریافت فهرست کاربران',
        });
      }
    }
  );

  router.post(
    '/api/admin/users',
    requireAuth,
    requirePermission('canManageUsers'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const cleanPhone = normalizeIranPhone(String(req.body?.phone || ''));
        const fullName = String(req.body?.fullName || '').trim();
        if (!/^09\d{9}$/.test(cleanPhone)) {
          res.status(400).json({ error: 'شماره موبایل باید ۱۱ رقمی و با 09 شروع شود.' });
          return;
        }
        if (!fullName || fullName.length < 2) {
          res.status(400).json({ error: 'نام و نام خانوادگی کاربر الزامی است.' });
          return;
        }

        const requestedRoleId = String(req.body?.roleId || 'role_customer');
        if (requestedRoleId === 'role_super_admin' && req.authSession?.role !== 'super_admin') {
          res.status(403).json({ error: 'فقط سوپر ادمین مجاز به تخصیص نقش سوپر ادمین است.' });
          return;
        }

        const envAdminPhone = getEnvConfig().adminPhone;
        const isEnvMaster = Boolean(envAdminPhone && cleanPhone === envAdminPhone);
        const requestedStatus = req.body?.status === 'suspended' ? 'suspended' : 'active';

        const user = await upsertAdminUser({
          phone: cleanPhone,
          fullName,
          email: String(req.body?.email || ''),
          roleId: isEnvMaster ? 'role_super_admin' : requestedRoleId,
          status: isEnvMaster ? 'active' : requestedStatus,
          notes: String(req.body?.notes || ''),
        });

        await writeSystemLog({
          level: 'success',
          category: 'auth',
          title: `ثبت/به‌روزرسانی کاربر ${user.fullName} (${cleanPhone})`,
          detail: `نقش: ${user.roleId} · وضعیت: ${user.status}`,
          sqlOrEndpoint: 'POST /api/admin/users',
          payload: { phone: cleanPhone, roleId: user.roleId, status: user.status },
        });

        const [users, roles] = await Promise.all([
          listAdminUsers(),
          getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES),
        ]);
        res.json({ ok: true, user, users, roles });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در ذخیره اطلاعات کاربر',
        });
      }
    }
  );

  router.patch(
    '/api/admin/users/:phone',
    requireAuth,
    requirePermission('canManageUsers'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const rawParam = String(req.params.phone || '').trim();
        const cleanPhone = rawParam.startsWith('google_') ? rawParam : normalizeIranPhone(rawParam);
        if (!cleanPhone.startsWith('google_') && !/^09\d{9}$/.test(cleanPhone)) {
          res.status(400).json({ error: 'شناسه یا شماره موبایل کاربر معتبر نیست.' });
          return;
        }

        const existing = await findUserByPhone(cleanPhone);
        if (!existing) {
          res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
          return;
        }

        const envAdminPhone = getEnvConfig().adminPhone;
        const isEnvMaster = Boolean(envAdminPhone && cleanPhone === envAdminPhone);
        const isSuperAdminAccount = existing.role === 'super_admin' || isEnvMaster;

        if (isSuperAdminAccount) {
          if (req.body?.status === 'suspended') {
            res.status(400).json({ error: 'امکان مسدود کردن حساب سوپر ادمین وجود ندارد.' });
            return;
          }
          if (req.body?.roleId && req.body.roleId !== 'role_super_admin') {
            const totalSuper = await countSuperAdmins();
            if (isEnvMaster || totalSuper <= 1) {
              res.status(400).json({ error: 'حداقل یک سوپر ادمین فعال باید در سیستم باقی بماند.' });
              return;
            }
          }
        }

        if (req.body?.roleId === 'role_super_admin' && req.authSession?.role !== 'super_admin') {
          res.status(403).json({ error: 'فقط سوپر ادمین مجاز به ارتقای کاربر به سوپر ادمین است.' });
          return;
        }

        const nextRoleId =
          req.body?.roleId ||
          existing.role_id ||
          (existing.role === 'super_admin'
            ? 'role_super_admin'
            : existing.role === 'admin'
            ? 'role_admin'
            : 'role_customer');
        const nextStatus =
          req.body?.status === 'suspended'
            ? 'suspended'
            : req.body?.status === 'active'
            ? 'active'
            : existing.status === 'suspended'
            ? 'suspended'
            : 'active';

        const user = await upsertAdminUser({
          phone: cleanPhone,
          fullName:
            typeof req.body?.fullName === 'string' && req.body.fullName.trim()
              ? req.body.fullName.trim()
              : existing.full_name,
          email: typeof req.body?.email === 'string' ? req.body.email : existing.email || '',
          roleId: isEnvMaster ? 'role_super_admin' : nextRoleId,
          status: isEnvMaster ? 'active' : nextStatus,
          notes: typeof req.body?.notes === 'string' ? req.body.notes : existing.notes || '',
        });

        await writeSystemLog({
          level: 'success',
          category: 'auth',
          title: `ویرایش کاربر ${user.fullName} (${cleanPhone})`,
          detail: `نقش جدید: ${user.roleId} · وضعیت: ${user.status}`,
          sqlOrEndpoint: `PATCH /api/admin/users/${cleanPhone}`,
        });

        const [users, roles] = await Promise.all([
          listAdminUsers(),
          getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES),
        ]);
        res.json({ ok: true, user, users, roles });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در به‌روزرسانی کاربر',
        });
      }
    }
  );

  router.delete(
    '/api/admin/users/:phone',
    requireAuth,
    requirePermission('canManageUsers'),
    async (req, res) => {
      try {
        const rawParam = String(req.params.phone || '').trim();
        const cleanPhone = rawParam.startsWith('google_') ? rawParam : normalizeIranPhone(rawParam);
        if (!cleanPhone.startsWith('google_') && !/^09\d{9}$/.test(cleanPhone)) {
          res.status(400).json({ error: 'شناسه یا شماره موبایل معتبر نیست.' });
          return;
        }

        const existing = await findUserByPhone(cleanPhone);
        const envAdminPhone = getEnvConfig().adminPhone;
        if (envAdminPhone && cleanPhone === envAdminPhone) {
          res.status(400).json({ error: 'حذف مدیر ارشد تعریف‌شده در محیط سیستم مجاز نیست.' });
          return;
        }
        if (existing?.role === 'super_admin') {
          const totalSuper = await countSuperAdmins();
          if (totalSuper <= 1) {
            res.status(400).json({ error: 'حذف تنها سوپر ادمین سیستم مجاز نیست.' });
            return;
          }
        }

        await deleteAdminUserByPhone(cleanPhone);
        await writeSystemLog({
          level: 'warning',
          category: 'auth',
          title: `حذف کاربر (${cleanPhone}) توسط مدیریت`,
          detail: 'حساب کاربری از جدول users حذف شد.',
          sqlOrEndpoint: `DELETE /api/admin/users/${cleanPhone}`,
        });

        const [users, roles] = await Promise.all([
          listAdminUsers(),
          getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES),
        ]);
        res.json({ ok: true, users, roles });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'خطا در حذف کاربر',
        });
      }
    }
  );

  return router;
}
