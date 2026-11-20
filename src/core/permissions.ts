import type {
  AiEngineConfig,
  CmsPermissionKey,
  CmsRoleDefinition,
  CmsRolePermissions,
} from './types.js';

export const ALL_CAPABILITY_KEYS: CmsPermissionKey[] = [
  'canManageProducts',
  'canManageArticles',
  'canManageMedia',
  'canManagePageBuilder',
  'canUseAiSeo',
  'canManageOrders',
  'canManageGateways',
  'canManageUsers',
  'canManageRoles',
  'canManageSessions',
  'canManageBackups',
  'canManageThemes',
];

export const CAPABILITY_LABELS_FA: Record<CmsPermissionKey, string> = {
  canManageProducts: 'مدیریت محصولات و پکیج‌ها',
  canManageArticles: 'نگارش و ویرایش مقالات',
  canManageMedia: 'مدیریت کتابخانه رسانه',
  canManagePageBuilder: 'صفحه‌ساز صفحه اصلی و ویجت‌ها',
  canUseAiSeo: 'استفاده از دستیار سئوی هوشمند AI',
  canManageOrders: 'مدیریت سفارش‌ها و کد تخفیف',
  canManageGateways: 'تنظیم درگاه‌های پرداخت و پیامک',
  canManageUsers: 'مدیریت کاربران و اپراتورها',
  canManageRoles: 'تعریف نقش‌ها و سطوح دسترسی',
  canManageSessions: 'مشاهده و ابطال نشست‌های فعال',
  canManageBackups: 'مدیریت دیتابیس، بکاپ و بازیابی',
  canManageThemes: 'مدیریت پوسته، برندینگ و ظاهر',
};

export const EMPTY_ROLE_PERMISSIONS: CmsRolePermissions = {
  canManageProducts: false,
  canManageArticles: false,
  canManageMedia: false,
  canManagePageBuilder: false,
  canUseAiSeo: false,
  canManageOrders: false,
  canManageGateways: false,
  canManageUsers: false,
  canManageRoles: false,
  canManageSessions: false,
  canManageBackups: false,
  canManageThemes: false,
};

export const FULL_ROLE_PERMISSIONS: CmsRolePermissions = {
  canManageProducts: true,
  canManageArticles: true,
  canManageMedia: true,
  canManagePageBuilder: true,
  canUseAiSeo: true,
  canManageOrders: true,
  canManageGateways: true,
  canManageUsers: true,
  canManageRoles: true,
  canManageSessions: true,
  canManageBackups: true,
  canManageThemes: true,
};

export function resolveEffectivePermissions(
  activeUserRole: 'admin' | 'super_admin' | 'customer' | 'guest',
  activeUserRoleId: string | undefined,
  roles: CmsRoleDefinition[]
): CmsRolePermissions {
  if (activeUserRole === 'super_admin') {
    return { ...FULL_ROLE_PERMISSIONS };
  }
  if (activeUserRole !== 'admin') {
    return { ...EMPTY_ROLE_PERMISSIONS };
  }
  const matched =
    (activeUserRoleId && roles.find((r) => r.id === activeUserRoleId)) ||
    roles.find((r) => r.roleSlug === 'admin');
  return {
    ...EMPTY_ROLE_PERMISSIONS,
    ...(matched?.permissions || {}),
  };
}

export function canUserUseAiSeo(
  activeUserRole: 'admin' | 'super_admin' | 'customer' | 'guest',
  effectivePerms: CmsRolePermissions,
  aiConfig: AiEngineConfig
): boolean {
  if (activeUserRole === 'super_admin') return true;
  return (
    aiConfig.enableContentAssistant &&
    aiConfig.allowAdminAiSeo &&
    Boolean(effectivePerms.canUseAiSeo)
  );
}
