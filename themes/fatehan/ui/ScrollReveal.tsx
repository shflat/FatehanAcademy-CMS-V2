import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'right' | 'left' | 'scale';
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.65,
  className = '',
  once = false,
}) => {
  const initialMap = {
    up: { opacity: 0, y: 40, scale: 0.96 },
    down: { opacity: 0, y: -34, scale: 0.96 },
    right: { opacity: 0, x: 50, scale: 0.96 },
    left: { opacity: 0, x: -50, scale: 0.96 },
    scale: { opacity: 0, scale: 0.92, y: 24 },
  };

  return (
    <motion.div
      initial={initialMap[direction]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount: 0.12, margin: '0px 0px -30px 0px' }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const SmoothScrollProgressBar: React.FC = () => {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const el = barRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      el.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={barRef}
      style={{ transform: 'scaleX(0)', transformOrigin: 'right' }}
      className="no-print fixed top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-600 via-cyan-400 to-amber-400 z-50 pointer-events-none will-change-transform"
    />
  );
};

/**
 * Bidirectional Multi-Direction Scroll Reveal Engine (Zero Forced Reflow + Instant Hero LCP):
 * - Keeps the above-the-fold Hero / first section completely visible at 0ms for instant LCP.
 * - Smoothly animates below-the-fold sections, cards, and blocks from bottom, right, and left
 *   with staggered card delays, re-triggering smoothly on both downward and upward scroll.
 * - Uses pure IntersectionObserver with ZERO getBoundingClientRect() calls inside loops
 *   so there is 0ms Forced Reflow on PageSpeed.
 */
export function useAutoScrollReveal(dependencyKey: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const observedElements = new WeakSet<Element>();
    let globalCounter = 0;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('dpa-scroll-visible');
          } else {
            entry.target.classList.remove('dpa-scroll-visible');
          }
        }
      },
      {
        threshold: 0.06,
        rootMargin: '25px 0px -20px 0px',
      }
    );

    const scanAndObserve = () => {
      const mainEl = document.querySelector('main');
      if (!mainEl) return;

      const firstSection = mainEl.querySelector('section');
      const targets = mainEl.querySelectorAll(
        'section, article, footer, .grid > div, .rounded-3xl, .rounded-\\[2\\.5rem\\]'
      );

      targets.forEach((el) => {
        if (observedElements.has(el)) return;
        // Never hide above-the-fold Hero / header / nav or self-animated fade containers
        if (
          el === firstSection ||
          (firstSection && firstSection.contains(el)) ||
          el.getAttribute('data-no-scroll-reveal') === 'true' ||
          el.closest('[data-no-scroll-reveal="true"]') ||
          el.classList.contains('fatehan-hero-section') ||
          el.closest('.fatehan-hero-section') ||
          el.closest('header') ||
          el.closest('nav')
        ) {
          observedElements.add(el);
          return;
        }

        observedElements.add(el);
        el.classList.add('dpa-scroll-init');
        const mod = globalCounter % 3;
        globalCounter++;
        if (mod === 0) el.classList.add('dpa-scroll-from-up');
        else if (mod === 1) el.classList.add('dpa-scroll-from-right');
        else el.classList.add('dpa-scroll-from-left');

        const htmlEl = el as HTMLElement;
        const parent = el.parentElement;
        if (parent?.classList.contains('grid')) {
          let idx = 0;
          let sib = el.previousElementSibling;
          while (sib) {
            idx++;
            sib = sib.previousElementSibling;
          }
          if (idx < 8) {
            htmlEl.style.transitionDelay = `${(idx % 4) * 65}ms`;
          }
        }

        // Pure IntersectionObserver fires immediately for any in-viewport element with ZERO forced reflow
        intersectionObserver.observe(el);
      });
    };

    const rafId = window.requestAnimationFrame(scanAndObserve);
    const t1 = window.setTimeout(scanAndObserve, 160);
    let debounceTimer: number | null = null;

    const mainNode = document.querySelector('main') || document.body;
    const mutationObserver = new MutationObserver(() => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        scanAndObserve();
      }, 220);
    });
    mutationObserver.observe(mainNode, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [dependencyKey]);
}
