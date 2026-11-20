import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellRing, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface UnreadSummaryResponse {
  ok?: boolean;
  totalUnread?: number;
  urgentUnread?: number;
  latestUnreadSessionId?: string;
  latestVisitorName?: string;
  latestPreview?: string;
}

function playGentleAlarmChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [659.25, 880.0]; // Soft E5 -> A5 chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.36);
    });
  } catch {
    // Ignore autoplay blocks until user interacts
  }
}

export const AdminGlobalChatAlarm: React.FC<{
  enabled: boolean;
  compact?: boolean;
  onJumpToChat: (sessionId?: string) => void;
}> = ({ enabled, compact = false, onJumpToChat }) => {
  const [summary, setSummary] = useState<UnreadSummaryResponse>({});
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('skill98_admin_chat_alarm_muted') === '1';
    } catch {
      return false;
    }
  });
  const prevUnreadRef = useRef<number>(0);

  const pollSummary = useCallback(async () => {
    if (!enabled) return;
    const { ok, data } = await apiJson<UnreadSummaryResponse>(
      '/api/v1/modules/live-chat/admin/unread-summary'
    );
    if (!ok || !data.ok) return;

    const nextUnread = Number(data.totalUnread || 0);
    if (nextUnread > prevUnreadRef.current) {
      if (!muted) {
        playGentleAlarmChime();
      }
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(
            data.urgentUnread
              ? `🔴 پیام فوری جدید از ${data.latestVisitorName || 'کاربر'}`
              : `💬 پیام جدید چت آنلاین از ${data.latestVisitorName || 'کاربر'}`,
            {
              body: data.latestPreview || 'برای مشاهده و پاسخ کلیک کنید.',
              icon: '/pwa-192x192.png',
            }
          );
        } catch {
          // ignore notification error
        }
      }
    }
    prevUnreadRef.current = nextUnread;
    setSummary(data);
  }, [enabled, muted]);

  useEffect(() => {
    if (!enabled) return;
    void pollSummary();
    const timer = setInterval(() => void pollSummary(), 5000);
    return () => clearInterval(timer);
  }, [enabled, pollSummary]);

  if (!enabled) return null;

  const totalUnread = Number(summary.totalUnread || 0);
  const urgentUnread = Number(summary.urgentUnread || 0);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem('skill98_admin_chat_alarm_muted', next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const handleOpenChat = () => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      void Notification.requestPermission().catch(() => {});
    }
    onJumpToChat(summary.latestUnreadSessionId || undefined);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleOpenChat}
          title={
            totalUnread > 0
              ? `${totalUnread} پیام جدید — کلیک برای ورود مستقیم`
              : 'صندوق چت آنلاین'
          }
          className={`relative h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-[11px] font-extrabold transition-all cursor-pointer ${
            totalUnread > 0
              ? 'bg-rose-600 text-white shadow-sm animate-pulse'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          {totalUnread > 0 ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          {totalUnread > 0 && (
            <span className="smooth-nums">{totalUnread.toLocaleString('fa-IR')}</span>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? 'فعال‌سازی صدای هشدار چت' : 'بی‌صدا کردن هشدار چت'}
          className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center cursor-pointer"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleOpenChat}
        className={`relative min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center gap-2 transition-all cursor-pointer ${
          totalUnread > 0
            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-[0_6px_18px_-4px_rgba(225,29,72,0.55)]'
            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:border-[#1D4ED8]'
        }`}
      >
        <span className="relative flex items-center justify-center">
          {totalUnread > 0 ? (
            <>
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-white/70" />
              <BellRing className="w-4 h-4 relative" />
            </>
          ) : (
            <MessageSquare className="w-4 h-4 text-[#1D4ED8]" />
          )}
        </span>
        <span>
          {totalUnread > 0
            ? urgentUnread > 0
              ? `${totalUnread.toLocaleString('fa-IR')} پیام جدید (${urgentUnread.toLocaleString('fa-IR')} فوری)`
              : `${totalUnread.toLocaleString('fa-IR')} پیام جدید چت`
            : 'چت زنده'}
        </span>
        {totalUnread > 0 && summary.latestVisitorName && (
          <span className="hidden xl:inline text-[10.5px] bg-white/20 px-2 py-0.5 rounded-lg max-w-[140px] truncate">
            {summary.latestVisitorName}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        title={muted ? 'فعال کردن صدای آلارم پیام جدید' : 'بی‌صدا کردن آلارم پیام جدید'}
        className="min-h-[40px] w-10 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-[#1D4ED8] text-stone-500 dark:text-stone-300 flex items-center justify-center cursor-pointer"
      >
        {muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
      </button>
    </div>
  );
};
