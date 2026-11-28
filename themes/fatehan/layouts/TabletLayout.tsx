/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — Tablet Viewport Layout
 */

import React from 'react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { SmoothScrollProgressBar, useAutoScrollReveal } from '../ui/ScrollReveal';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { StorefrontRouter } from '../pages/StorefrontRouter';

export const TabletLayout: React.FC = () => {
  const { storePath } = useFatehanTheme();
  useAutoScrollReveal(storePath);

  return (
    <div className="viewport-tablet min-h-screen bg-[#f8fcfd] py-4">
      <SmoothScrollProgressBar />
      <div className="max-w-[920px] mx-auto fatehan-blue-canvas text-slate-900 border border-cyan-200/70 rounded-2xl shadow-xl overflow-x-clip min-h-[92vh]">
        <StorefrontHeader />
        <main className="px-5 pb-12">
          <StorefrontRouter />
          <StorefrontFooter />
        </main>
      </div>
    </div>
  );
};
