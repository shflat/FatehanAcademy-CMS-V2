/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — Mobile Viewport Layout
 * Reads bottom tab navigation dynamically from CMS v2.0.0 `state.mobileBottomMenu`.
 */

import React from 'react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatPersianNumber } from '../utils/formatters';
import { SmoothScrollProgressBar, useAutoScrollReveal } from '../ui/ScrollReveal';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { StorefrontRouter } from '../pages/StorefrontRouter';
import { CmsMenuItem } from '../types';
import {
  Home,
  Store,
  ShoppingBag,
  Sparkles,
  Phone,
  Gift,
  FileText,
  Info,
  MapPin,
  Compass,
  CreditCard,
  User,
} from 'lucide-react';

function renderMobileIcon(icon?: CmsMenuItem['icon'], path?: string) {
  if (path === '/cart') return <ShoppingBag className="w-[15px] h-[15px] shrink-0" />;
  switch (icon) {
    case 'home':
      return <Home className="w-[15px] h-[15px] shrink-0" />;
    case 'sparkles':
      return <Sparkles className="w-[15px] h-[15px] shrink-0" />;
    case 'store':
      return <Store className="w-[15px] h-[15px] shrink-0" />;
    case 'phone':
      return <Phone className="w-[15px] h-[15px] shrink-0" />;
    case 'gift':
      return <Gift className="w-[15px] h-[15px] shrink-0" />;
    case 'file-text':
      return <FileText className="w-[15px] h-[15px] shrink-0" />;
    case 'info':
      return <Info className="w-[15px] h-[15px] shrink-0" />;
    case 'map-pin':
      return <MapPin className="w-[15px] h-[15px] shrink-0" />;
    case 'compass':
      return <Compass className="w-[15px] h-[15px] shrink-0" />;
    case 'credit-card':
      return <CreditCard className="w-[15px] h-[15px] shrink-0" />;
    case 'user':
      return <User className="w-[15px] h-[15px] shrink-0" />;
    default:
      return <Home className="w-[15px] h-[15px] shrink-0" />;
  }
}

export const MobileLayout: React.FC = () => {
  const { state, storePath, navigateStore, cartItems } = useFatehanTheme();
  const totalCartQty = cartItems.reduce((sum, it) => sum + it.qty, 0);
  useAutoScrollReveal(storePath);

  const mobileTabs = state.mobileBottomMenu;

  const isTabActive = (item: CmsMenuItem) => {
    if (item.path === '/') return storePath === '/';
    if (storePath === item.path) return true;
    if (item.matchPrefixes && item.matchPrefixes.length > 0) {
      return item.matchPrefixes.some((prefix) => storePath.startsWith(prefix));
    }
    return storePath.startsWith(item.path);
  };

  return (
    <div className="viewport-mobile min-h-screen bg-[#f8fcfd] sm:py-2">
      <SmoothScrollProgressBar />
      <div className="max-w-[430px] mx-auto fatehan-blue-canvas text-slate-900 sm:border sm:border-cyan-200/70 sm:rounded-3xl shadow-xl overflow-x-clip pb-18 min-h-screen relative">
        <StorefrontHeader />

        <main className="px-3.5 pb-10">
          <StorefrontRouter />
          <StorefrontFooter />
        </main>

        {/* Mobile Native Storefront Bottom Tab Navigation — Sleek Floating Inset Dock */}
        <nav className="no-print fixed bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-28px)] max-w-[396px] bg-white/95 backdrop-blur-md border border-cyan-200/80 rounded-2xl py-1 px-1.5 flex items-center justify-around text-[10px] font-bold text-slate-500 z-30 shadow-[0_10px_28px_-10px_rgba(8,145,178,0.22)]">
          {mobileTabs.map((item) => {
            const active = isTabActive(item);
            const isCartTab = item.path === '/cart';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateStore(item.path)}
                className={`relative flex flex-col items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap min-w-[48px] py-0.5 px-1 rounded-xl leading-tight transition-colors ${
                  active ? 'text-blue-600 font-black' : 'hover:text-slate-900'
                }`}
              >
                {renderMobileIcon(item.icon, item.path)}
                <span className="whitespace-nowrap">
                  {isCartTab
                    ? `${item.label} (${formatPersianNumber(totalCartQty)})`
                    : item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
