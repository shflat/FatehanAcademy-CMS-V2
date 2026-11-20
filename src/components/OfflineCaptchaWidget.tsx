import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { apiJson } from '../core/apiClient';

interface OfflineCaptchaWidgetProps {
  value: string;
  onChange: (nextAnswer: string, token: string) => void;
  refreshSignal?: number;
  compact?: boolean;
}

export const OfflineCaptchaWidget: React.FC<OfflineCaptchaWidgetProps> = ({
  value,
  onChange,
  refreshSignal = 0,
  compact = false,
}) => {
  const [token, setToken] = useState('');
  const [svgDataUrl, setSvgDataUrl] = useState('');
  const [hintFa, setHintFa] = useState('کد امنیتی تصویر را وارد کنید');
  const [loading, setLoading] = useState(false);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        token?: string;
        svgDataUrl?: string;
        hintFa?: string;
      }>('/api/v1/captcha/challenge');
      if (ok && data.token && data.svgDataUrl) {
        setToken(data.token);
        setSvgDataUrl(data.svgDataUrl);
        if (data.hintFa) setHintFa(data.hintFa);
        onChange('', data.token);
      }
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    void loadChallenge();
  }, [refreshSignal]);

  return (
    <div
      className={`rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-950/70 ${
        compact ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-stone-600 dark:text-stone-300">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>کپچای امنیتی بومی (آفلاین)</span>
        </span>
        <button
          type="button"
          onClick={() => void loadChallenge()}
          disabled={loading}
          className="text-[11px] text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>کد جدید</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="h-[46px] min-w-[164px] rounded-lg border border-stone-200 dark:border-stone-700 bg-white overflow-hidden flex items-center justify-center">
          {svgDataUrl ? (
            <img src={svgDataUrl} alt="کد امنیتی" className="h-full w-auto select-none" />
          ) : (
            <span className="text-[11px] text-stone-400 px-3">در حال بارگذاری...</span>
          )}
        </div>

        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value, token)}
          placeholder={hintFa}
          className="flex-1 min-w-[130px] px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-extrabold text-center tracking-widest"
        />
      </div>
    </div>
  );
};
