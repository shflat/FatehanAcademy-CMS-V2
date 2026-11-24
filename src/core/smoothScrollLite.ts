import Lenis from 'lenis';

let activeLiteLenis: Lenis | null = null;

function isModalOrScrollableNode(node: HTMLElement | null): boolean {
  if (!node || typeof window === 'undefined') return false;
  if (
    node.closest(
      '[data-lenis-prevent], [data-lenis-prevent-wheel], [role="dialog"], [aria-modal="true"]'
    )
  ) {
    return true;
  }
  let cur: HTMLElement | null = node;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const cls = typeof cur.className === 'string' ? cur.className : '';
    if (cls.includes('fixed') && cls.includes('inset-0') && !cls.includes('pointer-events-none')) {
      return true;
    }
    const style = window.getComputedStyle(cur);
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') &&
      cur.scrollHeight > cur.clientHeight + 1
    ) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/**
 * Ultra-lightweight standalone Lenis smooth scroll (no GSAP/Barba/Muuri dependency).
 * Runs via native requestAnimationFrame for silky inertial scrolling with minimal footprint.
 */
export function initLiteSmoothScroll(): { destroy: () => void } {
  if (typeof window === 'undefined') {
    return { destroy: () => {} };
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { destroy: () => {} };
  }

  if (activeLiteLenis) {
    activeLiteLenis.destroy();
    activeLiteLenis = null;
  }

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    prevent: (node) => isModalOrScrollableNode(node),
  });

  activeLiteLenis = lenis;
  let rafId = 0;
  let stopped = false;

  const raf = (time: number) => {
    if (stopped) return;
    lenis.raf(time);
    rafId = window.requestAnimationFrame(raf);
  };
  rafId = window.requestAnimationFrame(raf);

  return {
    destroy: () => {
      stopped = true;
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      if (activeLiteLenis === lenis) {
        activeLiteLenis = null;
      }
    },
  };
}
