export type ResponsiveImageVariant =
  | 'thumb-25'
  | 'thumb-300'
  | 'medium-800'
  | 'original-webp';

const LOCAL_OPTIMIZABLE_PREFIXES = [
  '/assets/kits/',
  '/assets/blog/',
  '/uploads/',
];

const LOCAL_OPTIMIZABLE_EXACT = new Set([
  '/assets/aistudio/logo_8c26749f.webp',
  '/assets/aistudio/fatehan_logo_transparent.png',
]);

const RASTER_EXT_REGEX = /\.(jpe?g|png|webp|gif)$/i;
const VARIANT_OR_ORIG_REGEX =
  /(?:-(?:thumb-25|thumb-300|medium-800|original-webp)\.webp|-original\.(?:jpe?g|png|webp|gif))$/i;

function isOptimizableLocalRasterUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const clean = rawUrl.split('?')[0].split('#')[0].trim();
  if (!clean.startsWith('/') || clean.endsWith('.svg')) return false;
  if (!RASTER_EXT_REGEX.test(clean)) return false;
  if (LOCAL_OPTIMIZABLE_EXACT.has(clean)) return true;
  return LOCAL_OPTIMIZABLE_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

function getBaseStem(cleanUrl: string): string {
  if (VARIANT_OR_ORIG_REGEX.test(cleanUrl)) {
    return cleanUrl.replace(VARIANT_OR_ORIG_REGEX, '');
  }
  return cleanUrl.replace(RASTER_EXT_REGEX, '');
}

/**
 * Resolves any local optimizable site image to one of the 4 generated responsive WebP sizes:
 * - `thumb-25` (25px micro thumbnail)
 * - `thumb-300` (360px card/logo thumbnail)
 * - `medium-800` (800px product/article detail view)
 * - `original-webp` (full resolution WebP)
 */
export function getResponsiveImageVariant(
  url: string | undefined,
  variant: ResponsiveImageVariant = 'thumb-300'
): string {
  if (!url) return '';
  const clean = url.split('?')[0].split('#')[0].trim();
  if (!isOptimizableLocalRasterUrl(clean)) return url;
  const stem = getBaseStem(clean);
  return `${stem}-${variant}.webp`;
}

/**
 * Builds an HTML `srcSet` string across the responsive WebP ladder for local optimizable images.
 * Caps exact emblem/logo files at 300w so Retina mobile displays never download 800w/1200w files.
 */
export function getResponsiveSrcSet(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const clean = url.split('?')[0].split('#')[0].trim();
  if (!isOptimizableLocalRasterUrl(clean)) return undefined;
  const stem = getBaseStem(clean);
  if (LOCAL_OPTIMIZABLE_EXACT.has(clean)) {
    if (clean.includes('logo_8c26749f')) {
      return `${stem}-header-144.webp 144w, ${stem}-thumb-300.webp 300w`;
    }
    return `${stem}-thumb-300.webp 300w`;
  }
  return `${stem}-thumb-300.webp 360w, ${stem}-medium-800.webp 800w, ${stem}-original-webp.webp 1200w`;
}
