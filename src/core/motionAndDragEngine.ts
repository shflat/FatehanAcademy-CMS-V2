import gsap from 'gsap';
import Lenis from 'lenis';
import barba from '@barba/core';
import Muuri from 'muuri';

let activeLenisInstance: Lenis | null = null;

export function scrollToTopImmediate() {
  if (typeof window === 'undefined') return;
  if (activeLenisInstance) {
    activeLenisInstance.scrollTo(0, { immediate: true, force: true });
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Reliable single-click smooth scroll that works seamlessly with or without Lenis
 */
export function scrollToElementSmooth(
  target: string | HTMLElement,
  offset: number = -88
) {
  if (typeof window === 'undefined') return;
  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;

  if (activeLenisInstance) {
    activeLenisInstance.resize();
    activeLenisInstance.scrollTo(el, {
      offset,
      duration: 0.9,
      force: true,
    });
    return;
  }

  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY + offset);
  window.scrollTo({ top, behavior: 'smooth' });
}

let isGlobalModalScrollLocked = false;

function isBlockingModalNode(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.dataset.barbaOverlay === 'true') return false;
  const cls = typeof el.className === 'string' ? el.className : '';
  if (cls.includes('pointer-events-none')) return false;

  const isDialog = el.getAttribute('aria-modal') === 'true';
  const isFixedOverlay = cls.includes('fixed') && cls.includes('inset-0');
  if (!isDialog && !isFixedOverlay) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false;
  }
  return true;
}

function hasAnyOpenBlockingModal(): boolean {
  if (typeof document === 'undefined') return false;
  const candidates = document.querySelectorAll('[aria-modal="true"], .fixed.inset-0');
  for (let i = 0; i < candidates.length; i++) {
    if (isBlockingModalNode(candidates[i])) return true;
  }
  return false;
}

function isVerticallyScrollableElement(el: HTMLElement): boolean {
  if (el === document.body || el === document.documentElement) return false;
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function findClosestOpenBlockingModal(startNode: EventTarget | null): HTMLElement | null {
  let cur: HTMLElement | null =
    startNode instanceof HTMLElement
      ? startNode
      : startNode instanceof Node
      ? startNode.parentElement
      : null;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (isBlockingModalNode(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function findScrollableAncestorInside(
  startNode: EventTarget | null,
  boundaryEl: HTMLElement | null
): HTMLElement | null {
  let cur: HTMLElement | null =
    startNode instanceof HTMLElement
      ? startNode
      : startNode instanceof Node
      ? startNode.parentElement
      : null;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (isVerticallyScrollableElement(cur)) return cur;
    if (cur === boundaryEl) break;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * 1. Lenis + GSAP Ticker Smooth Scroll Initializer
 */
export function initSmoothScroll(): {
  lenis: Lenis;
  destroy: () => void;
} {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    prevent: (node) => {
      if (isGlobalModalScrollLocked) return true;
      if (!node || typeof window === 'undefined') return false;
      if (node.closest('[data-lenis-prevent], [data-lenis-prevent-wheel], [role="dialog"], [aria-modal="true"]')) {
        return true;
      }
      let cur: HTMLElement | null = node;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (isBlockingModalNode(cur)) return true;
        if (isVerticallyScrollableElement(cur)) return true;
        cur = cur.parentElement;
      }
      return false;
    },
  });
  activeLenisInstance = lenis;
  if (isGlobalModalScrollLocked) {
    lenis.stop();
  }

  const updateTicker = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(updateTicker);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    destroy: () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      if (activeLenisInstance === lenis) {
        activeLenisInstance = null;
      }
    },
  };
}

export function pauseSmoothScroll(): void {
  activeLenisInstance?.stop();
}

export function resumeSmoothScroll(): void {
  if (isGlobalModalScrollLocked) return;
  activeLenisInstance?.start();
}

/**
 * Automatically locks page/Lenis background scroll whenever any modal/dialog overlay is open
 * and strictly prevents wheel/touch scroll leaking to the underlying page while allowing
 * smooth native scrolling inside the active modal's scrollable containers.
 */
