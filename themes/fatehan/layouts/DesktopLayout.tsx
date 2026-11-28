/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — Desktop Viewport Layout
 */

import React from 'react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { SmoothScrollProgressBar, useAutoScrollReveal } from '../ui/ScrollReveal';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { StorefrontRouter } from '../pages/StorefrontRouter';

export const DesktopLayout: React.FC = () => {
  const { storePath } = useFatehanTheme();
  useAutoScrollReveal(storePath);

  return (
    <div className="viewport-desktop fatehan-blue-canvas min-h-screen text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <SmoothScrollProgressBar />
      <StorefrontHeader />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1">
        <StorefrontRouter />
        <StorefrontFooter />
      </main>
    </div>
  );
};
