import React from 'react';
import { ArrowRight, Calendar, FileText, Globe } from 'lucide-react';
import type { CmsDynamicPage, SkillProduct } from '../../core/types';
import { formatIsoToJalali } from '../../core/jalali';
import { VisualComposerRenderer } from '../../modules/admin/components/VisualComposerRenderer';

interface DynamicPageViewProps {
  page: CmsDynamicPage;
  allPages: CmsDynamicPage[];
  products: SkillProduct[];
  onBackToStore: () => void;
  onSelectPage: (page: CmsDynamicPage) => void;
  onNavigateTab: (tab: 'store' | 'articles' | 'guide') => void;
  onSelectProduct?: (product: SkillProduct) => void;
}

export const DynamicPageView: React.FC<DynamicPageViewProps> = ({
  page,
  allPages,
  products,
  onBackToStore,
  onSelectPage,
  onNavigateTab,
  onSelectProduct,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Page Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#1D4ED8] dark:text-sky-400">
            <FileText className="w-4 h-4" />
            <span>برگه رسمی</span>
            <span className="text-stone-400">/</span>
            <span className="font-mono text-[11px]" dir="ltr">
              /page/{page.slug}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            {page.title}
          </h1>
          {page.summary && (
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
              {page.summary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>بروزرسانی: {formatIsoToJalali(page.updatedAt, { includeTime: false })}</span>
          </span>
          <button
            type="button"
            onClick={onBackToStore}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت به فروشگاه</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Strip Across Published Dynamic Pages */}
      {allPages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {allPages
            .filter((p) => p.status === 'published')
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(p)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  p.id === page.id
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-[#1D4ED8]'
                }`}
              >
                {p.title}
              </button>
            ))}
        </div>
      )}

      {/* Visual Composer Multi-Column Body */}
      <VisualComposerRenderer
        rows={page.composerRows}
        products={products}
        onNavigateTab={onNavigateTab}
        onSelectProduct={onSelectProduct}
      />

      {/* Footer Schema & Canonical Strip */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5 font-bold">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>ساختار سئو: Schema.org/{page.schemaType}</span>
        </span>
        <span className="font-mono" dir="ltr">
          Canonical: {page.canonicalUrl || `/page/${page.slug}`}
        </span>
      </div>
    </div>
  );
};
