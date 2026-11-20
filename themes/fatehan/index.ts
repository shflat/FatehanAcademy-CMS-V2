/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Robotics Academy — Standalone Storefront Theme Package (CMS v2.0.0 Ready)
 * Import `FatehanThemeRoot` directly into any React 19 + Tailwind CSS v4 host app,
 * or compose individual layout/page/component modules with `FatehanThemeProvider`.
 */

import React from 'react';
import './styles/fatehan-theme.css';
import {
  FatehanThemeProvider,
  FatehanThemeProviderProps,
} from './context/FatehanThemeContext';
import { FatehanThemeShell } from './layouts/FatehanThemeShell';

export interface FatehanThemeRootProps extends Omit<FatehanThemeProviderProps, 'children'> {}

/**
 * Plug-and-play entry point for CMS v2.0.0 Core.
 * Automatically mounts ThemeProvider, Desktop/Tablet/Mobile viewports,
 * CartDrawer, VideoLabModal, StoreOtpLoginModal, and Toast system.
 */
export const FatehanThemeRoot: React.FC<FatehanThemeRootProps> = (props) => {
  return React.createElement(FatehanThemeProvider, {
    ...props,
    children: React.createElement(FatehanThemeShell),
  });
};

// Context & API Adapter
export { FatehanThemeProvider, useFatehanTheme } from './context/FatehanThemeContext';
export type { FatehanThemeContextValue, FatehanThemeProviderProps } from './context/FatehanThemeContext';
export { createCmsV2ApiAdapter } from './context/cmsApiAdapter';
export type { CmsApiAdapterOptions } from './context/cmsApiAdapter';

// Layouts
export { FatehanThemeShell } from './layouts/FatehanThemeShell';
export { DesktopLayout } from './layouts/DesktopLayout';
export { TabletLayout } from './layouts/TabletLayout';
export { MobileLayout } from './layouts/MobileLayout';

// Core Storefront Components
export { StorefrontHeader } from './components/StorefrontHeader';
export { StorefrontFooter } from './components/StorefrontFooter';
export { FatehanStorefrontHome } from './components/FatehanStorefrontHome';
export { CartDrawer } from './components/CartDrawer';
export { VideoLabModal } from './components/VideoLabModal';
export { StoreOtpLoginModal } from './components/StoreOtpLoginModal';

// Storefront Pages & Routers
export { StorefrontRouter, StoreShimmerSkeleton } from './pages/StorefrontRouter';
export { PageRenderer } from './pages/PageRenderer';
export type { PageRendererProps } from './pages/PageRenderer';
export {
  FatehanCoursesPage,
  FatehanTuitionCalculatorPage,
  FatehanSimulatorPage,
  FatehanContactPage,
  FatehanFreeCoursesPage,
  FatehanAboutPage,
} from './pages/FatehanMultiPages';
export { BlogRoutesPage, CustomerAccountDashboardPage } from './pages/BlogAndAccountRoutes';

// UI Primitives & Utilities
export { FatehanLogo } from './ui/FatehanLogo';
export { BiDiText } from './ui/BiDiText';
export { ScrollReveal, SmoothScrollProgressBar, useAutoScrollReveal } from './ui/ScrollReveal';
export { formatToman, formatPersianNumber, themeClientCache } from './utils/formatters';
export { RichFormattedContent } from './utils/RichFormattedContent';
export * from './utils/defaultFallbacks';

// Full CMS v2.0.0 TypeScript Contracts
export * from './types';
