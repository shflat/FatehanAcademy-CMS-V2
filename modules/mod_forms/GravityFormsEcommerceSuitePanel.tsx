import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Download, ExternalLink, FileSpreadsheet, FileText,
  Layers, QrCode, Send, ShieldCheck, Truck,
} from 'lucide-react';
import { apiFetch, apiJson } from '../../src/core/apiClient';
import { formatToman } from '../../src/core/jalali';
import {
  IRAN_PROVINCES_AND_CITIES, getCitiesByProvince, isValidIranNationalId,
} from '../../src/core/iran-geo';

interface GravityFormsEcommerceSuitePanelProps {
  initialTab?: 'forms' | 'ecommerce';
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const GravityFormsEcommerceSuitePanel: React.FC<GravityFormsEcommerceSuitePanelProps> = ({
  initialTab = 'forms',
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'forms' | 'ecommerce'>(initialTab);

  // Gravity-Style Form Builder State
  const [formsList, setFormsList] = useState<Array<{
    id: string; slug: string; titleFa: string; pricingFormula: string;
    honeypotEnabled: boolean; submissionsCount: number;
  }>>([]);
  const [submissions, setSubmissions] = useState<Array<{
    id: string; formId: string; submitterPhone: string; submitterNationalId: string;
    provinceCity: string; calculatedPrice: number; createdAt: string;
  }>>([]);

  // Multi-Step Form Simulator with Conditional Logic & Iran Validation
  const [step, setStep] = useState<1 | 2>(1);
  const [simPhone, setSimPhone] = useState('09123456789');
  const [simNationalId, setSimNationalId] = useState('0013542419');
  const [simProvince, setSimProvince] = useState('tehran');
  const [simCity, setSimCity] = useState('تهران');
  const [teamSize, setTeamSize] = useState(5);
  const [needOfficialInvoice, setNeedOfficialInvoice] = useState(true);
  const [economicCode, setEconomicCode] = useState('411589632147');

  // YITH & Iranian E-Commerce Suite State
  const [shipments, setShipments] = useState<Array<{
    id: string; orderId: string; carrierCode: string; trackingCode: string;
    recipientName: string; recipientPhone: string; destinationCity: string;
  }>>([]);
  const [carrierCode, setCarrierCode] = useState('post_pishtaz');
  const [trackingCode, setTrackingCode] = useState('24850098412055');
  const [recipientName, setRecipientName] = useState('مهندس کیانوش شریفی');
  const [recipientPhone, setRecipientPhone] = useState('09123456789');
  const [feedPreview, setFeedPreview] = useState<{ title: string; count: number; sample: unknown } | null>(null);

  const baseFormulaPrice = 1500000 + teamSize * 450000;
  const calculatedTotal = needOfficialInvoice ? Math.round(baseFormulaPrice * 1.1) : baseFormulaPrice;

  const loadData = async () => {
    try {
      const [frmRes, ecRes] = await Promise.all([
        apiFetch('/api/v1/modules/forms'),
        apiFetch('/api/v1/modules/ecommerce/shipments'),
      ]);
      if (frmRes.ok) {
        const d = await frmRes.json();
        if (Array.isArray(d.forms)) setFormsList(d.forms);
        if (Array.isArray(d.submissions)) setSubmissions(d.submissions);
      }
      if (ecRes.ok) {
        const d = await ecRes.json();
        if (Array.isArray(d.shipments)) setShipments(d.shipments);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmitGravityForm = async () => {
    if (!isValidIranNationalId(simNationalId)) {
      onNotice('error', 'کد ملی ۱۰ رقمی واردشده در فرم معتبر نیست.');
      return;
    }
    try {
      const formId = formsList[0]?.id || 'form_enterprise_quote';
      const { ok } = await apiJson(`/api/v1/modules/forms/${formId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          phone: simPhone,
          nationalId: simNationalId,
          provinceCity: `${simProvince} - ${simCity}`,
          calculatedPrice: calculatedTotal,
          _hp_website_trap: '', // Honeypot clean
          payload: { teamSize, needOfficialInvoice, economicCode },
        }),
      });
      if (ok) {
        onNotice('success', `فرم چندمرحله‌ای با مبلغ محاسبه‌شده ${formatToman(calculatedTotal)} ثبت شد.`);
        void loadData();
      }
    } catch {
      onNotice('error', 'خطا در ثبت فرم');
    }
  };

  const handleDispatchShipmentSms = async () => {
    try {
      const { ok, data } = await apiJson<{ trackingCode?: string }>(
        '/api/v1/modules/ecommerce/shipments',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: `ord_${Date.now().toString().slice(-6)}`,
            carrierCode,
            trackingCode,
            recipientName,
            recipientPhone,
            destinationCity: simCity,
          }),
        }
      );
      if (ok) {
        onNotice('success', `کد رهگیری ${data.trackingCode} ثبت و پیامک خودکار به ${recipientPhone} ارسال شد.`);
        void loadData();
      }
    } catch {
      onNotice('error', 'خطا در ثبت مرسوله');
    }
  };

  const handleTestLiveFeed = async (feedType: 'torob' | 'emalls') => {
    try {
      const res = await apiFetch(`/api/v1/feeds/${feedType}`);
      if (res.ok) {
        const data = await res.json();
        setFeedPreview({
          title: feedType === 'torob' ? 'فید رسمی ترب (/api/v1/feeds/torob)' : 'فید رسمی ایمالز (/api/v1/feeds/emalls)',
          count: Number(data.count || data.totalItems || 0),
          sample: (data.products || data.items || []).slice(0, 2),
        });
      }
    } catch {
      onNotice('error', 'خطا در فراخوانی فید زنده');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-module Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('forms')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
              activeTab === 'forms' ? 'bg-[#1D4ED8] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            ۱. فرم‌ساز چندمرحله‌ای و منطق شرطی (mod_forms / Gravity)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ecommerce')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
              activeTab === 'ecommerce' ? 'bg-[#1D4ED8] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            ۲. حمل‌ونقل، فاکتور رسمی مودیان و فید ترب/ایمالز (mod_ecommerce_suite)
          </button>
        </div>
      </div>

      {activeTab === 'forms' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Multi-Step Form Preview & Conditional Logic Simulator (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold text-[#1D4ED8]">GRAVITY-STYLE FORM ENGINE · HONEYPOT ACTIVE</span>
                <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  فرم چندمرحله‌ای استعلام قیمت با منطق شرطی و فیلدهای بومی ایران
                </h3>
              </div>
              <a
                href="/api/v1/modules/forms/form_enterprise_quote/export.csv"
                download
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>خروجی Excel / CSV</span>
              </a>
            </div>

            {/* Step Indicator */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(1)} className={`p-2.5 rounded-xl text-xs font-extrabold text-right border cursor-pointer ${step === 1 ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30' : 'border-stone-200 dark:border-stone-800'}`}>
                گام ۱: هویت بومی (کد ملی و استان/شهر آبشاری)
              </button>
              <button type="button" onClick={() => setStep(2)} className={`p-2.5 rounded-xl text-xs font-extrabold text-right border cursor-pointer ${step === 2 ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30' : 'border-stone-200 dark:border-stone-800'}`}>
                گام ۲: منطق شرطی و فرمول محاسبه قیمت
              </button>
            </div>

            {step === 1 ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">شماره موبایل (ایران):</label>
                    <input type="tel" dir="ltr" value={simPhone} onChange={(e) => setSimPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold" />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">کد ملی ۱۰ رقمی (الگوریتم Modulo-11):</label>
                    <input type="text" dir="ltr" value={simNationalId} onChange={(e) => setSimNationalId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">استان:</label>
                    <select
                      value={simProvince}
                      onChange={(e) => {
                        setSimProvince(e.target.value);
                        const c = getCitiesByProvince(e.target.value)[0];
                        if (c) setSimCity(c);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                    >
                      {IRAN_PROVINCES_AND_CITIES.map((p) => (
                        <option key={p.id} value={p.id}>{p.nameFa}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">شهر (آبشاری):</label>
                    <select value={simCity} onChange={(e) => setSimCity(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold">
                      {getCitiesByProvince(simProvince).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(2)} className="w-full py-2.5 rounded-xl bg-[#1D4ED8] text-white font-extrabold cursor-pointer">
                  ادامه به گام دوم (منطق شرطی و قیمت) ←
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">تعداد اعضای تیم فنی (فیلد محاسباتی):</label>
                    <input type="number" min={1} max={100} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold" />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 font-extrabold p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 w-full cursor-pointer">
                      <input type="checkbox" checked={needOfficialInvoice} onChange={(e) => setNeedOfficialInvoice(e.target.checked)} />
                      <span>نیاز به فاکتور رسمی دارایی (+۱۰٪)</span>
                    </label>
                  </div>
                </div>

                {/* Conditional Logic Field */}
                {needOfficialInvoice && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                    <label className="font-extrabold text-amber-800 dark:text-amber-300 block">
                      [فیلد شرطی فعال‌شده] کد اقتصادی ۱۲ رقمی شرکت:
                    </label>
                    <input type="text" dir="ltr" value={economicCode} onChange={(e) => setEconomicCode(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-amber-400 bg-white dark:bg-stone-900 font-mono" />
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-950 flex items-center justify-between">
                  <span className="font-extrabold">مبلغ محاسبه‌شده خودکار فرم:</span>
                  <span className="text-base font-black text-[#1D4ED8] dark:text-amber-400 smooth-nums">{formatToman(calculatedTotal)}</span>
                </div>

                <button type="button" onClick={() => void handleSubmitGravityForm()} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                  <span>ثبت ورودی فرم + بررسی ضداسپم Honeypot</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Form Submissions (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <h4 className="text-sm font-black text-stone-900 dark:text-white">
              ورودی‌های ثبت‌شده در mod_forms_submissions ({submissions.length.toLocaleString('fa-IR')})
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {submissions.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950 text-xs space-y-1">
                  <div className="flex justify-between font-extrabold">
                    <span dir="ltr">{s.submitterPhone}</span>
                    <span className="text-emerald-600 smooth-nums">{formatToman(s.calculatedPrice)}</span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    کد ملی: {s.submitterNationalId} • {s.provinceCity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Iranian Shipping & Tracking SMS (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1D4ED8]" />
              <span>حمل‌ونقل ایران (پست پیشتاز، تیپاکس، پیک شهری) و پیامک خودکار کد رهگیری</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <select value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold">
                <option value="post_pishtaz">پست پیشتاز جمهوری اسلامی ایران</option>
                <option value="tipax">تیپاکس (Tipax Express)</option>
                <option value="city_courier">پیک موتوری ویژه شهری</option>
              </select>
              <input type="text" dir="ltr" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="کد رهگیری مرسوله" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono font-bold" />
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="نام گیرنده" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold" />
              <input type="tel" dir="ltr" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="موبایل گیرنده" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold" />
            </div>
            <button type="button" onClick={() => void handleDispatchShipmentSms()} className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer">
              ثبت کد رهگیری مرسوله + ارسال خودکار پیامک به خریدار
            </button>

            <div className="space-y-2 pt-2">
              {shipments.map((sh) => (
                <div key={sh.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-extrabold">{sh.recipientName} ({sh.destinationCity})</div>
                    <div className="text-[11px] text-stone-500">سرویس: {sh.carrierCode} • موبایل: {sh.recipientPhone}</div>
                  </div>
                  <span dir="ltr" className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                    {sh.trackingCode}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Torob & Emalls Feeds + Moadian Official Tax Invoice (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
              <h4 className="text-sm font-black text-stone-900 dark:text-white">
                فید زنده موتورهای جستجوی قیمت (ترب و ایمالز)
              </h4>
              <p className="text-xs text-stone-500">
                اندپوینت‌های استاندارد JSON متصل به موجودی لحظه‌ای انبار برای ربات‌های خزنده ترب و ایمالز:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void handleTestLiveFeed('torob')} className="py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer">
                  تست فید زنده ترب
                </button>
                <button type="button" onClick={() => void handleTestLiveFeed('emalls')} className="py-2 px-3 rounded-xl bg-blue-600 text-white text-xs font-extrabold cursor-pointer">
                  تست فید زنده ایمالز
                </button>
              </div>
              {feedPreview && (
                <div className="p-3 rounded-xl bg-stone-950 text-emerald-400 text-[11px] font-mono space-y-1 overflow-x-auto" dir="ltr">
                  <div className="text-amber-300 font-bold">{feedPreview.title} ({feedPreview.count} items)</div>
                  <pre>{JSON.stringify(feedPreview.sample, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
