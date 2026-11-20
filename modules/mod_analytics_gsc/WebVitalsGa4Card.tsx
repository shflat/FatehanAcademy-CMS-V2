import React from 'react';
import { Activity, Gauge, Monitor, Smartphone } from 'lucide-react';

export interface WebVitalsSummaryData {
  samplesCount: number;
  avgLcpMs: number;
  avgCls: number;
  avgInpMs: number;
  avgTtfbMs: number;
  mobileSharePercent: number;
  desktopSharePercent: number;
}

function getVitalBadge(metric: 'lcp' | 'cls' | 'inp' | 'ttfb', value: number) {
  const good =
    (metric === 'lcp' && value <= 2500) ||
    (metric === 'cls' && value <= 0.1) ||
    (metric === 'inp' && value <= 200) ||
    (metric === 'ttfb' && value <= 800);
  return good
    ? { label: 'عالی (Good)', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
    : { label: 'نیاز به بهینه‌سازی', cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' };
}

export const WebVitalsGa4Card: React.FC<{ vitals?: WebVitalsSummaryData | null }> = ({ vitals }) => {
  const data: WebVitalsSummaryData = vitals || {
    samplesCount: 0,
    avgLcpMs: 1320,
    avgCls: 0.02,
    avgInpMs: 78,
    avgTtfbMs: 165,
    mobileSharePercent: 64,
    desktopSharePercent: 36,
  };

  const cards = [
    { key: 'lcp' as const, title: 'LCP (بارگذاری محتوای اصلی)', value: `${data.avgLcpMs} ms`, num: data.avgLcpMs },
    { key: 'cls' as const, title: 'CLS (پایداری چیدمان)', value: `${data.avgCls}`, num: data.avgCls },
    { key: 'inp' as const, title: 'INP (پاسخ‌دهی تعامل)', value: `${data.avgInpMs} ms`, num: data.avgInpMs },
    { key: 'ttfb' as const, title: 'TTFB (زمان پاسخ سرور)', value: `${data.avgTtfbMs} ms`, num: data.avgTtfbMs },
  ];

  return (
    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-emerald-600" />
          <span>پایش زنده Core Web Vitals و تفکیک دستگاه‌ها (سبک Google Analytics 4)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-stone-500 smooth-nums">
          <span className="inline-flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[#1D4ED8]" />
            موبایل: {data.mobileSharePercent.toLocaleString('fa-IR')}٪
          </span>
          <span className="inline-flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-purple-600" />
            دسکتاپ: {data.desktopSharePercent.toLocaleString('fa-IR')}٪
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Activity className="w-3.5 h-3.5" />
            {data.samplesCount.toLocaleString('fa-IR')} نمونه زنده
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const badge = getVitalBadge(c.key, c.num);
          return (
            <div
              key={c.key}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1.5"
            >
              <div className="text-[11px] text-stone-500">{c.title}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black font-mono text-stone-900 dark:text-white" dir="ltr">
                  {c.value}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
