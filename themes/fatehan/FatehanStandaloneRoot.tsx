import React from 'react';
import './styles/fatehan-theme.css';
import {
  FatehanThemeProvider,
  type FatehanThemeProviderProps,
} from './context/FatehanThemeContext';
import { FatehanThemeShell } from './layouts/FatehanThemeShell';

export interface FatehanThemeRootProps extends Omit<FatehanThemeProviderProps, 'children'> {}

/**
 * Lightweight standalone entry point for Fatehan storefront.
 * Intentionally avoids barrel re-exports of secondary routes/modals so Vite
 * keeps FatehanMultiPages, BlogAndAccountRoutes, CartDrawer, VideoLabModal, and
 * StoreOtpLoginModal strictly code-split out of the initial critical bundle.
 */
export const FatehanThemeRoot: React.FC<FatehanThemeRootProps> = (props) => {
  return React.createElement(FatehanThemeProvider, {
    ...props,
    children: React.createElement(FatehanThemeShell),
  });
};