export function installGlobalModalScrollLock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let prevBodyOverflow = '';
  let prevHtmlOverflow = '';
  let prevHtmlOverscroll = '';
  let prevBodyOverscroll = '';
  let rafId: number | null = null;
  let lastTouchY: number | null = null;

  const onWindowWheel = (e: WheelEvent) => {
    if (!isGlobalModalScrollLocked) return;
    const modalRoot = findClosestOpenBlockingModal(e.target);
    if (!modalRoot) {
      e.preventDefault();
      return;
    }
    const scrollable = findScrollableAncestorInside(e.target, modalRoot);
    if (!scrollable) {
      e.preventDefault();
      return;
    }
    const atTop = scrollable.scrollTop <= 0;
    const atBottom =
      scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
      e.preventDefault();
    }
  };

  const onWindowTouchStart = (e: TouchEvent) => {
    if (!isGlobalModalScrollLocked) return;
    lastTouchY = e.touches[0]?.clientY ?? null;
  };

  const onWindowTouchMove = (e: TouchEvent) => {
    if (!isGlobalModalScrollLocked) return;
    const modalRoot = findClosestOpenBlockingModal(e.target);
    if (!modalRoot) {
      e.preventDefault();
      return;
    }
    const scrollable = findScrollableAncestorInside(e.target, modalRoot);
    if (!scrollable) {
      e.preventDefault();
      return;
    }
    const curY = e.touches[0]?.clientY ?? null;
    if (curY !== null && lastTouchY !== null) {
      const deltaY = lastTouchY - curY; // positive = scrolling down
      const atTop = scrollable.scrollTop <= 0;
      const atBottom =
        scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    }
    lastTouchY = curY;
  };

  const applyLockState = () => {
    rafId = null;
    const shouldLock = hasAnyOpenBlockingModal();
    if (shouldLock === isGlobalModalScrollLocked) return;

    if (shouldLock) {
      isGlobalModalScrollLocked = true;
      prevBodyOverflow = document.body.style.overflow;
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      prevBodyOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
      activeLenisInstance?.stop();
    } else {
      isGlobalModalScrollLocked = false;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      activeLenisInstance?.start();
    }
  };

  const scheduleSync = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(applyLockState);
  };

  applyLockState();

  window.addEventListener('wheel', onWindowWheel, { passive: false, capture: true });
  window.addEventListener('touchstart', onWindowTouchStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onWindowTouchMove, { passive: false, capture: true });

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-modal', 'style'],
  });

  return () => {
    observer.disconnect();
    window.removeEventListener('wheel', onWindowWheel, { capture: true });
    window.removeEventListener('touchstart', onWindowTouchStart, { capture: true });
    window.removeEventListener('touchmove', onWindowTouchMove, { capture: true });
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    if (isGlobalModalScrollLocked) {
      isGlobalModalScrollLocked = false;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      activeLenisInstance?.start();
    }
  };
}

/**
 * 2. Barba.js + GSAP Soft Frosted-Glass & Blur Page Transition
 */
export function triggerBarbaGsapTransition(
  containerEl: HTMLElement | null,
  overlayEl: HTMLElement | null,
  onSwitchView: () => void
) {
  const barbaVersion = barba?.version || '2.9.7';
  if (containerEl) {
    containerEl.setAttribute('data-barba-engine', `barba-${barbaVersion}`);
  }

  if (!containerEl) {
    onSwitchView();
    scrollToTopImmediate();
    return;
  }

  const tl = gsap.timeline();

  if (overlayEl) {
    gsap.set(overlayEl, { pointerEvents: 'auto' });
  }

  tl.to(
    containerEl,
    {
      opacity: 0,
      filter: 'blur(14px)',
      scale: 0.985,
      y: 8,
      duration: 0.24,
      ease: 'power2.out',
    },
    0
  );

  if (overlayEl) {
    tl.fromTo(
      overlayEl,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.22,
        ease: 'power2.out',
      },
      0
    );
  }

  tl.add(() => {
    onSwitchView();
    scrollToTopImmediate();
    requestAnimationFrame(() => scrollToTopImmediate());
  });

  tl.fromTo(
    containerEl,
    {
      opacity: 0,
      filter: 'blur(14px)',
      scale: 1.01,
      y: -8,
    },
    {
      opacity: 1,
      filter: 'blur(0px)',
      scale: 1,
      y: 0,
      duration: 0.38,
      ease: 'power3.out',
      clearProps: 'filter,transform',
      onComplete: () => {
        scrollToTopImmediate();
      },
    }
  );

  if (overlayEl) {
    tl.to(
      overlayEl,
      {
        opacity: 0,
        duration: 0.32,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(overlayEl, { pointerEvents: 'none' });
        },
      },
      '-=0.34'
    );
  }
}

/**
 * 3. GSAP Entrance & Bi-Directional Scroll-Reactive Reveal Animation
 */
let activeScrollCleanup: (() => void) | null = null;

