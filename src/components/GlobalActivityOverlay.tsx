import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import {
  subscribeApiActivity,
  subscribeGlobalToasts,
  type GlobalActivitySnapshot,
  type GlobalToastPayload,
} from '../core/apiClient';

export const GlobalActivityOverlay: React.FC = () => {
  const [activity, setActivity] = useState<GlobalActivitySnapshot>({
    pendingCount: 0,
    label: 'در حال ذخیره و پردازش...',
  });
  const [toasts, setToasts] = useState<GlobalToastPayload[]>([]);

  useEffect(() => {
    const unsubActivity = subscribeApiActivity((snap) => {
      setActivity(snap);
    });

    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubToasts = subscribeGlobalToasts((incoming) => {
      setToasts((prev) => {
        // Avoid stacking exact duplicate messages back-to-back
        const deduped = prev.filter((item) => item.text !== incoming.text);
        return [...deduped.slice(-3), incoming];
      });
      const ttl = incoming.durationMs ?? 4500;
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== incoming.id));
        timers.delete(incoming.id);
      }, ttl);
      timers.set(incoming.id, timer);
    });

    return () => {
      unsubActivity();
      unsubToasts();
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const isBusy = activity.pendingCount > 0;

  return (
    <>
      {/* Ultra-crisp top progress bar during any save / delete / upload / backup request */}
      {isBusy && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 z-[10000] h-[3px] bg-blue-500/20 overflow-hidden pointer-events-none"
        >
          <div className="h-full w-1/2 bg-gradient-to-l from-[#1D4ED8] via-sky-400 to-emerald-400 animate-pulse" />
        </div>
      )}

      {/* Global floating spinner pill so the user always knows work is in progress */}
      {isBusy && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-2xl bg-stone-900/95 dark:bg-white/95 text-white dark:text-stone-950 shadow-2xl border border-white/15 dark:border-stone-200 backdrop-blur-md flex items-center gap-2.5 text-xs font-extrabold pointer-events-none"
        >
          <Loader2 className="w-4 h-4 animate-spin text-sky-400 dark:text-[#1D4ED8] shrink-0" />
          <span>{activity.label}</span>
        </div>
      )}

      {/* Floating Transient Toast Stack (always visible regardless of scroll position) */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-4 sm:left-6 z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[300px] pointer-events-none"
        >
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            const isInfo = toast.type === 'info';
            return (
              <div
                key={toast.id}
                role="alert"
                className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start justify-between gap-3 text-xs font-bold leading-relaxed transition-all ${
                  isError
                    ? 'bg-rose-950/95 text-rose-50 border-rose-500/50'
                    : isInfo
                    ? 'bg-stone-900/95 text-stone-50 border-sky-500/40'
                    : 'bg-emerald-950/95 text-emerald-50 border-emerald-500/50'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : isInfo ? (
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span className="smooth-nums break-words">{toast.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="بستن اعلان"
                  className="p-0.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
