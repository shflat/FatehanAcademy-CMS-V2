import type { AccentPresetId } from '../core/types';

export interface AccentStyleTokens {
  button: string;
  text: string;
  heroHighlight: string;
  border: string;
  badge: string;
  dot: string;
  heroGlow: string;
}

export function getAccentStyles(preset: AccentPresetId): AccentStyleTokens {
  switch (preset) {
    case 'amber':
      return {
        button: 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        heroHighlight: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500',
        badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
        heroGlow: 'bg-amber-500/15',
      };
    case 'emerald':
      return {
        button: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        heroHighlight: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-600',
        badge: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500',
        heroGlow: 'bg-emerald-500/15',
      };
    case 'rose':
      return {
        button: 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20',
        text: 'text-rose-700 dark:text-rose-400',
        heroHighlight: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-600',
        badge: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500',
        heroGlow: 'bg-rose-500/15',
      };
    case 'violet':
      return {
        button: 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20',
        text: 'text-purple-700 dark:text-purple-400',
        heroHighlight: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-600',
        badge: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
        dot: 'bg-purple-500',
        heroGlow: 'bg-purple-500/15',
      };
    case 'cobalt':
    default:
      return {
        button: 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF] shadow-blue-600/20',
        text: 'text-[#1E3A8A] dark:text-blue-400',
        heroHighlight: 'text-[#1D4ED8] dark:text-blue-400',
        border: 'border-[#1D4ED8]',
        badge: 'bg-blue-500/10 text-[#1D4ED8] dark:text-blue-300 border-blue-500/25',
        dot: 'bg-[#1D4ED8]',
        heroGlow: 'bg-blue-500/12',
      };
  }
}