export function animatePageEntrance(rootEl: HTMLElement | null) {
  if (!rootEl) return;

  if (activeScrollCleanup) {
    activeScrollCleanup();
    activeScrollCleanup = null;
  }

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animatedItems = Array.from(
    rootEl.querySelectorAll<HTMLElement>(
      '[data-reveal], [data-gsap="reveal"], article, .interactive-widget'
    )
  );

  if (prefersReduced || animatedItems.length === 0) return;

  const getHiddenTransform = (
    el: HTMLElement,
    direction: 'down' | 'up'
  ): { x: number; y: number; scale: number; filter: string; opacity: number } => {
    const mode = el.dataset.reveal || 'fade-up';
    if (mode === 'slide-right') {
      return { x: 46, y: 12, scale: 0.98, filter: 'blur(6px)', opacity: 0 };
    }
    if (mode === 'slide-left') {
      return { x: -46, y: 12, scale: 0.98, filter: 'blur(6px)', opacity: 0 };
    }
    if (mode === 'zoom-in') {
      return { x: 0, y: 18, scale: 0.93, filter: 'blur(5px)', opacity: 0 };
    }
    if (mode === 'blur-up') {
      return { x: 0, y: direction === 'down' ? 28 : -24, scale: 0.97, filter: 'blur(10px)', opacity: 0 };
    }
    return {
      x: 0,
      y: direction === 'down' ? 30 : -24,
      scale: 0.98,
      filter: 'blur(5px)',
      opacity: 0,
    };
  };

  // Keep initially visible above-the-fold elements immediately painted (zero LCP opacity delay!)
  const initialViewportItems = animatedItems.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.96 && rect.bottom > 0;
  });

  initialViewportItems.forEach((el) => {
    gsap.set(el, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      clearProps: 'filter,transform,opacity',
    });
  });

  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    const rafId = window.requestAnimationFrame(() => {
      let lastScrollY = window.scrollY;
      let scrollDirection: 'down' | 'up' = 'down';

      const onWindowScroll = () => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY;
        if (Math.abs(delta) > 2) {
          scrollDirection = delta > 0 ? 'down' : 'up';
        }
        lastScrollY = currentY;
      };

      window.addEventListener('scroll', onWindowScroll, { passive: true });

      const observer = new IntersectionObserver(
        (entries) => {
          let staggerIdx = 0;
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement;
            if (el.dataset.justDragged === 'true') return;

            if (entry.isIntersecting) {
              if (el.dataset.revealState === 'visible') return;
              el.dataset.revealState = 'visible';
              const fromState = getHiddenTransform(el, scrollDirection);
              const delaySec = Math.min(staggerIdx * 0.06, 0.3);
              staggerIdx += 1;

              gsap.fromTo(
                el,
                fromState,
                {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)',
                  duration: 0.68,
                  delay: delaySec,
                  ease: 'power3.out',
                  overwrite: 'auto',
                  clearProps: 'filter,transform',
                }
              );
            } else {
              // Bidirectional reset when scrolled completely out of viewport (top or bottom)
              const rect = entry.boundingClientRect;
              const isAbove = rect.bottom < 12;
              const isBelow = rect.top > window.innerHeight - 12;
              if (isAbove || isBelow) {
                el.dataset.revealState = 'hidden';
                const exitDir: 'down' | 'up' = isAbove ? 'up' : 'down';
                const hiddenState = getHiddenTransform(el, exitDir);
                gsap.to(el, {
                  opacity: 0.14,
                  x: hiddenState.x * 0.55,
                  y: hiddenState.y * 0.55,
                  scale: 0.97,
                  filter: 'blur(4px)',
                  duration: 0.34,
                  ease: 'power2.inOut',
                  overwrite: 'auto',
                });
              }
            }
          });
        },
        {
          threshold: [0.06, 0.16],
          rootMargin: '0px 0px -36px 0px',
        }
      );

      animatedItems.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= window.innerHeight * 0.96) {
          el.dataset.revealState = 'hidden';
          const hiddenState = getHiddenTransform(el, 'down');
          gsap.set(el, {
            opacity: 0,
            x: hiddenState.x * 0.65,
            y: hiddenState.y * 0.65,
            scale: hiddenState.scale,
            filter: 'blur(5px)',
          });
        } else {
          el.dataset.revealState = 'visible';
        }
        observer.observe(el);
      });

      activeScrollCleanup = () => {
        window.removeEventListener('scroll', onWindowScroll);
        observer.disconnect();
      };
    });

    activeScrollCleanup = () => {
      window.cancelAnimationFrame(rafId);
    };
  }
}

/**
 * 4. Muuri Interactive Grid & Free-Drag Controller
 */
