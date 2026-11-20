import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Phone, ShieldCheck, Zap } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import type { UserRoleType } from '../../src/core/types';

interface ChatInlineOtpCardProps {
  sessionId: string;
  onVerifiedLogin: (
    role: Exclude<UserRoleType, 'guest'>,
    phone: string,
    displayName?: string,
    roleId?: string,
    sessionToken?: string
  ) => void;
  onSessionLinked: (newMessages?: unknown[]) => void;
}

export const ChatInlineOtpCard: React.FC<ChatInlineOtpCardProps> = ({
  sessionId,
  onVerifiedLogin,
  onSessionLinked,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    const normalized = phone
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/\D/g, '');
    if (!/^09\d{9}$/.test(normalized)) {
      setErrorMsg('شماره موبایل معتبر نیست (مثال: 09123456789).');
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{ success?: boolean; message?: string; error?: string }>(
        '/api/sms/send-otp',
        {
          method: 'POST',
          body: JSON.stringify({ phone: normalized }),
        }
      );
      if (!ok) {
        setErrorMsg(data.error || 'خطا در ارسال کد تایید');
        return;
      }
      setPhone(normalized);
      setStep('otp');
      setStatusMsg(data.message || 'کد تایید ۵ رقمی به موبایل شما ارسال شد.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!code.trim()) {
      setErrorMsg('کد تایید را وارد کنید.');
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        verified?: boolean;
        phone?: string;
        role?: Exclude<UserRoleType, 'guest'>;
        roleId?: string;
        displayName?: string;
        sessionToken?: string;
        error?: string;
      }>('/api/sms/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code: code.trim() }),
      });
      if (!ok || !data.verified || !data.phone) {
        setErrorMsg(data.error || 'کد واردشده صحیح نیست.');
        return;
      }

      // Immediately authenticate user in SPA state (no page refresh)
      onVerifiedLogin(
        data.role || 'customer',
        data.phone,
        data.displayName,
        data.roleId,
        data.sessionToken
      );

      // Link current guest chat session to the verified account + upgrade to Urgent
      const linkRes = await apiJson<{ ok?: boolean; messages?: unknown[] }>(
        '/api/v1/modules/live-chat/link-session',
        {
          method: 'POST',
          headers: data.sessionToken
            ? { Authorization: `Bearer ${data.sessionToken}` }
            : undefined,
          body: JSON.stringify({ sessionId, upgradeToUrgent: true }),
        }
      );
      onSessionLinked(linkRes.ok ? linkRes.data.messages : undefined);
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-2">
        <div className="text-[10.5px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 leading-snug">
          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>اولویت «فوری» مختص کاربران عضو است. همینجا وارد شوید:</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-[10px] font-extrabold shrink-0 cursor-pointer"
        >
          ورود سریع با موبایل
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 bg-blue-50/80 dark:bg-slate-900 border-b border-blue-200 dark:border-slate-800 space-y-2 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-[#1D4ED8] dark:text-sky-300 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ورود / عضویت درون‌خطی برای اولویت فوری</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setErrorMsg('');
          }}
          className="text-[10px] text-stone-500 hover:text-stone-800 cursor-pointer"
        >
          بستن
        </button>
      </div>

      {step === 'phone' ? (
        <form onSubmit={(e) => void handleSendOtp(e)} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Phone className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              className="w-full pr-7 pl-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-right"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#1D4ED8] text-white font-extrabold text-[11px] cursor-pointer disabled:opacity-50"
          >
            {loading ? '...' : 'ارسال کد'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void handleVerifyOtp(e)} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <KeyRound className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="کد ۵ رقمی"
              className="w-full pr-7 pl-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-center tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{loading ? '...' : 'تایید'}</span>
          </button>
        </form>
      )}

      {statusMsg && <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{statusMsg}</div>}
      {errorMsg && <div className="text-[10px] font-bold text-rose-600">{errorMsg}</div>}
    </div>
  );
};
