import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  UserPlus,
  Search,
  Phone,
  Lock,
  Ban,
  Edit3,
  Trash2,
} from 'lucide-react';
import type { AdminUserRecord, CmsRoleDefinition } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface UsersDirectoryPanelProps {
  roles: CmsRoleDefinition[];
  onNotice: NoticeFn;
  onUsersChanged?: () => void;
}

export const UsersDirectoryPanel: React.FC<UsersDirectoryPanelProps> = ({
  roles,
  onNotice,
  onUsersChanged,
}) => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'suspended'
  >('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [formPhone, setFormPhone] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleId, setFormRoleId] = useState('role_customer');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>(
    'active'
  );
  const [formNotes, setFormNotes] = useState('');
  const [confirmDeletePhone, setConfirmDeletePhone] = useState<string | null>(
    null
  );

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await apiJson<{ users?: AdminUserRecord[] }>(
        '/api/admin/users'
      );
      if (ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch {
      onNotice('error', 'خطا در دریافت فهرست کاربران از سرور.');
    } finally {
      setIsLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const editingTarget = editingPhone
    ? users.find((u) => u.phone === editingPhone)
    : undefined;
  const isEditingMaster = editingTarget?.role === 'super_admin';

  const resetUserForm = () => {
    setEditingPhone(null);
    setFormPhone('');
    setFormFullName('');
    setFormEmail('');
    setFormRoleId('role_customer');
    setFormStatus('active');
    setFormNotes('');
    setIsFormOpen(false);
  };

  const handleOpenCreateUser = () => {
    setEditingPhone(null);
    setFormPhone('');
    setFormFullName('');
    setFormEmail('');
    setFormRoleId('role_admin');
    setFormStatus('active');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const handleEditUserClick = (user: AdminUserRecord) => {
    setEditingPhone(user.phone);
    setFormPhone(user.phone);
    setFormFullName(user.fullName);
    setFormEmail(user.email || '');
    setFormRoleId(user.roleId || 'role_customer');
    setFormStatus(user.status || 'active');
    setFormNotes(user.notes || '');
    setIsFormOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      onNotice('error', 'لطفاً نام و نام خانوادگی کاربر را وارد کنید.');
      return;
    }
    setIsSaving(true);
    try {
      const endpoint = editingPhone
        ? `/api/admin/users/${encodeURIComponent(editingPhone)}`
        : '/api/admin/users';
      const method = editingPhone ? 'PATCH' : 'POST';
      const { ok, data } = await apiJson<{
        error?: string;
        users?: AdminUserRecord[];
      }>(endpoint, {
        method,
        body: JSON.stringify({
          phone: formPhone,
          fullName: formFullName.trim(),
          email: formEmail.trim(),
          roleId: formRoleId,
          status: formStatus,
          notes: formNotes.trim(),
        }),
      });
      if (!ok) throw new Error(data.error || 'خطا در ثبت کاربر');
      if (Array.isArray(data.users)) setUsers(data.users);
      onNotice(
        'success',
        editingPhone
          ? `اطلاعات کاربر «${formFullName.trim()}» به‌روزرسانی شد.`
          : `کاربر جدید «${formFullName.trim()}» در سیستم ثبت گردید.`
      );
      resetUserForm();
      onUsersChanged?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات کاربر'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineRoleChange = async (
    user: AdminUserRecord,
    nextRoleId: string
  ) => {
    if (user.role === 'super_admin') {
      onNotice('error', 'نقش مدیر ارشد اصلی سیستم قابل تغییر نیست.');
      return;
    }
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        users?: AdminUserRecord[];
      }>(`/api/admin/users/${encodeURIComponent(user.phone)}`, {
        method: 'PATCH',
        body: JSON.stringify({ roleId: nextRoleId }),
      });
      if (!ok) throw new Error(data.error || 'خطا در تغییر نقش کاربر');
      if (Array.isArray(data.users)) setUsers(data.users);
      const roleTitle =
        roles.find((r) => r.id === nextRoleId)?.titleFa || nextRoleId;
      onNotice('success', `نقش «${user.fullName}» به «${roleTitle}» تغییر یافت.`);
      onUsersChanged?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تغییر نقش'
      );
    }
  };

  const handleToggleSuspend = async (user: AdminUserRecord) => {
    if (user.role === 'super_admin') {
      onNotice('error', 'مسدود کردن مدیر ارشد اصلی مجاز نیست.');
      return;
    }
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        users?: AdminUserRecord[];
      }>(`/api/admin/users/${encodeURIComponent(user.phone)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!ok) throw new Error(data.error || 'خطا در تغییر وضعیت');
      if (Array.isArray(data.users)) setUsers(data.users);
      onNotice(
        'success',
        nextStatus === 'suspended'
          ? `حساب «${user.fullName}» مسدود شد و امکان ورود نخواهد داشت.`
          : `حساب «${user.fullName}» مجدداً فعال شد.`
      );
      onUsersChanged?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تغییر وضعیت کاربر'
      );
    }
  };

  const handleDeleteUser = async (phone: string) => {
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        users?: AdminUserRecord[];
      }>(`/api/admin/users/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      });
      if (!ok) throw new Error(data.error || 'خطا در حذف کاربر');
      if (Array.isArray(data.users)) setUsers(data.users);
      setConfirmDeletePhone(null);
      onNotice('success', `کاربر (${phone}) از سیستم حذف شد.`);
      onUsersChanged?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در حذف کاربر'
      );
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.roleId !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const staffCount = users.filter(
    (u) => u.role === 'super_admin' || u.role === 'admin'
  ).length;
  const customerCount = users.filter((u) => u.role === 'customer').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;
  const totalRevenue = users.reduce(
    (sum, u) => sum + Number(u.totalSpent || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] dark:text-blue-400 flex items-center gap-1.5 mb-1">
            <Users className="w-4 h-4" />
            <span>مدیریت یکپارچه کاربران، مشتریان و انتساب نقش‌های RBAC</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت کاربران و سطوح دسترسی حساب‌ها (
            {users.length.toLocaleString('fa-IR')} کاربر)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ایجاد کاربر جدید، انتساب مستقیم نقش‌های سیستمی، بررسی خریدها و
            مسدودسازی یا فعال‌سازی حساب‌ها با ذخیره در دیتابیس
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={() =>
              isFormOpen ? resetUserForm() : handleOpenCreateUser()
            }
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isFormOpen ? 'بستن فرم کاربر' : 'افزودن کاربر جدید'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[11px] font-bold text-stone-500">
            مدیران و کارشناسان
          </div>
          <div className="text-xl font-extrabold text-stone-900 dark:text-white mt-1 smooth-nums">
            {staffCount.toLocaleString('fa-IR')} حساب
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[11px] font-bold text-stone-500">
            مشتریان ثبت‌شده
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1 smooth-nums">
            {customerCount.toLocaleString('fa-IR')} مشتری
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[11px] font-bold text-stone-500">
            حساب‌های مسدود
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-1 smooth-nums">
            {suspendedCount.toLocaleString('fa-IR')} حساب
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[11px] font-bold text-stone-500">
            مجموع خرید کل کاربران
          </div>
          <div className="text-lg font-extrabold text-[#1D4ED8] dark:text-blue-400 mt-1 smooth-nums">
            {totalRevenue.toLocaleString('fa-IR')} تومان
          </div>
        </div>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSaveUserSubmit}
          className="border-2 border-amber-400/50 rounded-2xl bg-amber-50/30 dark:bg-stone-900 p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              {editingPhone
                ? `ویرایش پروفایل کاربر (${editingPhone})`
                : 'ثبت کاربر / مدیر جدید در دیتابیس'}
            </h3>
            <button
              type="button"
              onClick={resetUserForm}
              className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
            >
              انصراف
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                نام و نام خانوادگی *
              </label>
              <input
                type="text"
                required
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                placeholder="مثال: سارا محمدی"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                شماره موبایل * (با 09)
              </label>
              <input
                type="text"
                dir="ltr"
                required
                disabled={Boolean(editingPhone)}
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="09120000000"
                className="w-full px-3.5 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                ایمیل (اختیاری)
              </label>
              <input
                type="email"
                dir="ltr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={`user@${
                  typeof window !== 'undefined'
                    ? window.location.hostname
                    : 'example.com'
                }`}
                className="w-full px-3.5 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                نقش و سطح دسترسی (RBAC)
              </label>
              <select
                value={formRoleId}
                disabled={isEditingMaster}
                onChange={(e) => setFormRoleId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 disabled:opacity-60"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titleFa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                وضعیت حساب کاربری
              </label>
              <select
                value={formStatus}
                disabled={isEditingMaster}
                onChange={(e) =>
                  setFormStatus(
                    e.target.value === 'suspended' ? 'suspended' : 'active'
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 disabled:opacity-60"
              >
                <option value="active">فعال (مجاز به ورود و استفاده)</option>
                <option value="suspended">مسدود (مسدودسازی ورود OTP)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                یادداشت مدیریتی (اختیاری)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="توضیح داخلی برای ادمین‌ها..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetUserForm}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
            >
              لغو
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
            >
              {isSaving
                ? 'در حال ذخیره...'
                : editingPhone
                ? 'بروزرسانی اطلاعات کاربر'
                : 'ذخیره کاربر جدید'}
            </button>
          </div>
        </form>
      )}

      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-4 flex flex-col md:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو با نام، شماره موبایل، ایمیل یا یادداشت..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
        >
          <option value="all">
            همه نقش‌ها ({users.length.toLocaleString('fa-IR')})
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.titleFa}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as 'all' | 'active' | 'suspended'
            )
          }
          className="px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فقط کاربران فعال</option>
          <option value="suspended">فقط مسدودشده‌ها</option>
        </select>
      </div>

      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-stone-500">
            در حال بارگذاری لیست کاربران از دیتابیس...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500">
            کاربری مطابق با جستجو یا فیلتر فعلی یافت نشد.
          </div>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {filteredUsers.map((user) => {
              const isMaster = user.role === 'super_admin';
              const matchedRole = roles.find((r) => r.id === user.roleId);
              const lastLoginFa = user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString('fa-IR')
                : '—';

              return (
                <div
                  key={user.phone}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    user.status === 'suspended'
                      ? 'bg-rose-50/40 dark:bg-rose-950/10'
                      : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                        {user.fullName}
                      </span>

                      <span
                        dir="ltr"
                        className="px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono text-[11px] font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-stone-400" />
                        {user.phone}
                      </span>

                      {matchedRole && (
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${matchedRole.badgeColor}`}
                        >
                          {matchedRole.titleFa}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          user.status === 'suspended'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {user.status === 'suspended' ? 'مسدودشده' : 'فعال'}
                      </span>

                      {isMaster && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>محافظت‌شده</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 smooth-nums">
                      {user.email && (
                        <span className="font-mono" dir="ltr">
                          {user.email}
                        </span>
                      )}
                      <span>
                        اسکیل‌های ثبت‌شده:{' '}
                        <strong>
                          {user.claimedSkillIds.length.toLocaleString('fa-IR')}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        سفارش‌ها:{' '}
                        <strong>{user.ordersCount.toLocaleString('fa-IR')}</strong>{' '}
                        ({user.totalSpent.toLocaleString('fa-IR')} تومان)
                      </span>
                      <span>·</span>
                      <span>آخرین فعالیت: {lastLoginFa}</span>
                    </div>

                    {user.notes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        یادداشت: {user.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label={`نقش کاربر ${user.fullName}`}
                      disabled={isMaster}
                      value={user.roleId}
                      onChange={(e) =>
                        void handleInlineRoleChange(user, e.target.value)
                      }
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 disabled:opacity-60 cursor-pointer"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titleFa}
                        </option>
                      ))}
                    </select>

                    {!isMaster && (
                      <button
                        type="button"
                        onClick={() => void handleToggleSuspend(user)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                          user.status === 'suspended'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>
                          {user.status === 'suspended'
                            ? 'رفع مسدودیت'
                            : 'مسدود کردن'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditUserClick(user)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش</span>
                    </button>

                    {!isMaster &&
                      (confirmDeletePhone === user.phone ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(user.phone)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-extrabold cursor-pointer"
                          >
                            تایید حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePhone(null)}
                            className="px-2 py-1.5 rounded-xl border border-stone-300 text-[11px] font-bold cursor-pointer"
                          >
                            لغو
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePhone(user.phone)}
                          className="p-2 rounded-xl text-rose-600 border border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="حذف کاربر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