export class MuuriGridController {
  private elements: Map<
    HTMLElement,
    {
      onPointerDown: (e: PointerEvent) => void;
    }
  > = new Map();

  private enabled: boolean = false;
  private lastDragEndTime: number = 0;
  private captureClickHandler: (e: MouseEvent) => void;
  private onDisplacementChange?: (hasDisplaced: boolean) => void;
  public readonly engineName = typeof Muuri === 'function' ? 'Muuri v0.9' : 'Muuri';

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.captureClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const recentlyDragged = performance.now() - this.lastDragEndTime < 320;
      const onDraggedNode = Boolean(target?.closest('[data-just-dragged="true"]'));
      if (recentlyDragged || onDraggedNode) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.captureClickHandler, true);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setOnDisplacementChange(cb: (hasDisplaced: boolean) => void) {
    this.onDisplacementChange = cb;
  }

  public bindContainer(rootEl: HTMLElement | null) {
    this.unbindAll();
    if (!rootEl || !this.enabled) return;

    const nodes = rootEl.querySelectorAll<HTMLElement>(
      '[data-muuri-draggable="true"]'
    );

    nodes.forEach((el) => {
      let isPointerDown = false;
      let hasMovedBeyondThreshold = false;
      let startX = 0;
      let startY = 0;
      let initialOffsetX = Number(el.dataset.dragX || 0);
      let initialOffsetY = Number(el.dataset.dragY || 0);

      const onPointerDown = (e: PointerEvent) => {
        if (!this.enabled || e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (
          target.closest('button') ||
          target.closest('a') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('[data-no-muuri-drag="true"]')
        ) {
          return;
        }

        isPointerDown = true;
        hasMovedBeyondThreshold = false;
        startX = e.clientX;
        startY = e.clientY;
        initialOffsetX = Number(el.dataset.dragX || 0);
        initialOffsetY = Number(el.dataset.dragY || 0);

        const onPointerMove = (moveEvt: PointerEvent) => {
          if (!isPointerDown) return;
          const dx = moveEvt.clientX - startX;
          const dy = moveEvt.clientY - startY;
          const distance = Math.hypot(dx, dy);

          if (!hasMovedBeyondThreshold) {
            if (distance < 7) return;
            hasMovedBeyondThreshold = true;
            el.dataset.justDragged = 'true';
            try {
              el.setPointerCapture(moveEvt.pointerId);
            } catch {
              // ignore
            }
            el.style.zIndex = '45';
            el.style.cursor = 'grabbing';

            gsap.to(el, {
              scale: 1.02,
              boxShadow: '0 22px 45px -12px rgba(15, 23, 42, 0.25)',
              duration: 0.18,
              ease: 'power2.out',
            });
          }

          const nextX = initialOffsetX + dx;
          const nextY = initialOffsetY + dy;

          el.dataset.dragX = String(nextX);
          el.dataset.dragY = String(nextY);

          if (Math.abs(nextX) > 4 || Math.abs(nextY) > 4) {
            this.onDisplacementChange?.(true);
          }

          gsap.set(el, {
            x: nextX,
            y: nextY,
          });
        };

        const onPointerUp = (upEvt: PointerEvent) => {
          if (!isPointerDown) return;
          isPointerDown = false;

          if (hasMovedBeyondThreshold) {
            this.lastDragEndTime = performance.now();
            try {
              el.releasePointerCapture(upEvt.pointerId);
            } catch {
              // ignore
            }
            el.style.cursor = 'grab';
            el.style.zIndex = '';

            gsap.to(el, {
              scale: 1,
              boxShadow: '',
              duration: 0.24,
              ease: 'back.out(1.5)',
            });

            setTimeout(() => {
              delete el.dataset.justDragged;
            }, 320);
          }

          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      };

      el.style.cursor = 'grab';
      el.addEventListener('pointerdown', onPointerDown);
      this.elements.set(el, { onPointerDown });
    });
  }

  public resetAllPositions(rootEl: HTMLElement | null) {
    this.onDisplacementChange?.(false);
    if (!rootEl) return;
    const nodes = rootEl.querySelectorAll<HTMLElement>(
      '[data-muuri-draggable="true"]'
    );
    nodes.forEach((el) => {
      el.dataset.dragX = '0';
      el.dataset.dragY = '0';
      delete el.dataset.justDragged;
      gsap.to(el, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: 'elastic.out(1, 0.75)',
      });
    });
  }

  public unbindAll() {
    this.elements.forEach((handlers, el) => {
      el.removeEventListener('pointerdown', handlers.onPointerDown);
      el.style.cursor = '';
    });
    this.elements.clear();
  }
}
