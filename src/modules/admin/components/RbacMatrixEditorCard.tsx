import React, { useEffect, useState } from 'react';
import { Check, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiJson } from '../../../core/apiClient';
import {
  buildDefaultGranularMatrix,
  GRANULAR_ACTIONS,
  GRANULAR_RBAC_RESOURCES,
  type GranularActionKey,
  type GranularRbacMatrix,
} from '../../../core/rbacMatrix';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'سوپر ادمین (قفل‌شده کامل)',
  admin: 'ادمین فروشگاه و محتوا',
  seo_editor: 'ویرایشگر سئو و تحریریه',
  customer: 'مشتری عادی',
};

export const RbacMatrixEditorCard: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [matrix, setMatrix] = useState<GranularRbacMatrix>(() => buildDefaultGranularMatrix());
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [signature, setSignature] = useState('');
  const [verified, setVerified] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMatrix = async () => {
    const { ok, data } = await apiJson<{
      matrix?: GranularRbacMatrix;
      signature?: string;
      verified?: boolean;
    }>('/api/admin/permissions/matrix');
    if (ok && data.matrix) {
      setMatrix(data.matrix);
      setSignature(data.signature || '');
      setVerified(Boolean(data.verified));
    }
  };

  useEffect(() => {
    void loadMatrix();
  }, []);

  const toggleCell = (resId: string, action: GranularActionKey) => {
    if (selectedRole === 'super_admin') return;
    setMatrix((prev) => {
      const roleMap = { ...(prev[selectedRole] || {}) };
      const existing = roleMap[resId];
      const current = existing
        ? { ...existing }
        : {
            view: false,
            create: false,
            edit: false,
            delete: false,
            settings: false,
          };
      current[action] = !current[action];
      if (action !== 'view' && current[action]) {
        current.view = true;
      }
      roleMap[resId] = current;
      return { ...prev, [selectedRole]: roleMap };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{
        signature?: string;
        verified?: boolean;
        error?: string;
      }>('/api/admin/permissions/matrix', {
        method: 'POST',
        body: JSON.stringify({ matrix }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ذخیره ماتریس RBAC (فقط سوپر ادمین مجاز است).');
        return;
      }
      setSignature(data.signature || '');
      setVerified(Boolean(data.verified));
      onNotice?.('success', 'ماتریس دسترسی ریزدانه (Granular RBAC) با امضای HMAC-SHA256 ذخیره و قفل شد.');
    } finally {
      setSaving(false);
    }
  };

  const activeRoleMap = matrix[selectedRole] || {};

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>ماتریس دسترسی ریزدانه (Granular RBAC Matrix · HMAC-SHA256 Signed)</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            تعیین دقیق سطوح «مشاهده، ایجاد، ویرایش، حذف و تنظیمات» برای تک‌تک منوها و ماژول‌ها به تفکیک نقش
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {signature && (
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                verified
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
              dir="ltr"
            >
              {verified ? 'HMAC OK' : 'TAMPERED'}: {signature.slice(0, 12)}…
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadMatrix()}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بازخوانی</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-4 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'در حال امضا...' : 'ذخیره و امضای HMAC'}</span>
          </button>
        </div>
      </div>

      {/* Role Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(ROLE_LABELS).map(([roleKey, label]) => (
          <button
            key={roleKey}
            type="button"
            onClick={() => setSelectedRole(roleKey)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
              selectedRole === roleKey
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedRole === 'super_admin' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>دسترسی‌های سوپر ادمین برای جلوگیری از قفل شدن سامانه همواره کامل و غیرقابل غیرفعال‌سازی است.</span>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
            <tr>
              <th className="p-3">منو / ماژول</th>
              <th className="p-3">دسته</th>
              {GRANULAR_ACTIONS.map((a) => (
                <th key={a.key} className="p-3 text-center">
                  {a.labelFa}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {GRANULAR_RBAC_RESOURCES.map((res) => {
              const rowPerms = activeRoleMap[res.id] || {
                view: false,
                create: false,
                edit: false,
                delete: false,
                settings: false,
              };
              return (
                <tr key={res.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-950/40">
                  <td className="p-3 font-extrabold text-stone-900 dark:text-white">{res.labelFa}</td>
                  <td className="p-3 text-stone-500">{res.groupFa}</td>
                  {GRANULAR_ACTIONS.map((act) => (
                    <td key={act.key} className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(rowPerms[act.key])}
                        disabled={selectedRole === 'super_admin'}
                        onChange={() => toggleCell(res.id, act.key)}
                        className="w-4 h-4 accent-[#1D4ED8] cursor-pointer disabled:opacity-60"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
