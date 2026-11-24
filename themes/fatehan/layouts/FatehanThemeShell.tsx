/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — Master Storefront Shell
 * Renders the appropriate viewport layout (Desktop / Tablet / Mobile)
 * along with lazy-loaded global overlays (CartDrawer, VideoLabModal, StoreOtpLoginModal, Toast).
 */

import React, { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { DesktopLayout } from './DesktopLayout';
import { TabletLayout } from './TabletLayout';
import { MobileLayout } from './MobileLayout';

const CartDrawer = lazy(() =>
  import('../components/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const VideoLabModal = lazy(() =>
  import('../components/VideoLabModal').then((m) => ({ default: m.VideoLabModal }))
);
const StoreOtpLoginModal = lazy(() =>
  import('../components/StoreOtpLoginModal').then((m) => ({ default: m.StoreOtpLoginModal }))
);

export const FatehanThemeShell: React.FC = () => {
  const {
    viewportMode,
    toastMessage,
    isCartDrawerOpen,
    activeVideoModal,
    isOtpModalOpen,
  } = useFatehanTheme();

  return (
    <div dir="rtl" className="fatehan-theme-root">
      {viewportMode === 'mobile' ? (
        <MobileLayout />
      ) : viewportMode === 'tablet' ? (
        <TabletLayout />
      ) : (
        <DesktopLayout />
      )}

      {/* Lazy-Loaded Global Storefront Drawers & Modals (only downloaded when opened) */}
      <Suspense fallback={null}>
        {isCartDrawerOpen && <CartDrawer />}
        {Boolean(activeVideoModal) && <VideoLabModal />}
        {isOtpModalOpen && <StoreOtpLoginModal />}
      </Suspense>

      {/* Global Storefront Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="no-print fixed bottom-6 left-6 z-[110] max-w-sm bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-relaxed">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
