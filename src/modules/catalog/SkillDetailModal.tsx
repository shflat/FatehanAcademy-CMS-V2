import React, { useEffect, useRef } from 'react';
import { X, Bookmark, Download, ShoppingBag } from 'lucide-react';
import type { SkillProduct } from '../../core/types';
import type { AccentStyleTokens } from '../../theme/accentStyles';
import {
  getPosterPalette,
  PosterGeometricSymbol,
} from '../../theme/components/SkillPosterCard';

interface SkillDetailModalProps {
  skill: SkillProduct | null;
  brandNameFa: string;
  bookmarkedIds: string[];
  claimedSkillIds: string[];
  accentStyles: AccentStyleTokens;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
  onQuickSkillAction: (skill: SkillProduct) => void;
  onAddToCart: (skill: SkillProduct) => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  brandNameFa,
  bookmarkedIds,
  claimedSkillIds,
  accentStyles,
  onClose,
  onToggleBookmark,
  onQuickSkillAction,
  onAddToCart,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (skill && overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }
  }, [skill]);

  if (!skill) return null;

  const palette = getPosterPalette(skill.posterColor, skill.category);
  const isClaimed = claimedSkillIds.includes(skill.id);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-2xl my-8">
        <div
          className={`md:col-span-5 p-8 flex flex-col justify-between min-h-[260px] ${palette.outerBg}`}
        >
          <div className="flex items-center justify-between text-xs smooth-nums">
            <span className="font-extrabold">{brandNameFa}.</span>
            <span dir="ltr" className="font-bold">
              {skill.posterCode || 'SKILL / ۰۱'}
            </span>
          </div>

          <div className="my-auto flex items-center justify-center py-6">
            <PosterGeometricSymbol
              type={skill.posterIconType}
              strokeColor={palette.symbolStroke}
              className="w-32 h-32"
            />
          </div>

          <div className="space-y-1 text-xs smooth-nums">
            <div className="font-extrabold">ابزار سازگار: {skill.category}</div>
            <div className="text-[11px] opacity-80">{skill.level}</div>
          </div>
        </div>

        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-stone-500 dark:text-stone-400 smooth-nums">
                <span className="font-extrabold text-stone-900 dark:text-white">
                  {skill.category}
                </span>
                <span className="mx-1.5">·</span>
                <span>{skill.subCategory || 'کاربردی'}</span>
                <span className="mx-1.5">·</span>
                <span>{skill.level}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-white leading-snug">
              {skill.title}
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {skill.shortDescription}
            </p>

            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-1">
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                خروجی مورد انتظار این اسکیل:
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {skill.expectedOutput ||
                  'خروجی ساختاریافته و آماده اجرا متناسب با استانداردهای پروژه.'}
              </p>
            </div>

            {skill.skillMarkdownContent && (
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                  پیش‌نمایش فایل اسکیل (SKILL.md):
                </div>
                <pre
                  dir="ltr"
                  className="p-3 rounded-xl bg-stone-950 text-stone-200 font-mono text-[11px] max-h-40 overflow-y-auto"
                >
                  <code>{skill.skillMarkdownContent}</code>
                </pre>
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-stone-500">قیمت محصول:</div>
              <div className="text-lg font-extrabold smooth-nums tabular-nums text-stone-900 dark:text-white">
                {skill.price === 0
                  ? 'رایگان (افزودن به پیشخوان کاربری)'
                  : `${skill.price.toLocaleString('fa-IR')} تومان`}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onToggleBookmark(skill.id)}
                className="p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                title="ذخیره در نشان‌شده‌ها"
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={bookmarkedIds.includes(skill.id) ? 'currentColor' : 'none'}
                />
              </button>

              {skill.price === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onQuickSkillAction(skill);
                    if (isClaimed) {
                      onClose();
                    }
                  }}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
                    isClaimed
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : accentStyles.button
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isClaimed
                      ? 'دانلود از پیشخوان کاربری ←'
                      : 'افزودن رایگان به حساب کاربری'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddToCart(skill)}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${accentStyles.button}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>افزودن به سبد خرید</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
