export interface PageSeoMetadata {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'product';
  imageUrl?: string;
  jsonLd?: Record<string, unknown> | null;
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function upsertJsonLdScript(payload: Record<string, unknown> | null | undefined): void {
  if (typeof document === 'undefined') return;
  const scriptId = 'skill98-dynamic-jsonld';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!payload) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

/**
 * Updates dynamic SEO head tags (<title>, description, canonical, OpenGraph, JSON-LD)
 * without altering <meta name="robots"> (search indexing remains controlled strictly by Admin SEO visibility).
 */
export function syncPageSeoHead(meta: PageSeoMetadata): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const cleanTitle = (meta.title || 'اسکیل ۹۸ | Skill 98').trim();
  const cleanDesc = (meta.description || '').trim().slice(0, 320);
  const origin = window.location.origin;
  const canonicalPath = meta.canonicalPath || window.location.pathname || '/';
  const canonicalUrl = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

  document.title = cleanTitle;
  if (cleanDesc) {
    upsertMetaTag('name', 'description', cleanDesc);
    upsertMetaTag('property', 'og:description', cleanDesc);
  }
  upsertMetaTag('property', 'og:title', cleanTitle);
  upsertMetaTag('property', 'og:type', meta.ogType || 'website');
  upsertMetaTag('property', 'og:url', canonicalUrl);

  if (meta.imageUrl) {
    const absImg = meta.imageUrl.startsWith('http')
      ? meta.imageUrl
      : `${origin}${meta.imageUrl.startsWith('/') ? meta.imageUrl : `/${meta.imageUrl}`}`;
    upsertMetaTag('property', 'og:image', absImg);
  }

  upsertCanonicalLink(canonicalUrl);
  upsertJsonLdScript(meta.jsonLd);
}
