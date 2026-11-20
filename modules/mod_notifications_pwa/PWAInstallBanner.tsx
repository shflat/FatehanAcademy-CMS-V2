import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIosBrowser, setIsIosBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('skill98_pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const ua = navigator.userAgent;
    setIsIosBrowser(/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [enabled]);

  if (!enabled) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('skill98_pwa_banner_dismissed', '1');
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }
    if (isIosBrowser) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500 text-stone-950 text-xs font-extrabold shadow-lg flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4" />
          <span>حالت آفلاین فعال است — صفحات کش‌شده در دسترس هستند</span>
        </div>
      )}

      {!isStandalone && !dismissed && (deferredPrompt || isIosBrowser) && (
        <div className="fixed bottom-20 md:bottom-5 left-3 sm:left-6 z-40 max-w-xs p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white">
              نصب اپلیکیشن وب (PWA)
            </div>
            <div className="text-[11px] text-stone-500 truncate">
              دسترسی سریع‌تر و آفلاین روی صفحه اصلی
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>نصب</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="بستن"
            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-extrabold text-stone-900 dark:text-white">
                نصب روی آیفون و آیپد (Safari)
              </strong>
              <button type="button" onClick={() => setShowIosGuide(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed flex items-start gap-2">
              <Share className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <span>
                در مرورگر Safari دکمه <strong>Share</strong> را بزنید و سپس گزینه{' '}
                <strong>Add to Home Screen</strong> را انتخاب کنید.
              </span>
            </p>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-[#1D4ED8] text-white font-extrabold cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
