import heroStudioImg from '../assets/images/skill98_ai_architecture_hero_1795088218603.webp';
import fullstackPkgImg from '../assets/images/skill98_mcp_agents_cover_1795088217282.webp';
import uiuxPkgImg from '../assets/images/skill98_motion_ui_cover_1795088220877.webp';
import securityPkgImg from '../assets/images/skill98_cloud_security_cover_1795088218781.webp';
import aiAutomationPkgImg from '../assets/images/pkg_ai_automation_1794606448806.webp';

export const VITE_IMAGES = {
  heroStudio: heroStudioImg,
  heroEditorial: heroStudioImg,
  fullstackPkg: fullstackPkgImg,
  uiuxPkg: uiuxPkgImg,
  securityPkg: securityPkgImg,
  aiAutomationPkg: aiAutomationPkgImg,
};

export function resolveStaticImageUrl(url?: string): string {
  if (!url) return VITE_IMAGES.fullstackPkg;
  const trimmed = url.trim();
  if (!trimmed) return VITE_IMAGES.fullstackPkg;

  if (
    trimmed.includes('hero_skill98_studio_1794606408189') ||
    trimmed.includes('skill98_ai_architecture_hero_1795088218603')
  ) {
    return VITE_IMAGES.heroStudio;
  }
  if (
    trimmed.includes('pkg_fullstack_mastery_1794606416960') ||
    trimmed.includes('skill98_mcp_agents_cover_1795088217282') ||
    trimmed.includes('skill98-fullstack-pkg')
  ) {
    return VITE_IMAGES.fullstackPkg;
  }
  if (
    trimmed.includes('pkg_uiux_design_system_1794606426062') ||
    trimmed.includes('skill98_motion_ui_cover_1795088220877') ||
    trimmed.includes('skill98-uiux-pkg')
  ) {
    return VITE_IMAGES.uiuxPkg;
  }
  if (
    trimmed.includes('pkg_security_devops_1794606438917') ||
    trimmed.includes('skill98_cloud_security_cover_1795088218781') ||
    trimmed.includes('skill98-security-pkg')
  ) {
    return VITE_IMAGES.securityPkg;
  }
  if (
    trimmed.includes('pkg_ai_automation_1794606448806') ||
    trimmed.includes('skill98-ai-automation-pkg')
  ) {
    return VITE_IMAGES.aiAutomationPkg;
  }
  if (trimmed.startsWith('/images/')) {
    return VITE_IMAGES.fullstackPkg;
  }
  return trimmed;
}

export type ResponsiveImageSlot = 'thumb25' | 'thumb300' | 'medium800' | 'original';

/**
 * Automatically selects the ideal pre-rendered WebP size variant based on placement:
 * - thumb25: tiny avatar/micro-icon (25x25)
 * - thumb300: cards, media grid thumbnails (300x300)
 * - medium800: featured cover, article/product detail (800x600)
 * - original: full-res zoom/lightbox
 */
export function resolveResponsiveMediaUrl(
  url?: string,
  slot: ResponsiveImageSlot = 'medium800',
  variants?: {
    'thumb-25'?: string;
    'thumb-300'?: string;
    'medium-800'?: string;
    'original-webp'?: string;
    thumb25?: string;
    thumb300?: string;
    medium800?: string;
    original?: string;
  }
): string {
  if (variants) {
    if (slot === 'thumb25' && (variants['thumb-25'] || variants.thumb25)) {
      return variants['thumb-25'] || variants.thumb25 || resolveStaticImageUrl(url);
    }
    if (slot === 'thumb300' && (variants['thumb-300'] || variants.thumb300)) {
      return variants['thumb-300'] || variants.thumb300 || resolveStaticImageUrl(url);
    }
    if (slot === 'medium800' && (variants['medium-800'] || variants.medium800)) {
      return variants['medium-800'] || variants.medium800 || resolveStaticImageUrl(url);
    }
    if (slot === 'original' && (variants['original-webp'] || variants.original)) {
      return variants['original-webp'] || variants.original || resolveStaticImageUrl(url);
    }
  }
  const resolved = resolveStaticImageUrl(url);
  if (resolved.startsWith('/uploads/')) {
    if (/-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i.test(resolved)) {
      const suffixMap: Record<ResponsiveImageSlot, string> = {
        thumb25: '-thumb-25.webp',
        thumb300: '-thumb-300.webp',
        medium800: '-medium-800.webp',
        original: '-original-webp.webp',
      };
      return resolved.replace(
        /-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i,
        suffixMap[slot]
      );
    }
    if (/-(25|300|800|orig)\.webp$/i.test(resolved)) {
      const suffixMap: Record<ResponsiveImageSlot, string> = {
        thumb25: '-25.webp',
        thumb300: '-300.webp',
        medium800: '-800.webp',
        original: '-orig.webp',
      };
      return resolved.replace(/-(25|300|800|orig)\.webp$/i, suffixMap[slot]);
    }
  }
  return resolved;
}

export function buildResponsiveSrcSet(url?: string): string | undefined {
  if (!url || !url.startsWith('/uploads/')) return undefined;
  if (/-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i.test(url)) {
    const w300 = url.replace(/-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i, '-thumb-300.webp');
    const w800 = url.replace(/-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i, '-medium-800.webp');
    const orig = url.replace(/-(thumb-25|thumb-300|medium-800|original-webp)\.webp$/i, '-original-webp.webp');
    return `${w300} 300w, ${w800} 800w, ${orig} 1600w`;
  }
  if (/-(25|300|800|orig)\.webp$/i.test(url)) {
    const w300 = url.replace(/-(25|300|800|orig)\.webp$/i, '-300.webp');
    const w800 = url.replace(/-(25|300|800|orig)\.webp$/i, '-800.webp');
    const orig = url.replace(/-(25|300|800|orig)\.webp$/i, '-orig.webp');
    return `${w300} 300w, ${w800} 800w, ${orig} 1600w`;
  }
  return undefined;
}

export function isVideoMediaUrl(url?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('video/')) return true;
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}
