import crypto from 'crypto';
import express from 'express';
import { getEnvConfig } from '../../core/envConfig.js';
import { getSetting, setSetting, writeSystemLog } from '../../database/settingsLogsRepo.js';
import { requireAdmin, requireSuperAdmin } from '../../middleware/authMiddleware.js';
import {
  buildDefaultGranularMatrix,
  GRANULAR_ACTIONS,
  GRANULAR_RBAC_RESOURCES,
  type GranularRbacMatrix,
} from '../../../core/rbacMatrix.js';

const MATRIX_SETTING_KEY = 'rbac_granular_matrix_v26';

interface SignedGranularMatrixPayload {
  matrix: GranularRbacMatrix;
  signature: string;
  updatedAt: string;
  signedBy: string;
}

function canonicalizeMatrix(matrix: GranularRbacMatrix): string {
  const roleKeys = Object.keys(matrix).sort();
  const normalized: Record<string, Record<string, Record<string, boolean>>> = {};
  for (const rKey of roleKeys) {
    const resMap = matrix[rKey] || {};
    normalized[rKey] = {};
    for (const res of GRANULAR_RBAC_RESOURCES) {
      const actSet = resMap[res.id] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        settings: false,
      };
      normalized[rKey][res.id] = {
        view: Boolean(actSet.view),
        create: Boolean(actSet.create),
        edit: Boolean(actSet.edit),
        delete: Boolean(actSet.delete),
        settings: Boolean(actSet.settings),
      };
    }
  }
  return JSON.stringify(normalized);
}

export function computeGranularMatrixHmac(matrix: GranularRbacMatrix): string {
  const secret = getEnvConfig().permissionHashSecret || 'skill98-rbac-hmac';
  const canonical = canonicalizeMatrix(matrix);
  return crypto.createHmac('sha256', `${secret}:rbac-matrix-v26`).update(canonical).digest('hex');
}

function sanitizeMatrixInput(raw: unknown): GranularRbacMatrix {
  const defaults = buildDefaultGranularMatrix();
  if (!raw || typeof raw !== 'object') return defaults;
  const src = raw as Record<string, Record<string, Record<string, unknown>>>;
  const result: GranularRbacMatrix = {};

  for (const roleKey of Object.keys({ ...defaults, ...src })) {
    if (!/^[a-z0-9_]{2,40}$/i.test(roleKey)) continue;
    result[roleKey] = {};
    for (const res of GRANULAR_RBAC_RESOURCES) {
      const incoming = src[roleKey]?.[res.id];
      const fallback = defaults[roleKey]?.[res.id] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        settings: false,
      };
      result[roleKey][res.id] = {
        view: roleKey === 'super_admin' ? true : Boolean(incoming?.view ?? fallback.view),
        create: roleKey === 'super_admin' ? true : Boolean(incoming?.create ?? fallback.create),
        edit: roleKey === 'super_admin' ? true : Boolean(incoming?.edit ?? fallback.edit),
        delete: roleKey === 'super_admin' ? true : Boolean(incoming?.delete ?? fallback.delete),
        settings: roleKey === 'super_admin' ? true : Boolean(incoming?.settings ?? fallback.settings),
      };
    }
  }
  return result;
}

export function createRbacMatrixRouter() {
  const router = express.Router();

  router.get('/api/admin/permissions/matrix', requireAdmin, async (_req, res) => {
    try {
      const saved = await getSetting<SignedGranularMatrixPayload | null>(MATRIX_SETTING_KEY, null);
      if (!saved || !saved.matrix) {
        const defaultMatrix = buildDefaultGranularMatrix();
        const signature = computeGranularMatrixHmac(defaultMatrix);
        const initial: SignedGranularMatrixPayload = {
          matrix: defaultMatrix,
          signature,
          updatedAt: new Date().toISOString(),
          signedBy: 'system',
        };
        await setSetting(MATRIX_SETTING_KEY, initial);
        res.json({
          ok: true,
          ...initial,
          verified: true,
          resources: GRANULAR_RBAC_RESOURCES,
          actions: GRANULAR_ACTIONS,
        });
        return;
      }

      const expectedSig = computeGranularMatrixHmac(saved.matrix);
      const verified = expectedSig === saved.signature;
      res.json({
        ok: true,
        ...saved,
        verified,
        resources: GRANULAR_RBAC_RESOURCES,
        actions: GRANULAR_ACTIONS,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در خواندن ماتریس دسترسی RBAC',
      });
    }
  });

  router.post('/api/admin/permissions/matrix', requireSuperAdmin, async (req, res) => {
    try {
      const { matrix } = req.body as { matrix?: GranularRbacMatrix };
      const sanitized = sanitizeMatrixInput(matrix);
      const signature = computeGranularMatrixHmac(sanitized);
      const signedBy = req.authUser?.phone || 'super_admin';
      const payload: SignedGranularMatrixPayload = {
        matrix: sanitized,
        signature,
        updatedAt: new Date().toISOString(),
        signedBy,
      };
      await setSetting(MATRIX_SETTING_KEY, payload);
      await writeSystemLog({
        level: 'success',
        category: 'auth',
        title: 'به‌روزرسانی ماتریس granular RBAC با امضای HMAC-SHA256',
        detail: `امضای جدید: ${signature.slice(0, 20)}... توسط ${signedBy}`,
        sqlOrEndpoint: 'POST /api/admin/permissions/matrix',
      });
      res.json({ ok: true, ...payload, verified: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'خطا در ذخیره ماتریس RBAC',
      });
    }
  });

  return router;
}
