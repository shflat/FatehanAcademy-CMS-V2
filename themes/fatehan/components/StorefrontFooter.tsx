import React, { useState } from 'react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { FatehanLogo } from '../ui/FatehanLogo';
import { DEFAULT_TYPOGRAPHY_CONFIG } from '../utils/defaultFallbacks';
import { ShieldCheck, Award, X, ExternalLink } from 'lucide-react';

function extractEnamadHref(rawHtml: string): string {
  if (!rawHtml) return '';
  const match = rawHtml.match(/href\s*=\s*["']([^"']+)["']/i);
  return match && match[1] ? match[1].trim() : '';
}

export const StorefrontFooter: React.FC = () => {
  const { state, settings, navigateStore } = useFatehanTheme();
  const [licenseLightboxOpen, setLicenseLightboxOpen] = useState(false);

  const typo = state.typography;
  const aboutText = typo.footerAboutText ?? DEFAULT_TYPOGRAPHY_CONFIG.footerAboutText!;
  const copyrightRight = typo.footerCopyrightRight ?? DEFAULT_TYPOGRAPHY_CONFIG.footerCopyrightRight!;
  const rawCreditLeft = typo.footerCreditLeft ?? DEFAULT_TYPOGRAPHY_CONFIG.footerCreditLeft!;
  const creditLeft = rawCreditLeft.replace('(دیپاتک)', '(dpatech)');
  const creditUrl = typo.footerCreditUrl ?? DEFAULT_TYPOGRAPHY_CONFIG.footerCreditUrl!;
  const customTrustHtml = typo.footerTrustHtml?.trim() || '';

  const enamadHtmlCode = typo.enamadHtmlCode?.trim() || '';
  const enamadUseCustomImage = Boolean(typo.enamadUseCustomImage);
  const enamadCustomImageUrl = typo.enamadCustomImageUrl?.trim() || '';
  const extractedEnamadUrl = extractEnamadHref(enamadHtmlCode);

  const licenseImageUrl = typo.licenseImageUrl?.trim() || '';
  const licenseTitle = typo.licenseTitle?.trim() || `مجوز رسمی ${settings.academyNameFa}`;
  const licenseTargetUrl = typo.licenseTargetUrl?.trim() || '';

  const handleNav = (path: string) => {
    navigateStore(path);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore
    }
  };

  return (
    <>
      <footer className="no-print mt-10 w-full text-right select-none">
        {/* Main Clean & Modern Footer Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200/90 px-6 py-7 sm:px-9 sm:py-8 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Right Side: Brand, Minimal Description & Dynamic Footer Menu */}
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <div onClick={() => handleNav('/')} className="cursor-pointer">
                <FatehanLogo size="md" theme="light" variant="full" showSubtitle={false} />
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-black whitespace-nowrap">
                {settings.taglinePrimary}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">{aboutText}</p>

            {/* Horizontal Navigation Pills from CMS Menus API */}
            <nav className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold text-slate-600">
              {state.footerMenu.map((item) => (
                <button
                  key={item.id || item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Left Side: Smart eNamad & Official License Slots */}
          <div className="w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-3 shrink-0">
            {enamadUseCustomImage && enamadCustomImageUrl ? (
              <a
                href={extractedEnamadUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                title="مشاهده اصالت نماد اعتماد الکترونیکی (اینماد)"
                className="w-24 h-28 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center p-2 text-center gap-1 transition-all hover:shadow-md cursor-pointer"
              >
                <img
                  src={enamadCustomImageUrl}
                  alt={`نماد اعتماد الکترونیکی ${settings.academyNameFa}`}
                  className="w-16 h-16 object-contain"
                />
                <span className="text-[10px] font-black text-slate-700 leading-tight">
                  نماد اعتماد
                </span>
              </a>
            ) : enamadHtmlCode ? (
              <div
                className="w-24 h-28 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: enamadHtmlCode }}
              />
            ) : (
              <div
                title="جایگاه نماد اعتماد الکترونیکی (قابل تنظیم در پنل ادمین)"
                className="w-24 h-28 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center p-2.5 text-center gap-1.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black text-slate-800 leading-tight">
                  نماد اعتماد
                </span>
                <span className="text-[9px] font-medium text-slate-400">اینماد (eNamad)</span>
              </div>
            )}

            {licenseImageUrl ? (
              licenseTargetUrl ? (
                <a
                  href={licenseTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={licenseTitle}
                  className="w-24 h-28 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 flex flex-col items-center justify-center p-2 text-center gap-1 transition-all hover:shadow-md cursor-pointer"
                >
                  <img
                    src={licenseImageUrl}
                    alt={licenseTitle}
                    className="w-16 h-16 object-contain rounded-lg"
                  />
                  <span className="text-[10px] font-black text-slate-800 leading-tight line-clamp-1">
                    مجوز رسمی
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setLicenseLightboxOpen(true)}
                  title="کلیک برای بزرگ‌نمایی تصویر مجوز رسمی"
                  className="w-24 h-28 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 flex flex-col items-center justify-center p-2 text-center gap-1 transition-all hover:shadow-md cursor-pointer"
                >
                  <img
                    src={licenseImageUrl}
                    alt={licenseTitle}
                    className="w-16 h-16 object-contain rounded-lg"
                  />
                  <span className="text-[10px] font-black text-slate-800 leading-tight">
                    مجوز رسمی
                  </span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (licenseTargetUrl) {
                    window.open(licenseTargetUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setLicenseLightboxOpen(true);
                  }
                }}
                title={licenseTitle}
                className="w-24 h-28 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:border-amber-400 flex flex-col items-center justify-center p-2.5 text-center gap-1.5 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black text-slate-800 leading-tight">
                  مجوز رسمی
                </span>
                <span className="text-[9px] font-medium text-slate-400">آموزشگاه تخصصی</span>
              </button>
            )}

            {customTrustHtml && (
              <div
                className="flex items-center gap-3"
                dangerouslySetInnerHTML={{ __html: customTrustHtml }}
              />
            )}
          </div>
        </div>

        {/* Sub-Footer */}
        <div className="pt-3.5 pb-2 px-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-slate-600 font-bold text-center sm:text-right">{copyrightRight}</div>
          <div className="text-[11px] text-slate-400 font-medium text-center sm:text-left whitespace-nowrap">
            {creditUrl ? (
              <a
                href={creditUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                {creditLeft}
              </a>
            ) : (
              <span>{creditLeft}</span>
            )}
          </div>
        </div>
      </footer>

      {licenseLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          onClick={() => setLicenseLightboxOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl text-right relative"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm sm:text-base font-black text-slate-900">{licenseTitle}</h4>
              </div>
              <button
                type="button"
                onClick={() => setLicenseLightboxOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {licenseImageUrl ? (
              <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 p-3 flex items-center justify-center">
                <img
                  src={licenseImageUrl}
                  alt={licenseTitle}
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-6 text-center space-y-2">
                <Award className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-sm font-black text-slate-900">{licenseTitle}</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تصویر مجوز رسمی را می‌توانید از بخش تنظیمات قالب در پنل مدیریت بارگذاری نمایید.
                </p>
              </div>
            )}

            {licenseTargetUrl && (
              <div className="mt-4 flex justify-end">
                <a
                  href={licenseTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  <span>مشاهده لینک استعلام مجوز</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
