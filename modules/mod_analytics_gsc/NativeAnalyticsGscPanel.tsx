import React, { useEffect, useState } from 'react';
import { BarChart3, Globe, MapPin, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { WebVitalsGa4Card, type WebVitalsSummaryData } from './WebVitalsGa4Card';

interface ProvinceSaleRow {
  province_id: string;
  province_name_fa: string;
  top_city_fa: string;
  orders_count: number;
  revenue_toman: number;
  visitors_count: number;
}

interface GscKeywordRow {
  id: string;
  query_text: string;
  target_page: string;
  clicks: number;
  impressions: number;
  ctr_percent: number;
  avg_position: number;
  index_status: string;
}

export const NativeAnalyticsGscPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [provinceSales, setProvinceSales] = useState<ProvinceSaleRow[]>([]);
  const [gscKeywords, setGscKeywords] = useState<GscKeywordRow[]>([]);
  const [summary, setSummary] = useState({
    totalProvinceRevenue: 0,
    totalProvinceVisitors: 0,
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: 8.5,
  });
  const [propertyUrl, setPropertyUrl] = useState('https://skill98.ir');
  const [newQueryText, setNewQueryText] = useState('');
  const [targetPage, setTargetPage] = useState('/store');
  const [loading, setLoading] = useState(false);
  const [webVitals, setWebVitals] = useState<WebVitalsSummaryData | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        summary?: typeof summary;
        webVitals?: WebVitalsSummaryData;
        provinceSales?: ProvinceSaleRow[];
        gscKeywords?: GscKeywordRow[];
        gscConfig?: { propertyUrl: string };
      }>('/api/v1/modules/analytics/overview');
      if (ok) {
        if (data.summary) setSummary(data.summary);
        if (data.webVitals) setWebVitals(data.webVitals);
        setProvinceSales(data.provinceSales || []);
        setGscKeywords(data.gscKeywords || []);
        if (data.gscConfig?.propertyUrl) setPropertyUrl(data.gscConfig.propertyUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const handleSyncGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ gscKeywords?: GscKeywordRow[] }>(
      '/api/v1/modules/analytics/gsc-sync',
      {
        method: 'POST',
        body: JSON.stringify({
          propertyUrl,
          newQueryText: newQueryText.trim() || undefined,
          targetPage,
        }),
      }
    );
    if (ok) {
      if (data.gscKeywords) setGscKeywords(data.gscKeywords);
      setNewQueryText('');
      onNotice?.('success', 'داده‌های Google Search Console و آمارگیر بومی همگام‌سازی شد.');
      void loadAnalytics();
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#1D4ED8]" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
              آمارگیر بومی (Intranet-Ready) + گزارش فروش ۳۱ استان + Google Search Console (mod_analytics_gsc)
            </h3>
            <p className="text-xs text-stone-500">
              ثبت بازدیدها بدون نیاز به گوگل آنالیتیکس در زمان محدودیت اینترنت + پایش کلیدواژه‌ها و ایندکس سرچ کنسول
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی آمار</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="text-[11px] text-stone-500">مجموع بازدیدکنندگان آمارگیر بومی</div>
          <div className="text-base font-black text-stone-900 dark:text-white smooth-nums">
            {summary.totalProvinceVisitors.toLocaleString('fa-IR')} نفر
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="text-[11px] text-stone-500">فروش تجمیعی استان‌های کشور</div>
          <div className="text-base font-black text-emerald-600 smooth-nums">
            {summary.totalProvinceRevenue.toLocaleString('fa-IR')} تومان
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="text-[11px] text-stone-500">کلیک ارگانیک Search Console</div>
          <div className="text-base font-black text-[#1D4ED8] dark:text-sky-400 smooth-nums">
            {summary.totalClicks.toLocaleString('fa-IR')} کلیک
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="text-[11px] text-stone-500">ایمپرشن گوگل و میانگین CTR</div>
          <div className="text-base font-black text-amber-600 smooth-nums">
            {summary.totalImpressions.toLocaleString('fa-IR')} ({summary.avgCtr}٪)
          </div>
        </div>
      </div>

      {/* GA4-Style Core Web Vitals & Device Split */}
      <WebVitalsGa4Card vitals={webVitals} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 31 Provinces Sales Breakdown */}
        <div className="lg:col-span-6 space-y-2.5">
          <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>گزارش فروش و ترافیک به تفکیک استان‌ها و شهرهای ایران</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="p-2.5">استان / شهر پیشتاز</th>
                  <th className="p-2.5">سفارش‌ها</th>
                  <th className="p-2.5">بازدید بومی</th>
                  <th className="p-2.5">فروش (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {provinceSales.map((p) => (
                  <tr key={p.province_id}>
                    <td className="p-2.5 font-extrabold">
                      {p.province_name_fa} <span className="text-stone-400">({p.top_city_fa})</span>
                    </td>
                    <td className="p-2.5 smooth-nums">{Number(p.orders_count).toLocaleString('fa-IR')}</td>
                    <td className="p-2.5 smooth-nums">{Number(p.visitors_count).toLocaleString('fa-IR')}</td>
                    <td className="p-2.5 font-black text-emerald-600 smooth-nums">
                      {Number(p.revenue_toman).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Google Search Console Keywords & Index Status */}
        <div className="lg:col-span-6 space-y-2.5">
          <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#1D4ED8]" />
              <span>کلمات کلیدی، کلیک و وضعیت ایندکس Google Search Console</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-bold" dir="ltr">
              {propertyUrl}
            </span>
          </div>

          <form onSubmit={(e) => void handleSyncGsc(e)} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newQueryText}
              onChange={(e) => setNewQueryText(e.target.value)}
              placeholder="افزودن کوئری پایش سرچ کنسول..."
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
            />
            <input
              type="text"
              dir="ltr"
              value={targetPage}
              onChange={(e) => setTargetPage(e.target.value)}
              placeholder="/product/..."
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>همگام‌سازی GSC API</span>
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="p-2.5">عبارت جستجو (Query)</th>
                  <th className="p-2.5">کلیک / ایمپرشن</th>
                  <th className="p-2.5">رتبه</th>
                  <th className="p-2.5">ایندکس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {gscKeywords.map((k) => (
                  <tr key={k.id}>
                    <td className="p-2.5">
                      <div className="font-extrabold text-stone-900 dark:text-white">{k.query_text}</div>
                      <div className="text-[10px] text-stone-400" dir="ltr">
                        {k.target_page}
                      </div>
                    </td>
                    <td className="p-2.5 smooth-nums">
                      <span className="font-black text-[#1D4ED8]">
                        {Number(k.clicks).toLocaleString('fa-IR')}
                      </span>{' '}
                      / {Number(k.impressions).toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2.5 font-extrabold smooth-nums">
                      <span className="inline-flex items-center gap-0.5 text-emerald-600">
                        <TrendingUp className="w-3 h-3" />
                        {k.avg_position}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                        Indexed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
