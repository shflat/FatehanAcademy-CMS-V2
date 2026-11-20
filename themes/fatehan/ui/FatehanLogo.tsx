/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Official 3D Metallic Logo Component for Fatehan Standalone Theme
 * Dynamically reads logo URL, Persian name, English subtitle, and city badge
 * from CMS v2.0.0 site settings (with graceful fallbacks).
 */

import React, { useState } from 'react';
import { useFatehanTheme } from '../context/FatehanThemeContext';

export interface FatehanLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'full' | 'compact' | 'hero';
  theme?: 'light' | 'dark';
  showSubtitle?: boolean;
  className?: string;
  logoUrlOverride?: string;
  titleOverride?: string;
  subtitleOverride?: string;
}

const SIZE_STYLES: Record<
  'xs' | 'sm' | 'md' | 'lg' | 'xl',
  { imgSize: string; titleSize: string; subtitleSize: string; gap: string }
> = {
  xs: {
    imgSize: 'w-9 h-9',
    titleSize: 'text-xs font-bold',
    subtitleSize: 'text-[9px]',
    gap: 'gap-1.5',
  },
  sm: {
    imgSize: 'w-12 h-12',
    titleSize: 'text-xs sm:text-sm font-extrabold',
    subtitleSize: 'text-[10px]',
    gap: 'gap-2',
  },
  md: {
    imgSize: 'w-14 h-14 sm:w-16 sm:h-16',
    titleSize: 'text-sm sm:text-base font-black',
    subtitleSize: 'text-[11px]',
    gap: 'gap-2.5',
  },
  lg: {
    imgSize: 'w-16 h-16 sm:w-[72px] sm:h-[72px]',
    titleSize: 'text-base sm:text-lg font-black',
    subtitleSize: 'text-xs',
    gap: 'gap-3',
  },
  xl: {
    imgSize: 'w-24 h-24 sm:w-28 sm:h-28',
    titleSize: 'text-xl sm:text-2xl font-black',
    subtitleSize: 'text-xs sm:text-sm',
    gap: 'gap-3.5',
  },
};

export const FatehanLogo: React.FC<FatehanLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  showSubtitle = true,
  className = '',
  logoUrlOverride,
  titleOverride,
  subtitleOverride,
}) => {
  const { settings } = useFatehanTheme();
  const [imgError, setImgError] = useState(false);
  const cfg = SIZE_STYLES[size];

  const logoSrc = logoUrlOverride || settings.logoUrl;
  const titleFa = titleOverride || settings.academyNameFa;
  const subtitleEn = subtitleOverride || settings.academyNameEn;
  const cityLabel = settings.location.city || 'اندیشه';

  return (
    <div className={`inline-flex items-center ${cfg.gap} select-none whitespace-nowrap ${className}`}>
      <div className={`relative ${cfg.imgSize} shrink-0 flex items-center justify-center`}>
        {!imgError ? (
          <img
            src={logoSrc}
            alt={titleFa}
            className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(27,77,219,0.25)] hover:scale-105 transition-transform duration-200"
            onError={() => setImgError(true)}
            loading="eager"
          />
        ) : (
          <div className="w-full h-full rounded-xl flex items-center justify-center bg-blue-600 text-white font-black text-xs shadow-xs">
            <span>فاتحان</span>
          </div>
        )}
      </div>

      {variant !== 'mark' && (
        <div className="flex flex-col text-right leading-tight whitespace-nowrap">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={`${cfg.titleSize} tracking-tight font-black whitespace-nowrap ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {titleFa}
            </span>
            {variant === 'compact' && (
              <span className="hidden xl:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {cityLabel}
              </span>
            )}
          </div>

          {showSubtitle && variant !== 'compact' && (
            <div
              className={`${cfg.subtitleSize} font-semibold tracking-wide flex items-center mt-0.5 whitespace-nowrap ${
                theme === 'dark' ? 'text-cyan-300' : 'text-blue-600'
              }`}
            >
              <span className="truncate max-w-[200px] sm:max-w-none font-sans font-medium">
                {subtitleEn}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
