import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { DEFAULT_SMS_GATEWAY_SETTINGS } from '../../../data/defaults.js';
import type { SmsGatewaySettings } from '../../../core/types.js';
import { getEnvConfig, resolveBuildId } from '../../core/envConfig.js';
import {
  checkRateLimit,
  clearSessionCookie,
  extractClientDeviceAndIp,
  extractSessionToken,
  hashOtpCode,
  normalizeIranPhone,
  setSessionCookie,
  timingSafeHexEqual,
} from '../../core/cryptoSecurity.js';
import {
  requireAuth,
  verifyRoleCapabilityHash,
  type AuthenticatedRequest,
} from '../../core/permissionsEngine.js';
import {
  createAuthSession,
  dbQuery,
  deleteAuthSession,
  dispatchEventSms,
  findAuthSession,
  findUserByEmail,
  findUserByPhone,
  getSetting,
  listActiveAuthSessions,
  resolveSessionTtlHours,
  revokeAuthSessionByToken,
  setSetting,
  upsertUserByPhone,
  writeSystemLog,
} from '../../database/index.js';

interface OtpChallengeRecord {
  phone: string;
  codeHash: string;
  expiresAt: number;
  provider: string;
  attempts: number;
}

interface AdminMasterConfig {
  phone: string;
  codeHash: string;
}

const activeOtpChallenges = new Map<string, OtpChallengeRecord>();

function readFirebaseApiKey(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { apiKey?: string };
      return String(parsed.apiKey || '').trim();
    }
  } catch {
    // ignore
  }
  return '';
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function resolveMasterCredentials(): Promise<{
  masterPhone: string;
  masterCodeHash: string;
  masterCodeRaw: string;
}> {
  const envCfg = getEnvConfig();
  const dbMaster = await getSetting<AdminMasterConfig | null>('admin_master_config', null);
  return {
    masterPhone: envCfg.adminPhone || dbMaster?.phone || '',
    masterCodeHash: envCfg.adminMasterCodeHash || dbMaster?.codeHash || '',
    masterCodeRaw: envCfg.adminMasterCodeRaw || '',
  };
}

