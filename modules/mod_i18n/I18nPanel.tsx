import React, { useEffect, useState } from 'react';
import { Globe2, Plus } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface TranslationRow {
  t_key: string;
  fa_text: string;
  en_text: string;
  ar_text: string;
}

export const I18nPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [items, setItems] = useState<TranslationRow[]>([]);
  const [tKey, setTKey] = useState('');
  const [faText, setFaText] = useState('');
  const [enText, setEnText] = useState('');
  const [arText, setArText] = useState('');

  const loadList = async () => {
    const { ok, data } = await apiJson<{ items?: TranslationRow[] }>(
      '/api/v1/modules/i18n/admin/list'
    );
    if (ok) setItems(data.items || []);
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/i18n/admin/save', {
      method: 'POST',
      body: JSON.stringify({ tKey, faText, enText, arText }),
    });
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ذخیره کلید ترجمه');
      return;
    }
    setTKey('');
    setFaText('');
    setEnText('');
    setArText('');
    onNotice?.('success', 'کلید چندزبانه (فارسی / انگلیسی / عربی) ذخیره شد.');
    void loadList();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
          <Globe2 className="w-4 h-4" />
          <span>موتور چندزبانه RTL/LTR — فارسی، انگلیسی و عربی (mod_i18n)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          مدیریت دیکشنری پویا و پشتیبانی هم‌زمان از جهت راست‌به‌چپ (fa/ar) و چپ‌به‌راست (en)
        </h2>
      </div>

      <form
        onSubmit={(e) => void handleSave(e)}
        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
      >
        <input
          type="text"
          dir="ltr"
          required
          value={tKey}
          onChange={(e) => setTKey(e.target.value)}
          placeholder="کلید (مثلاً: hero.cta)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
        />
        <input
          type="text"
          required
          value={faText}
          onChange={(e) => setFaText(e.target.value)}
          placeholder="متن فارسی (RTL)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="text"
          dir="ltr"
          value={enText}
          onChange={(e) => setEnText(e.target.value)}
          placeholder="English (LTR)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="text"
          value={arText}
          onChange={(e) => setArText(e.target.value)}
          placeholder="العربية (RTL)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <button
          type="submit"
          className="py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> ذخیره کلید
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <tr>
              <th className="p-3">کلید (Key)</th>
              <th className="p-3">فارسی (fa · RTL)</th>
              <th className="p-3">English (en · LTR)</th>
              <th className="p-3">العربية (ar · RTL)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {items.map((row) => (
              <tr key={row.t_key}>
                <td className="p-3 font-mono text-[#1D4ED8]" dir="ltr">{row.t_key}</td>
                <td className="p-3 font-bold">{row.fa_text}</td>
                <td className="p-3" dir="ltr">{row.en_text}</td>
                <td className="p-3">{row.ar_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
