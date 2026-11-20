import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface ActivePopupItem {
  id: string;
  kind: 'announcement_bar' | 'modal_popup';
  title: string;
  message: string;
  cta_label?: string;
  cta_url?: string;
  trigger_delay_sec: number;
}

export const StorefrontPopupsRenderer: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const [barItem, setBarItem] = useState<ActivePopupItem | null>(null);
  const [modalItem, setModalItem] = useState<ActivePopupItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void apiJson<{ items?: ActivePopupItem[] }>('/api/v1/modules/announcements/active').then(
      ({ ok, data }) => {
        if (!ok || !Array.isArray(data.items)) return;
        const bar = data.items.find((i) => i.kind === 'announcement_bar');
        const modal = data.items.find((i) => i.kind === 'modal_popup');

        if (bar && sessionStorage.getItem(`dismiss_ann_${bar.id}`) !== '1') {
          setBarItem(bar);
        }
        if (modal && sessionStorage.getItem(`dismiss_ann_${modal.id}`) !== '1') {
          setModalItem(modal);
          timer = setTimeout(
            () => setShowModal(true),
            Math.max(1000, Number(modal.trigger_delay_sec || 4) * 1000)
          );
        }
      }
    );

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {barItem && (
        <div className="bg-[#1D4ED8] text-white px-4 py-2 text-xs flex items-center justify-center gap-3 relative">
          <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
          <span className="font-bold">
            <strong>{barItem.title}:</strong> {barItem.message}
          </span>
          {barItem.cta_label && barItem.cta_url && (
            <a
              href={barItem.cta_url}
              className="px-2.5 py-0.5 rounded-lg bg-white text-[#1D4ED8] font-extrabold shrink-0"
            >
              {barItem.cta_label}
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(`dismiss_ann_${barItem.id}`, '1');
              setBarItem(null);
            }}
            aria-label="بستن اعلان"
            className="absolute left-3 p-1 hover:bg-white/15 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showModal && modalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-[#1D4ED8]">
                <Megaphone className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                  {modalItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`dismiss_ann_${modalItem.id}`, '1');
                  setShowModal(false);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {modalItem.message}
            </p>
            <div className="flex items-center gap-2">
              {modalItem.cta_label && modalItem.cta_url && (
                <a
                  href={modalItem.cta_url}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold text-center"
                >
                  {modalItem.cta_label}
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`dismiss_ann_${modalItem.id}`, '1');
                  setShowModal(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
