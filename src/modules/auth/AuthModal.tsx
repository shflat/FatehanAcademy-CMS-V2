import React from 'react';
import { X } from 'lucide-react';
import type { ThemeConfig } from '../../core/types';
import type { AccentStyleTokens } from '../../theme/accentStyles';

export type AuthStep = 'phone' | 'register_name' | 'code' | 'master_code';

export function toLatinDigits(raw: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let cleaned = raw;
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned
      .replace(new RegExp(persianDigits[i], 'g'), String(i))
      .replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return cleaned;
}

export function formatLivePhoneInput(raw: string): string {
  let cleaned = toLatinDigits(raw).replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/[^0-9]/g, '');
  } else {
    cleaned = cleaned.replace(/[^0-9]/g, '');
  }
  if (cleaned.startsWith('+98')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('0098')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('989') && cleaned.length >= 12)
    cleaned = '0' + cleaned.slice(2);
  else if (cleaned.startsWith('9') && cleaned.length === 10)
    cleaned = '0' + cleaned;
  return cleaned.slice(0, 14);
}

export function normalizeIranMobile(raw: string): string {
  let cleaned = toLatinDigits(raw.trim()).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+98')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('0098')) cleaned = '0' + cleaned.slice(4);
  cleaned = cleaned.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('989') && cleaned.length === 12)
    cleaned = '0' + cleaned.slice(2);
  else if (cleaned.startsWith('9') && cleaned.length === 10)
    cleaned = '0' + cleaned;
  return cleaned;
}

export function normalizeDigits(raw: string): string {
  return toLatinDigits(raw.trim()).replace(/[^0-9]/g, '');
}

interface AuthModalProps {
  isOpen: boolean;
  themeConfig: ThemeConfig;
  accentStyles: AccentStyleTokens;
  authStep: AuthStep;
  phoneInput: string;
  fullNameInput: string;
  otpInput: string;
  isAuthSubmitting: boolean;
  simulatedSmsCodeBanner: string | null;
  onPhoneChange: (val: string) => void;
  onFullNameChange: (val: string) => void;
  onOtpChange: (val: string) => void;
  onAuthStepChange: (step: AuthStep) => void;
  onClearSimulatedBanner: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  themeConfig,
  accentStyles,
  authStep,
  phoneInput,
  fullNameInput,
  otpInput,
  isAuthSubmitting,
  simulatedSmsCodeBanner,
  onPhoneChange,
  onFullNameChange,
  onOtpChange,
  onAuthStepChange,
  onClearSimulatedBanner,
  onClose,
  onSubmit,
  onGoogleLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <img
              src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
              alt={themeConfig.brandNameFa}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 bg-transparent border-0 p-0"
            />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
                ورود و ثبت‌نام در {themeConfig.brandNameFa}
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                احراز هویت سریع با شماره تلفن همراه و کد تایید پیامکی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} autoComplete="off" className="space-y-3.5">
          {authStep === 'phone' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300">
                شماره تلفن همراه (فرمت صحیح: 09123456789):
              </label>
              <input
                type="tel"
                name="skill98_auth_mobile_input"
                autoComplete="off"
                dir="ltr"
                required
                autoFocus
                value={phoneInput}
                onChange={(e) => onPhoneChange(formatLivePhoneInput(e.target.value))}
                onBlur={() => {
                  const norm = normalizeIranMobile(phoneInput);
                  if (norm) onPhoneChange(norm);
                }}
                placeholder="09123456789"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white smooth-nums focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          {authStep === 'register_name' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/70 text-xs">
                <span className="text-stone-600 dark:text-stone-300 smooth-nums">
                  شماره جدید: <strong dir="ltr">{phoneInput}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onAuthStepChange('phone');
                    onFullNameChange('');
                  }}
                  className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  تغییر شماره
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300">
                  شما رو با چه نامی خطاب کنیم ؟(نام ونام خانوادگی)
                </label>
                <input
                  type="text"
                  name="skill98_auth_fullname_input"
                  autoComplete="off"
                  required
                  autoFocus
                  value={fullNameInput}
                  onChange={(e) => onFullNameChange(e.target.value)}
                  placeholder="مثلاً: علی محمدی"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {(authStep === 'code' || authStep === 'master_code') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 smooth-nums">
                  {authStep === 'master_code'
                    ? `کد مستر امنیتی مدیریت برای ${phoneInput}:`
                    : `کد تایید ۵ رقمی ارسال‌شده به ${phoneInput}:`}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onAuthStepChange('phone');
                    onOtpChange('');
                    onClearSimulatedBanner();
                  }}
                  className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  ویرایش شماره
                </button>
              </div>
              <input
                type={authStep === 'master_code' ? 'password' : 'text'}
                name="skill98_auth_code_input"
                autoComplete="one-time-code"
                inputMode={authStep === 'master_code' ? 'text' : 'numeric'}
                dir="ltr"
                required
                autoFocus
                maxLength={authStep === 'master_code' ? 64 : 12}
                value={otpInput}
                onChange={(e) =>
                  onOtpChange(
                    authStep === 'master_code'
                      ? toLatinDigits(e.target.value)
                      : normalizeDigits(e.target.value)
                  )
                }
                placeholder={authStep === 'master_code' ? 'کد مستر امنیتی را وارد کنید' : '•••••'}
                className="w-full px-4 py-2.5 text-base font-extrabold text-center tracking-widest rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white smooth-nums focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isAuthSubmitting}
            className={`w-full py-3 px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${accentStyles.button}`}
          >
            {isAuthSubmitting
              ? 'در حال بررسی...'
              : authStep === 'phone'
              ? 'ادامه و بررسی شماره'
              : authStep === 'register_name'
              ? 'دریافت کد تایید پیامکی'
              : authStep === 'master_code'
              ? 'تایید کد مستر و ورود مدیریت'
              : 'تایید کد و ورود به حساب'}
          </button>
        </form>

        {authStep === 'phone' && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full py-2.5 px-4 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              ورود سریع با حساب گوگل (Google Sign-In)
            </button>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-stone-100/90 dark:bg-stone-950/80 border border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed text-center">
          لطفاً شماره همراه خود را وارد کنید تا سوابق خرید و فایل‌هایی که دریافت کرده‌اید همیشه به نام شما محفوظ بماند و در مراجعات بعدی نیز به تمامی آن‌ها دسترسی داشته باشید.
        </div>
      </div>
    </div>
  );
};
