import type express from 'express';
import {
  requirePermission,
  type AuthenticatedRequest,
} from '../core/permissionsEngine.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        phone: string;
        role: string;
        roleId?: string;
      };
    }
  }
}

function attachAuthUser(
  inner: express.RequestHandler
): express.RequestHandler {
  return (req, res, next) => {
    inner(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      const authReq = req as AuthenticatedRequest;
      if (authReq.authSession) {
        req.authUser = {
          phone: authReq.authSession.phone,
          role: authReq.authSession.role,
          roleId: authReq.authSession.role_id,
        };
      }
      next();
    });
  };
}

export const requireAdmin = attachAuthUser(requirePermission('admin_panel'));
export const requireSuperAdmin = attachAuthUser(requirePermission('super_admin'));
