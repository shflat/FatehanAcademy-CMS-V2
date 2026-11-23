import React from 'react';
import defaultThemeManifest from './default/theme.json';
import fatehanThemeManifest from './fatehan/theme.manifest.json';
import type { FatehanThemeRootProps } from './fatehan/index';
import { createCmsV2ApiAdapter } from './fatehan/context/cmsApiAdapter';

const LazyFatehanThemeRoot = React.lazy(() =>
  import('./fatehan/index').then((mod) => ({ default: mod.FatehanThemeRoot }))
);

export type RegisteredThemeId = 'default' | 'fatehan';

export interface RegisteredThemeDefinition {
  id: RegisteredThemeId;
  nameFa: string;
  nameEn: string;
  version: string;
  descriptionFa: string;
  direction: 'rtl' | 'ltr';
  previewAccentHex: string;
  previewBgHex: string;
  recommendedModules: string[];
  badgeText: string;
  renderStandaloneRoot?: (props: FatehanThemeRootProps) => React.ReactElement;
}

export const THEME_REGISTRY: Record<RegisteredThemeId, RegisteredThemeDefinition> = {
  default: {
    id: 'default',
    nameFa: defaultThemeManifest.nameFa || 'پوسته استودیویی پیش‌فرض اسکیل ۹۸',
    nameEn: defaultThemeManifest.nameEn || 'Skill 98 Default Studio Theme',
    version: defaultThemeManifest.version || 'v2.5.0',
    descriptionFa:
      'پوسته مدرن فروشگاهی و محتوایی ویژه فروش اسکیل‌های هوش مصنوعی، محصولات دانلودی، فیزیکی و اشتراک VIP با ۵ پالت رنگی و حالت شب/روز.',
    direction: 'rtl',
    previewAccentHex: '#1D4ED8',
    previewBgHex: '#FAF9F6',
    recommendedModules: [
      'mod_catalog_orders',
      'mod_payment_hub',
      'mod_subscriptions',
      'mod_smart_crm',
    ],
    badgeText: 'پوسته استودیویی اسکیل ۹۸',
  },
  fatehan: {
    id: 'fatehan',
    nameFa: fatehanThemeManifest.nameFa || 'پوسته رسمی آکادمی رباتیک، برنامه‌نویسی و هوش مصنوعی فاتحان',
    nameEn: fatehanThemeManifest.name || 'Fatehan Robotics Academy Storefront Theme',
    version: fatehanThemeManifest.version || '2.0.0',
    descriptionFa:
      'پوسته تخصصی آکادمی و فروشگاه تجهیزات آموزشی با دپارتمان‌های ۵گانه، محاسبه‌گر شهریه، نقشه راه سنی، آزمایشگاه شبیه‌ساز ربات و بانک ایده‌ها.',
    direction: 'rtl',
    previewAccentHex: fatehanThemeManifest.designTokens?.primary || '#1d4ed8',
    previewBgHex: fatehanThemeManifest.designTokens?.background || '#F4F7FE',
    recommendedModules: ['mod_academy_suite', 'mod_payment_hub', 'mod_live_chat', 'mod_forms'],
    badgeText: 'پوسته پیش‌فرض هسته',
    renderStandaloneRoot: (props: FatehanThemeRootProps) =>
      React.createElement(
        React.Suspense,
        {
          fallback: React.createElement(
            'div',
            {
              dir: 'rtl',
              className:
                'min-h-screen flex items-center justify-center bg-[#F4F7FE] text-slate-700 text-sm font-extrabold',
            },
            'در حال بارگذاری پوسته آکادمی فاتحان...'
          ),
        },
        React.createElement(LazyFatehanThemeRoot, {
          adapter: props.adapter || createCmsV2ApiAdapter(),
          ...props,
        })
      ),
  },
};

export const REGISTERED_THEMES_LIST: RegisteredThemeDefinition[] = [
  THEME_REGISTRY.fatehan,
  THEME_REGISTRY.default,
];

export function resolveRegisteredTheme(themeId?: string | null): RegisteredThemeDefinition {
  if (themeId === 'default') return THEME_REGISTRY.default;
  return THEME_REGISTRY.fatehan;
}

export { createCmsV2ApiAdapter };
