import React from 'react';
import {
  Home,
  FileText,
  ShoppingBag,
  Layers,
  User as UserIcon,
  Crown,
} from 'lucide-react';
import type { ActiveTab } from '../../core/types';
import type { AccentStyleTokens } from '../accentStyles';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  isLoggedIn: boolean;
  canAccessAdmin: boolean;
  cartTotalItems?: number;
  accentStyles: AccentStyleTokens;
  onNavigate: (tab: ActiveTab) => void;
  onOpenAuthModal: () => void;
  onOpenCart?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  isLoggedIn,
  canAccessAdmin,
  cartTotalItems = 0,
  onNavigate,
  onOpenAuthModal,
  onOpenCart,
}) => {
  const isHomeActive = activeTab === 'store' || activeTab === 'product_single';
  const isArticlesActive = activeTab === 'articles' || activeTab === 'article_single';
  const isDashboardActive = activeTab === 'dashboard';
  const isAdminActive = activeTab === 'admin';

  return (
    <div className="md:hidden fixed bottom-2.5 inset-x-3 z-40 pointer-events-none pb-safe">
      <nav
        aria-label="ناوبری اپلیکیشن موبایل"
        className="pointer-events-auto mx-auto max-w-md h-[54px] px-1.5 py-1 rounded-[24px] bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl backdrop-saturate-180 border border-white/90 dark:border-white/12 shadow-[0_8px_24px_rgba(15,23,42,0.09),0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-around gap-0.5"
      >
        <button
          type="button"
          onClick={() => onNavigate('store')}
          className={`flex-1 min-h-[44px] h-full px-1.5 rounded-[19px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            isHomeActive
              ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:bg-sky-400/18 dark:text-sky-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-[16px] h-[16px] shrink-0" strokeWidth={isHomeActive ? 2.2 : 1.75} />
          <span className="truncate leading-tight">خانه</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('articles')}
          className={`flex-1 min-h-[44px] h-full px-1.5 rounded-[19px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            isArticlesActive
              ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:bg-sky-400/18 dark:text-sky-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-[16px] h-[16px] shrink-0" strokeWidth={isArticlesActive ? 2.2 : 1.75} />
          <span className="truncate leading-tight">مجله</span>
        </button>

        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex-1 min-h-[44px] h-full px-1.5 rounded-[19px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all duration-200 text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <span className="relative">
              <ShoppingBag className="w-[16px] h-[16px] shrink-0" strokeWidth={1.75} />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1.5 -left-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#1D4ED8] text-white text-[8.5px] font-black flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-slate-900 smooth-nums">
                  {cartTotalItems.toLocaleString('fa-IR')}
                </span>
              )}
            </span>
            <span className="truncate leading-tight">سبد خرید</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn) {
              onOpenAuthModal();
            } else {
              onNavigate('dashboard');
            }
          }}
          className={`flex-1 min-h-[44px] h-full px-1.5 rounded-[19px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            isDashboardActive
              ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:bg-sky-400/18 dark:text-sky-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isLoggedIn ? (
            <Layers className="w-[16px] h-[16px] shrink-0" strokeWidth={isDashboardActive ? 2.2 : 1.75} />
          ) : (
            <UserIcon className="w-[16px] h-[16px] shrink-0" strokeWidth={isDashboardActive ? 2.2 : 1.75} />
          )}
          <span className="truncate leading-tight">
            {isLoggedIn ? 'حساب من' : 'ورود'}
          </span>
        </button>

        {canAccessAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`flex-1 min-h-[44px] h-full px-1.5 rounded-[19px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isAdminActive
                ? 'bg-amber-500/14 text-amber-700 dark:bg-amber-400/18 dark:text-amber-300'
                : 'text-amber-600/90 dark:text-amber-300/90 hover:bg-amber-500/8'
            }`}
          >
            <Crown className="w-[16px] h-[16px] shrink-0" strokeWidth={isAdminActive ? 2.2 : 1.75} />
            <span className="truncate leading-tight">مدیریت</span>
          </button>
        )}
      </nav>
    </div>
  );
};