export function createAuthRouter(): express.Router {
  const router = express.Router();

  router.post('/api/auth/check-phone', async (req, res) => {
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local');
    if (!checkRateLimit(`check:${clientIp}`, 35, 60_000)) {
      res.status(429).json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است.' });
      return;
    }

    try {
      const cleanPhone = normalizeIranPhone(req.body?.phone);
      if (!/^09\d{9}$/.test(cleanPhone)) {
        res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست.' });
        return;
      }

      const [existing, master] = await Promise.all([
        findUserByPhone(cleanPhone),
        resolveMasterCredentials(),
      ]);
      const isMaster = Boolean(
        master.masterPhone &&
          cleanPhone === master.masterPhone &&
          (master.masterCodeHash || master.masterCodeRaw)
      );

      res.json({
        phone: cleanPhone,
        exists: Boolean(existing) || isMaster,
        isAdmin: isMaster || existing?.role === 'super_admin' || existing?.role === 'admin',
        requiresMasterCode: isMaster,
        fullName: existing?.full_name || null,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در بررسی شماره موبایل',
      });
    }
  });

  router.post('/api/sms/send-otp', async (req, res) => {
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local');
    if (!checkRateLimit(`otp:${clientIp}`, 12, 60_000)) {
      res.status(429).json({ error: 'تعداد درخواست‌های پیامک بیش از حد مجاز است.' });
      return;
    }

    try {
      const { phone, expirySeconds = 120 } = req.body || {};
      const cleanPhone = normalizeIranPhone(phone);
      if (!/^09\d{9}$/.test(cleanPhone)) {
        res.status(400).json({ error: 'شماره موبایل واردشده معتبر نیست.' });
        return;
      }

      const [existingProfile, master] = await Promise.all([
        findUserByPhone(cleanPhone),
        resolveMasterCredentials(),
      ]);
      const isMasterAdminPhone = Boolean(master.masterPhone && cleanPhone === master.masterPhone);

      if (existingProfile?.status === 'suspended' && !isMasterAdminPhone) {
        res.status(403).json({
          error: 'حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.',
        });
        return;
      }

      const otpCode = String(crypto.randomInt(10000, 99999));
      const expiresAt = Date.now() + Number(expirySeconds || 120) * 1000;
      const smsCfg = await getSetting<SmsGatewaySettings>(
        'sms_gateway_config',
        DEFAULT_SMS_GATEWAY_SETTINGS
      );

      activeOtpChallenges.set(cleanPhone, {
        phone: cleanPhone,
        codeHash: hashOtpCode(cleanPhone, otpCode),
        expiresAt,
        provider: smsCfg.provider,
        attempts: 0,
      });

      const dispatchResult = await dispatchEventSms({
        eventKey: 'user_registered',
        phone: cleanPhone,
        variables: {
          code: otpCode,
          name: existingProfile?.full_name || 'کاربر گرامی',
        },
      });

      if (!dispatchResult.sandbox && !dispatchResult.dispatched && !isMasterAdminPhone) {
        res.status(502).json({
          success: false,
          error:
            dispatchResult.errorMessage ||
            'ارسال پیامک از طریق وب‌سرویس پیامک با خطا مواجه شد. جزئیات را در لاگ سیستم بررسی کنید.',
          provider: dispatchResult.provider,
          gatewayResponse: dispatchResult.gatewayResponse,
        });
        return;
      }

      const gatewayStatus = dispatchResult.sandbox ? 'pending_sms_gateway' : 'live_dispatched';

      res.json({
        success: true,
        phone: cleanPhone,
        provider: dispatchResult.provider,
        gatewayStatus,
        expiresInSeconds: Number(expirySeconds || 120),
        message: 'کد تایید ۵ رقمی به شماره همراه شما ارسال شد.',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در ارسال کد تایید پیامکی',
      });
    }
  });

  router.post('/api/sms/verify-otp', async (req, res) => {
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local');
    if (!checkRateLimit(`verify:${clientIp}`, 15, 60_000)) {
      res.status(429).json({ error: 'تعداد تلاش‌های بررسی کد بیش از حد مجاز است.' });
      return;
    }

    try {
      const { phone, code, fullName } = req.body || {};
      const cleanPhone = normalizeIranPhone(phone);
      const cleanCode = String(code || '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .trim();

      const master = await resolveMasterCredentials();
      if (
        master.masterPhone &&
        cleanPhone === master.masterPhone &&
        (master.masterCodeHash || master.masterCodeRaw)
      ) {
        const submittedHmacHash = hashOtpCode(cleanPhone, cleanCode);
        const submittedSha256Hash = sha256Hex(cleanCode);
        const matchesHmac = Boolean(
          master.masterCodeHash && timingSafeHexEqual(submittedHmacHash, master.masterCodeHash)
        );
        const matchesDirectSha256 = Boolean(
          master.masterCodeHash && timingSafeHexEqual(submittedSha256Hash, master.masterCodeHash)
        );
        const matchesEnvRaw = Boolean(
          master.masterCodeRaw &&
            timingSafeHexEqual(submittedSha256Hash, sha256Hex(master.masterCodeRaw))
        );
        if (matchesHmac || matchesDirectSha256 || matchesEnvRaw) {
          activeOtpChallenges.delete(cleanPhone);
          const masterRow = await upsertUserByPhone({
            phone: cleanPhone,
            fullName: 'مدیر ارشد سیستم',
            role: 'super_admin',
            roleId: 'role_super_admin',
          });
          await writeSystemLog({
            level: 'success',
            category: 'auth',
            title: `ورود موفق مدیریت ارشد (${cleanPhone})`,
            detail: 'احراز هویت مدیریت با مسترکد هش‌شده HMAC-SHA256 تایید شد.',
            sqlOrEndpoint: 'POST /api/sms/verify-otp (ADMIN)',
          });
          const clientMeta = extractClientDeviceAndIp(req);
          const ttlHours = await resolveSessionTtlHours();
          const sessionToken = await createAuthSession({
            phone: cleanPhone,
            userDisplay: masterRow.full_name || 'مدیر ارشد سیستم',
            role: 'super_admin',
            roleId: 'role_super_admin',
            deviceLabel: clientMeta.deviceLabel,
            ipMasked: clientMeta.ipMasked,
            ttlHours,
          });
          setSessionCookie(req, res, sessionToken, ttlHours);
          let masterSkills: string[] = [];
          try {
            masterSkills = JSON.parse(masterRow.claimed_skill_ids_json || '[]');
          } catch {
            masterSkills = [];
          }
          const activeSessions = await listActiveAuthSessions();
          res.json({
            verified: true,
            phone: cleanPhone,
            role: 'super_admin',
            roleId: 'role_super_admin',
            displayName: masterRow.full_name || 'مدیر ارشد سیستم',
            claimedSkillIds: masterSkills,
            sessionToken,
            sessions: activeSessions,
            verifiedAt: new Date().toISOString(),
          });
          return;
        }
        await writeSystemLog({
          level: 'warning',
          category: 'auth',
          title: `تلاش ناموفق ورود مدیریت (${cleanPhone})`,
          detail: 'کد مستر واردشده مطابقت نداشت.',
          sqlOrEndpoint: 'POST /api/sms/verify-otp',
        });
        res.status(400).json({ error: 'کد مستر واردشده برای شماره مدیریت صحیح نیست.' });
        return;
      }

      const record = activeOtpChallenges.get(cleanPhone);
      if (!record || Date.now() > record.expiresAt) {
        activeOtpChallenges.delete(cleanPhone);
        res.status(400).json({ error: 'کد تایید یافت نشد یا منقضی شده است.' });
        return;
      }

      record.attempts += 1;
      if (record.attempts > 5) {
        activeOtpChallenges.delete(cleanPhone);
        res.status(429).json({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز بود.' });
        return;
      }

      const expectedHash = hashOtpCode(cleanPhone, cleanCode);
      if (!timingSafeHexEqual(expectedHash, record.codeHash)) {
        res.status(400).json({ error: 'کد تایید واردشده صحیح نیست.' });
        return;
      }

      activeOtpChallenges.delete(cleanPhone);
      const existingProfile = await findUserByPhone(cleanPhone);
      if (existingProfile?.status === 'suspended') {
        res.status(403).json({
          error: 'حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.',
        });
        return;
      }

      const resolvedName =
        (typeof fullName === 'string' && fullName.trim()) ||
        existingProfile?.full_name ||
        `کاربر ${cleanPhone.slice(-4)}`;

      const resolvedRole = existingProfile?.role || 'customer';
      const resolvedRoleId =
        existingProfile?.role_id ||
        (resolvedRole === 'super_admin'
          ? 'role_super_admin'
          : resolvedRole === 'admin'
          ? 'role_admin'
          : 'role_customer');

      const userRow = await upsertUserByPhone({
        phone: cleanPhone,
        fullName: resolvedName,
        role: resolvedRole,
        roleId: resolvedRoleId,
      });

      await writeSystemLog({
        level: 'success',
        category: 'auth',
        title: `احراز هویت موفق کاربر ${resolvedName} (${cleanPhone})`,
        detail: existingProfile
          ? `ورود کاربر با شماره موبایل تایید و نقش (${userRow.role}) از دیتابیس بازیابی شد.`
          : 'ثبت‌نام کاربر جدید در جدول users ذخیره گردید.',
        sqlOrEndpoint: 'UPSERT users (OTP Verified)',
        payload: {
          phone: cleanPhone,
          fullName: resolvedName,
          role: userRow.role,
          roleId: userRow.role_id,
        },
      });

      const clientMeta = extractClientDeviceAndIp(req);
      const ttlHours = await resolveSessionTtlHours();
      const sessionToken = await createAuthSession({
        phone: cleanPhone,
        userDisplay: resolvedName,
        role: userRow.role,
        roleId: userRow.role_id || resolvedRoleId,
        deviceLabel: clientMeta.deviceLabel,
        ipMasked: clientMeta.ipMasked,
        ttlHours,
      });
      setSessionCookie(req, res, sessionToken, ttlHours);
      let claimedSkillIds: string[] = [];
      try {
        claimedSkillIds = JSON.parse(userRow.claimed_skill_ids_json || '[]');
      } catch {
        claimedSkillIds = [];
      }
      const userSessions = await listActiveAuthSessions(
        userRow.role === 'super_admin' || userRow.role === 'admin' ? undefined : cleanPhone
      );

      res.json({
        verified: true,
        phone: cleanPhone,
        role: userRow.role,
        roleId: userRow.role_id || resolvedRoleId,
        displayName: resolvedName,
        claimedSkillIds,
        sessionToken,
        sessions: userSessions,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در تایید کد پیامکی',
      });
    }
  });

  // Exchange verified Firebase Google ID Token for a server-side Express session cookie
  router.post('/api/auth/google-session', async (req, res) => {
    try {
      const idToken = String(req.body?.idToken || '').trim();
      const firebaseApiKey = readFirebaseApiKey();
      if (!idToken || !firebaseApiKey) {
        res.status(400).json({ error: 'توکن احراز هویت گوگل ارسال نشده است.' });
        return;
      }

      const lookupResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      const lookupData = (await lookupResp.json().catch(() => ({}))) as {
        users?: {
          localId?: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
        }[];
      };
      const fbUser = lookupData.users?.[0];
      if (!lookupResp.ok || !fbUser?.email || !fbUser.emailVerified) {
        res.status(401).json({ error: 'توکن گوگل تاییدشده معتبر نیست.' });
        return;
      }

      const emailLower = fbUser.email.trim().toLowerCase();
      const envCfg = getEnvConfig();
      const existingByEmail = await findUserByEmail(emailLower);
      const isEnvAdmin = Boolean(envCfg.adminEmail && emailLower === envCfg.adminEmail);

      const resolvedRole: 'super_admin' | 'admin' | 'customer' =
        isEnvAdmin || existingByEmail?.role === 'super_admin'
          ? 'super_admin'
          : existingByEmail?.role === 'admin'
          ? 'admin'
          : 'customer';
      const resolvedRoleId =
        existingByEmail?.role_id ||
        (resolvedRole === 'super_admin'
          ? 'role_super_admin'
          : resolvedRole === 'admin'
          ? 'role_admin'
          : 'role_customer');
      const identifier = existingByEmail?.phone || `google_${fbUser.localId || emailLower}`;
      const displayName = fbUser.displayName || existingByEmail?.full_name || emailLower;

      const userRow = await upsertUserByPhone({
        phone: identifier,
        fullName: displayName,
        role: resolvedRole,
        roleId: resolvedRoleId,
        email: emailLower,
      });

      const clientMeta = extractClientDeviceAndIp(req);
      const ttlHours = await resolveSessionTtlHours();
      const sessionToken = await createAuthSession({
        phone: userRow.phone,
        userDisplay: displayName,
        role: userRow.role,
        roleId: userRow.role_id || resolvedRoleId,
        deviceLabel: `${clientMeta.deviceLabel} (Google OAuth)`,
        ipMasked: clientMeta.ipMasked,
        ttlHours,
      });
      setSessionCookie(req, res, sessionToken, ttlHours);

      res.json({
        authenticated: true,
        sessionToken,
        user: {
          phone: userRow.phone,
          fullName: userRow.full_name,
          role: userRow.role,
          roleId: userRow.role_id || resolvedRoleId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطا در همگام‌سازی نشست گوگل',
      });
    }
  });

  // Update super admin master code hash in DB (protected, super_admin only)
  router.post(
    '/api/auth/master-code',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.authSession?.role !== 'super_admin') {
          res.status(403).json({ error: 'فقط سوپر ادمین مجاز به تنظیم کد مستر است.' });
          return;
        }
        const newCode = String(req.body?.newCode || '').trim();
        if (newCode.length < 4) {
          res.status(400).json({ error: 'کد مستر باید حداقل ۴ کاراکتر باشد.' });
          return;
        }
        const phone = req.authSession.phone;
        const codeHash = hashOtpCode(phone, newCode);
        await setSetting('admin_master_config', { phone, codeHash });
        await writeSystemLog({
          level: 'success',
          category: 'auth',
          title: `به‌روزرسانی هش کد مستر سوپر ادمین (${phone})`,
          detail: 'هش کد مستر به صورت امن (HMAC-SHA256) در دیتابیس ذخیره شد.',
          sqlOrEndpoint: 'POST /api/auth/master-code',
        });
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'خطا در ذخیره هش کد مستر' });
      }
    }
  );

  router.get('/api/auth/session', async (req, res) => {
    const buildId = resolveBuildId();
    try {
      const token = extractSessionToken(req);
      if (!token) {
        res.json({ authenticated: false, buildId });
        return;
      }
      const sess = await findAuthSession(token);
      if (!sess) {
        clearSessionCookie(res, req);
        res.status(401).json({
          authenticated: false,
          expired: true,
          buildId,
          error: 'نشست شما منقضی یا ابطال شده است. لطفاً مجدداً وارد شوید.',
        });
        return;
      }
      const [user, master, sessionTtlHours] = await Promise.all([
        findUserByPhone(sess.phone),
        resolveMasterCredentials(),
        resolveSessionTtlHours(),
      ]);
      const isMaster = Boolean(master.masterPhone && sess.phone === master.masterPhone);
      if (!user || (user.status === 'suspended' && !isMaster)) {
        await deleteAuthSession(token);
        clearSessionCookie(res, req);
        res.status(403).json({
          authenticated: false,
          buildId,
          error: 'حساب کاربری غیرفعال یا مسدود شده است.',
        });
        return;
      }

      let claimedSkillIds: string[] = [];
      try {
        claimedSkillIds = JSON.parse(user.claimed_skill_ids_json || '[]');
      } catch {
        claimedSkillIds = [];
      }
      const userOrders = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM orders WHERE buyer_phone = $1 ORDER BY created_at DESC LIMIT 100',
        [user.phone]
      );
      const sessions = await listActiveAuthSessions(
        user.role === 'super_admin' || user.role === 'admin' ? undefined : user.phone
      );

      res.json({
        authenticated: true,
        buildId,
        sessionTtlHours,
        expiresAt: sess.expires_at,
        sessionToken: token,
        sessions,
        user: {
          phone: user.phone,
          fullName: user.full_name,
          role: user.role,
          roleId: user.role_id || sess.role_id,
          claimedSkillIds,
          orders: userOrders.map((o) => ({
            id: String(o.id),
            buyerId: String(o.buyer_phone || ''),
            buyerName: String(o.buyer_name || ''),
            totalAmount: Number(o.total_amount || 0),
            discountAmount: o.discount_amount ? Number(o.discount_amount) : undefined,
            couponCode: o.coupon_code ? String(o.coupon_code) : undefined,
            itemsSummary: String(o.items_summary || ''),
            itemsCount: Number(o.items_count || 1),
            paymentMethod: String(o.payment_method || 'irankish'),
            status: String(o.status || 'paid'),
            createdAtLabel: String(o.created_at_label || ''),
          })),
        },
      });
    } catch {
      res.status(500).json({ authenticated: false, buildId });
    }
  });

  router.get('/api/auth/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const session = req.authSession!;
      const isAdmin = session.role === 'super_admin' || session.role === 'admin';
      let canViewAll = session.role === 'super_admin';
      if (session.role === 'admin') {
        const cap = await verifyRoleCapabilityHash(
          session.role_id,
          session.role,
          'canManageSessions'
        );
        canViewAll = cap.integrityValid && cap.allowed;
      }

      const showAll = req.query.all === '1' && isAdmin && canViewAll;
      const phoneFilter = showAll ? undefined : session.phone;
      const sessions = await listActiveAuthSessions(phoneFilter);
      res.json({ sessions });
    } catch {
      res.status(500).json({ error: 'خطا در دریافت نشست‌های فعال' });
    }
  });

  router.delete('/api/auth/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const targetId = String(req.params.id || '').trim();
      const caller = req.authSession!;
      const targetSession = targetId ? await findAuthSession(targetId) : null;

      if (targetSession && targetSession.phone !== caller.phone) {
        if (caller.role !== 'super_admin') {
          if (caller.role !== 'admin') {
            res.status(403).json({ error: 'شما مجاز به ابطال نشست کاربران دیگر نیستید.' });
            return;
          }
          const cap = await verifyRoleCapabilityHash(
            caller.role_id,
            caller.role,
            'canManageSessions'
          );
          if (!cap.integrityValid || !cap.allowed) {
            res.status(403).json({ error: 'دسترسی ابطال نشست کاربران برای نقش شما فعال نیست.' });
            return;
          }
        }
      }

      if (targetId) {
        await revokeAuthSessionByToken(targetId);
        await writeSystemLog({
          level: 'warning',
          category: 'auth',
          title: `ابطال نشست کاربری (${targetId.slice(0, 12)}...)`,
          detail: `نشست توسط ${caller.phone} باطل شد.`,
          sqlOrEndpoint: `DELETE /api/auth/sessions/${targetId.slice(0, 12)}`,
        });
      }
      const sessions = await listActiveAuthSessions(
        caller.role === 'super_admin' || caller.role === 'admin' ? undefined : caller.phone
      );
      res.json({ ok: true, sessions });
    } catch {
      res.status(500).json({ error: 'خطا در ابطال نشست' });
    }
  });

  router.post('/api/auth/logout', async (req, res) => {
    try {
      const token = extractSessionToken(req);
      if (token) {
        await deleteAuthSession(token);
      }
      clearSessionCookie(res, req);
      res.json({ ok: true });
    } catch {
      clearSessionCookie(res, req);
      res.json({ ok: true });
    }
  });

  return router;
}
