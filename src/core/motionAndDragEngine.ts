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
  });
  activeLenisInstance = lenis;

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
  activeLenisInstance?.start();
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

  // Animate initially visible above-the-fold elements cleanly
  const initialViewportItems = animatedItems.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.96 && rect.bottom > 0;
  });

  initialViewportItems.forEach((el, idx) => {
    const fromState = getHiddenTransform(el, 'down');
    gsap.fromTo(
      el,
      {
        opacity: 0,
        x: fromState.x * 0.55,
        y: fromState.y * 0.65,
        scale: fromState.scale,
        filter: 'blur(4px)',
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.58,
        delay: Math.min(idx * 0.045, 0.28),
        ease: 'power3.out',
        overwrite: 'auto',
        clearProps: 'filter,transform',
      }
    );
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
