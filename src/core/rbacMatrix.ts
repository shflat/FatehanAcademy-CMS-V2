export type GranularActionKey = 'view' | 'create' | 'edit' | 'delete' | 'settings';

export type GranularActionSet = Record<GranularActionKey, boolean>;

export interface GranularResourceMeta {
  id: string;
  labelFa: string;
  groupFa: string;
}

export const GRANULAR_ACTIONS: { key: GranularActionKey; labelFa: string }[] = [
  { key: 'view', labelFa: 'مشاهده' },
  { key: 'create', labelFa: 'ایجاد' },
  { key: 'edit', labelFa: 'ویرایش' },
  { key: 'delete', labelFa: 'حذف' },
  { key: 'settings', labelFa: 'تنظیمات' },
];

export const GRANULAR_RBAC_RESOURCES: GranularResourceMeta[] = [
  { id: 'dashboard', labelFa: 'پیشخوان و آمار', groupFa: 'هسته' },
  { id: 'products', labelFa: 'محصولات و فایل‌ها', groupFa: 'فروشگاه' },
  { id: 'orders', labelFa: 'سفارش‌ها و تخفیف‌ها', groupFa: 'فروشگاه' },
  { id: 'articles', labelFa: 'نوشته‌ها و مجله', groupFa: 'محتوا' },
  { id: 'pages', labelFa: 'برگه‌ها و صفحه‌ساز', groupFa: 'محتوا' },
  { id: 'media', labelFa: 'کتابخانه رسانه', groupFa: 'محتوا' },
  { id: 'users_rbac', labelFa: 'کاربران و نقش‌ها', groupFa: 'امنیت' },
  { id: 'live_chat', labelFa: 'گفتگوی زنده و تیکت', groupFa: 'ارتباطات' },
  { id: 'forms_crm', labelFa: 'فرم‌ساز و CRM', groupFa: 'ارتباطات' },
  { id: 'seo_analytics', labelFa: 'سئو، آنالیتیکس و GSC', groupFa: 'رشد' },
  { id: 'academy', labelFa: 'آکادمی و آموزش', groupFa: 'ماژول‌ها' },
  { id: 'plugins_commerce', labelFa: 'افزونه‌های فروش (کیف‌پول/همکاری/B2B)', groupFa: 'ماژول‌ها' },
  { id: 'bots_push', labelFa: 'ربات‌ها، وب‌هوک و وب‌پوش PWA', groupFa: 'ماژول‌ها' },
  { id: 'backup_cleaners', labelFa: 'بکاپ کامل و پاک‌سازها', groupFa: 'عملیات' },
  { id: 'modules_settings', labelFa: 'مرکز ماژول‌ها و تنظیمات کل', groupFa: 'سیستم' },
];

export type GranularRbacMatrix = Record<string, Record<string, GranularActionSet>>;

const ALL_TRUE: GranularActionSet = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  settings: true,
};

const ALL_FALSE: GranularActionSet = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  settings: false,
};

export function buildDefaultGranularMatrix(): GranularRbacMatrix {
  const superAdminMap: Record<string, GranularActionSet> = {};
  const adminMap: Record<string, GranularActionSet> = {};
  const seoEditorMap: Record<string, GranularActionSet> = {};
  const customerMap: Record<string, GranularActionSet> = {};

  for (const res of GRANULAR_RBAC_RESOURCES) {
    superAdminMap[res.id] = { ...ALL_TRUE };

    const isSuperOnly =
      res.id === 'users_rbac' || res.id === 'backup_cleaners' || res.id === 'modules_settings';
    adminMap[res.id] = isSuperOnly
      ? { view: true, create: false, edit: false, delete: false, settings: false }
      : { view: true, create: true, edit: true, delete: res.id !== 'orders', settings: false };

    const isEditorial = ['dashboard', 'articles', 'pages', 'media', 'seo_analytics'].includes(res.id);
    seoEditorMap[res.id] = isEditorial
      ? { view: true, create: true, edit: true, delete: false, settings: false }
      : { ...ALL_FALSE };

    customerMap[res.id] = { ...ALL_FALSE };
  }

  return {
    super_admin: superAdminMap,
    admin: adminMap,
    seo_editor: seoEditorMap,
    customer: customerMap,
  };
}
