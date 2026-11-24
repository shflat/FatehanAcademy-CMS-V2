import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatToman } from '../utils/formatters';
import { FatehanLogo } from '../ui/FatehanLogo';
import { X, Smartphone, ShieldCheck, CheckCircle2, Wallet, KeyRound } from 'lucide-react';

export const StoreOtpLoginModal: React.FC = () => {
  const {
    isOtpModalOpen,
    setIsOtpModalOpen,
    loggedInCustomer,
    syncAuthSession,
    adapter,
    settings,
    notify,
    refreshState,
  } = useFatehanTheme();

  const [phone, setPhone] = useState(loggedInCustomer?.phone || '');
  const [fullName, setFullName] = useState(loggedInCustomer?.fullName || '');
  const [otpSent, setOtpSent] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizePhone = (raw: string): string => {
    const digits = raw
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[^0-9]/g, '');
    if (digits.startsWith('009809') && digits.length === 15) return digits.slice(4);
    if (digits.startsWith('00989') && digits.length === 14) return '0' + digits.slice(4);
    if (digits.startsWith('9809') && digits.length === 13) return digits.slice(2);
    if (digits.startsWith('989') && digits.length === 12) return '0' + digits.slice(2);
    if (digits.startsWith('9') && digits.length === 10) return '0' + digits;
    return digits;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      const msg = 'شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع 09 وارد کنید.';
      setFeedback({ type: 'error', text: msg });
      notify(msg);
      return;
    }
    setPhone(cleanPhone);
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await adapter.sendOtp({ phone: cleanPhone, patternKey: 'otp_login' });
      if (result.ok) {
        setOtpSent(true);
        const msg = result.message || `کد تایید پیامکی به شماره ${cleanPhone} ارسال شد.`;
        setFeedback({ type: 'info', text: msg });
        notify(msg);
      } else {
        const msg = result.error || 'خطا در ارسال پیامک OTP';
        setFeedback({ type: 'error', text: msg });
        notify(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(phone);
    const cleanCode = enteredCode
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .trim();
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await adapter.verifyOtp({ phone: cleanPhone, code: cleanCode, fullName });
      if (result.ok && result.verified && result.user) {
        syncAuthSession(result.user, result.sessionToken);
        await refreshState();
        notify(result.message || 'ورود پیامکی با موفقیت انجام شد.');
        setIsOtpModalOpen(false);
        setOtpSent(false);
        setFeedback(null);
      } else {
        const msg = result.error || 'کد وارد شده معتبر نیست.';
        setFeedback({ type: 'error', text: msg });
        notify(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOtpModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOtpModalOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FatehanLogo size="xs" variant="mark" theme="dark" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    ورود پیامکی (OTP) به {settings.academyNameFa}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ورود امن با شماره موبایل جهت پیگیری دوره‌ها، سفارش‌ها و کیف پول
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {loggedInCustomer && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>حساب فعال: {loggedInCustomer.fullName}</span>
                    </span>
                    <span className="font-mono text-[11px] text-emerald-700" dir="ltr">
                      {loggedInCustomer.phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>اعتبار کیف پول قابل خرید:</span>
                    </span>
                    <span className="font-mono font-extrabold text-indigo-700">
                      {formatToman(loggedInCustomer.walletBalanceToman)}
                    </span>
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold leading-relaxed ${
                    feedback.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نام و نام خانوادگی کارآموز / ولی:
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      شماره موبایل جهت دریافت رمز یکبارمصرف (OTP):
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pr-9 pl-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                        placeholder="0912..."
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
                  >
                    {submitting ? 'در حال ارسال پیامک...' : 'ارسال کد تایید پیامکی (OTP)'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      کد تایید ارسال‌شده به {phone} را وارد کنید:
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        dir="ltr"
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                        className="w-full pr-9 pl-3.5 py-2.5 text-sm font-mono font-bold tracking-widest text-center bg-slate-50 border border-indigo-400 rounded-xl text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                    >
                      {submitting ? 'در حال بررسی...' : 'تایید کد و ورود به حساب'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      تغییر شماره
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>احراز هویت امن متصل به سیستم پیامک CMS v2.0.0</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
