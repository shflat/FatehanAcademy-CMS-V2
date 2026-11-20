import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Users,
  Edit3,
  Trash2,
  ShieldCheck,
  RefreshCw,
  FileKey2,
} from 'lucide-react';
import type {
  CmsPermissionKey,
  CmsRoleDefinition,
  CmsRolePermissions,
  HashedPermissionRecord,
} from '../../../core/types';
import {
  ALL_CAPABILITY_KEYS,
  CAPABILITY_LABELS_FA,
  EMPTY_ROLE_PERMISSIONS,
} from '../../../core/permissions';
import { apiJson } from '../../../core/apiClient';
import { RbacMatrixEditorCard } from '../components/RbacMatrixEditorCard';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface HashesReportPayload {
  algorithm: string;
  fileManifestPath: string;
  fileManifestValid: boolean;
  recordsCount: number;
  records: (HashedPermissionRecord & { integrityValid: boolean })[];
}

interface RbacPermissionsPanelProps {
  roles: CmsRoleDefinition[];
  canManageUsers: boolean;
  onUpdateRoles: (next: CmsRoleDefinition[]) => void;
  onGoToUsers: () => void;
  onNotice: NoticeFn;
}

export const RbacPermissionsPanel: React.FC<RbacPermissionsPanelProps> = ({
  roles,
  canManageUsers,
  onUpdateRoles,
  onGoToUsers,
  onNotice,
}) => {
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState<'admin' | 'seo_editor' | 'customer'>(
    'admin'
  );
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(null);

  const [hashesReport, setHashesReport] = useState<HashesReportPayload | null>(null);
  const [isLoadingHashes, setIsLoadingHashes] = useState(false);
  const [isResyncingHashes, setIsResyncingHashes] = useState(false);
  const [showHashTable, setShowHashTable] = useState(false);

  const loadPermissionHashes = useCallback(async () => {
    setIsLoadingHashes(true);
    try {
      const { ok, data } = await apiJson<HashesReportPayload>(
        '/api/admin/permissions/hashes'
      );
      if (ok && Array.isArray(data.records)) {
        setHashesReport(data);
      }
    } catch {
      // ignore initial read if guest/offline
    } finally {
      setIsLoadingHashes(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissionHashes();
  }, [loadPermissionHashes, roles]);

  const handleResyncPermissionHashes = async () => {
    setIsResyncingHashes(true);
    try {
      const { ok, data } = await apiJson<
        HashesReportPayload & { ok?: boolean; error?: string }
      >('/api/admin/permissions/resync', {
        method: 'POST',
      });
      if (!ok) {
        throw new Error(data.error || 'خطا در همگام‌سازی هش دسترسی‌ها');
      }
      setHashesReport(data);
      onNotice(
        'success',
        `تمامی ${Number(data.recordsCount || 0).toLocaleString('fa-IR')} دسترسی در جدول دیتابیس و فایل امضاشده (${data.fileManifestPath}) با HMAC-SHA256 همگام‌سازی و امضا شدند.`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در همگام‌سازی هش مجوزها'
      );
    } finally {
      setIsResyncingHashes(false);
    }
  };

  const handleToggleRolePermission = (
    roleId: string,
    permKey: CmsPermissionKey
  ) => {
    const updated = roles.map((r) => {
      if (r.id !== roleId) return r;
      const mergedPerms = { ...EMPTY_ROLE_PERMISSIONS, ...(r.permissions || {}) };
      return {
        ...r,
        permissions: {
          ...mergedPerms,
          [permKey]: !mergedPerms[permKey],
        },
      };
    });
    onUpdateRoles(updated);
    onNotice('success', 'مجوزهای سطح دسترسی نقش با موفقیت در سیستم بروزرسانی شد.');
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim()) {
      onNotice('error', 'نام نقش جدید را وارد کنید.');
      return;
    }
    const badgeMap: Record<'admin' | 'seo_editor' | 'customer', string> = {
      admin: 'bg-blue-500/15 text-blue-800 border-blue-400',
      seo_editor: 'bg-purple-500/15 text-purple-800 border-purple-400',
      customer: 'bg-stone-500/15 text-stone-700 border-stone-300',
    };
    const newRole: CmsRoleDefinition = {
      id: `role_${Date.now()}`,
      roleSlug: newRoleSlug,
      titleFa: newRoleTitle.trim(),
      badgeColor: badgeMap[newRoleSlug],
      description:
        newRoleDesc.trim() || 'نقش سفارشی تعریف‌شده در سیستم مدیریت اسکیل ۹۸',
      usersCount: 0,
      permissions: {
        ...EMPTY_ROLE_PERMISSIONS,
        canManageProducts: newRoleSlug === 'admin',
        canManageArticles: newRoleSlug !== 'customer',
        canManageMedia: newRoleSlug !== 'customer',
        canUseAiSeo: newRoleSlug !== 'customer',
      },
    };
    onUpdateRoles([...roles, newRole]);
    setNewRoleTitle('');
    setNewRoleDesc('');
    onNotice(
      'success',
      `نقش کاربری «${newRole.titleFa}» ایجاد و در دیتابیس و هش مانیفست ذخیره شد.`
    );
  };

  const handleSaveRoleMeta = (roleId: string) => {
    if (!editRoleTitle.trim()) return;
    const updated = roles.map((r) =>
      r.id === roleId
        ? {
            ...r,
            titleFa: editRoleTitle.trim(),
            description: editRoleDesc.trim() || r.description,
          }
        : r
    );
    onUpdateRoles(updated);
    setEditingRoleId(null);
    onNotice('success', 'مشخصات نقش کاربری بروزرسانی شد.');
  };

  const handleDeleteCustomRole = (roleId: string) => {
    const coreRoleIds = [
      'role_super_admin',
      'role_admin',
      'role_seo_editor',
      'role_customer',
    ];
    if (coreRoleIds.includes(roleId)) {
      onNotice('error', 'امکان حذف نقش‌های پایه سیستم وجود ندارد.');
      return;
    }
    onUpdateRoles(roles.filter((r) => r.id !== roleId));
    setConfirmDeleteRoleId(null);
    onNotice('success', 'نقش سفارشی از سیستم حذف شد.');
  };

  const invalidCount =
    hashesReport?.records.filter((r) => !r.integrityValid).length || 0;

  return (
    <div className="space-y-6">
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
              <Crown className="w-4 h-4" />
              <span>موتور کنترل دسترسی · ۱۲ مجوز عملیاتی هش‌شده</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
              مدیریت نقش‌ها و سطوح دسترسی (RBAC Engine)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              ایجاد، ویرایش یا حذف نقش‌ها و اعمال فوری ۱۲ سطح دسترسی در منوها و ابزارهای پنل ادمین
            </p>
          </div>

          {canManageUsers && (
            <button
              type="button"
              onClick={onGoToUsers}
              className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>مدیریت کاربران و انتساب نقش‌ها ←</span>
            </button>
          )}
        </div>

        {/* Create New Role Form */}
        <form
          onSubmit={handleCreateNewRole}
          className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <input
            type="text"
            value={newRoleTitle}
            onChange={(e) => setNewRoleTitle(e.target.value)}
            placeholder="نام نقش جدید (مثلاً: مدیر سئو و مارکتینگ)"
            className="px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
          />
          <select
            value={newRoleSlug}
            onChange={(e) =>
              setNewRoleSlug(e.target.value as 'admin' | 'seo_editor' | 'customer')
            }
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
          >
            <option value="admin">سطح پایه: مدیر عملیاتی (Admin)</option>
            <option value="seo_editor">سطح پایه: کارشناس محتوا و سئو</option>
            <option value="customer">سطح پایه: کاربر / مشتری ویژه</option>
          </select>
          <input
            type="text"
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)}
            placeholder="توضیح شرح وظایف و سطح دسترسی..."
            className="px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-extrabold rounded-xl bg-amber-400 text-stone-950 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            + ایجاد نقش کاربری جدید
          </button>
        </form>

        {/* Roles & 12 Granular Permission Switches */}
        <div className="space-y-4">
          {roles.map((role) => {
            const isCoreRole = [
              'role_super_admin',
              'role_admin',
              'role_seo_editor',
              'role_customer',
            ].includes(role.id);
            const isEditingThis = editingRoleId === role.id;
            const rolePerms: CmsRolePermissions = {
              ...EMPTY_ROLE_PERMISSIONS,
              ...(role.permissions || {}),
            };

            return (
              <div
                key={role.id}
                className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditingThis ? (
                      <div className="space-y-2 max-w-xl">
                        <input
                          type="text"
                          value={editRoleTitle}
                          onChange={(e) => setEditRoleTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-extrabold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                        <input
                          type="text"
                          value={editRoleDesc}
                          onChange={(e) => setEditRoleDesc(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveRoleMeta(role.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
                          >
                            ذخیره
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRoleId(null)}
                            className="px-3 py-1 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer"
                          >
                            لغو
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold text-stone-900 dark:text-white">
                            {role.titleFa}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${role.badgeColor}`}
                          >
                            {role.usersCount.toLocaleString('fa-IR')} کاربر ثبت‌شده
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                            {role.roleSlug}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">{role.description}</p>
                      </>
                    )}
                  </div>

                  {!isEditingThis && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setEditRoleTitle(role.titleFa);
                          setEditRoleDesc(role.description);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ویرایش عنوان</span>
                      </button>

                      {!isCoreRole &&
                        (confirmDeleteRoleId === role.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomRole(role.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer"
                            >
                              حذف نقش
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRoleId(null)}
                              className="px-2 py-1.5 rounded-xl border border-stone-300 text-xs font-bold cursor-pointer"
                            >
                              لغو
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRoleId(role.id)}
                            className="p-2 rounded-xl text-rose-600 border border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="حذف نقش سفارشی"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                  {ALL_CAPABILITY_KEYS.map((permKey) => {
                    const checked = Boolean(rolePerms[permKey]);
                    return (
                      <label
                        key={permKey}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                          checked
                            ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/30 text-stone-900 dark:text-white font-bold'
                            : 'border-stone-200 dark:border-stone-800 text-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={role.roleSlug === 'super_admin'}
                          onChange={() => handleToggleRolePermission(role.id, permKey)}
                        />
                        <span className="truncate">{CAPABILITY_LABELS_FA[permKey]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cryptographic HMAC-SHA256 Permission Hashes Inspector & Re-sync */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5">
              <FileKey2 className="w-4 h-4" />
              <span>امضای رمزنگاری‌شده مجوزها در دیتابیس و فایل (HMAC-SHA256)</span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              بازبینی یکپارچگی هش دسترسی‌ها (rbac_permission_hashes &{' '}
              <span dir="ltr" className="font-mono text-xs">
                {hashesReport?.fileManifestPath || 'data/permissions.hash.json'}
              </span>
              )
            </h3>
            <p className="text-xs text-stone-500">
              تمامی مجوزهای نقش‌ها به صورت هش HMAC-SHA256 در دیتابیس و مانیفست امضاشده فایل ذخیره می‌شوند تا هرگونه دستکاری غیرمجاز فوراً شناسایی شود.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHashTable((p) => !p)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              {showHashTable ? 'بستن جدول هش‌ها' : 'نمایش جدول هش دسترسی‌ها'}
            </button>
            <button
              type="button"
              disabled={isResyncingHashes}
              onClick={() => void handleResyncPermissionHashes()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isResyncingHashes ? 'animate-spin' : ''}`}
              />
              <span>
                {isResyncingHashes ? 'در حال بازسازی هش...' : 'بازسازی و همگام‌سازی هش‌ها'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950">
            <div className="text-stone-500">الگوریتم رمزنگاری و تعداد رکورد هش</div>
            <div className="font-extrabold text-stone-900 dark:text-white mt-1 smooth-nums">
              {hashesReport?.algorithm || 'HMAC-SHA256'} ·{' '}
              {(hashesReport?.recordsCount || 0).toLocaleString('fa-IR')} رکورد
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              hashesReport?.fileManifestValid
                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20'
            }`}
          >
            <div className="text-stone-500">وضعیت امضای فایل مانیفست دسترسی‌ها</div>
            <div className="font-extrabold mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {isLoadingHashes
                  ? 'در حال بررسی...'
                  : hashesReport?.fileManifestValid
                  ? 'امضای فایل معتبر و سالم ✓'
                  : 'نیازمند همگام‌سازی مجدد'}
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              invalidCount === 0
                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20'
            }`}
          >
            <div className="text-stone-500">سلامت رکوردهای هش در دیتابیس</div>
            <div className="font-extrabold mt-1 smooth-nums">
              {invalidCount === 0
                ? '۱۰۰٪ مطابق و بدون دستکاری ✓'
                : `${invalidCount.toLocaleString('fa-IR')} رکورد نامعتبر`}
            </div>
          </div>
        </div>

        {showHashTable && hashesReport && hashesReport.records.length > 0 && (
          <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl max-h-80">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="sticky top-0 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-2 px-3">نقش (Role ID)</th>
                  <th className="py-2 px-3">مجوز (Capability)</th>
                  <th className="py-2 px-3">وضعیت مجوز</th>
                  <th className="py-2 px-3">امضای HMAC-SHA256</th>
                  <th className="py-2 px-3">اصالت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {hashesReport.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-950/50">
                    <td className="py-2 px-3 font-mono text-[11px]" dir="ltr">
                      {rec.roleId}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]" dir="ltr">
                      {rec.capabilityKey}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.granted
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-stone-200/70 dark:bg-stone-800 text-stone-500'
                        }`}
                      >
                        {rec.granted ? 'مجاز (1)' : 'محدود (0)'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] text-stone-500" dir="ltr">
                      {rec.permissionHash.slice(0, 28)}...
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] font-extrabold ${
                          rec.integrityValid ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {rec.integrityValid ? 'معتبر ✓' : 'نامعتبر ✕'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase 10: Full Granular RBAC Matrix (view, create, edit, delete, settings) */}
      <RbacMatrixEditorCard onNotice={onNotice} />
    </div>
  );
};
