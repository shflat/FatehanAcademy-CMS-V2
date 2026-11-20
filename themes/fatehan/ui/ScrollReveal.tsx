import React, { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

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
    up: { opacity: 0, y: 42, scale: 0.96 },
    down: { opacity: 0, y: -36, scale: 0.96 },
    right: { opacity: 0, x: 54, scale: 0.96 },
    left: { opacity: 0, x: -54, scale: 0.96 },
    scale: { opacity: 0, scale: 0.91, y: 24 },
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
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'right' }}
      className="no-print fixed top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-600 via-cyan-400 to-amber-400 z-50 pointer-events-none"
    />
  );
};

/**
 * Automatically attaches continuous, bidirectional scroll-triggered entrance animations
 * (slide from right, left, and bottom + fade & scale) to all sections, cards, and blocks.
 * Re-triggers smoothly every time the user scrolls up or down.
 */
export function useAutoScrollReveal(dependencyKey: string) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observedElements = new WeakSet<Element>();
    let globalCounter = 0;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('dpa-scroll-visible');
          } else {
            entry.target.classList.remove('dpa-scroll-visible');
          }
        });
      },
      {
        threshold: 0.06,
        rootMargin: '20px 0px -25px 0px',
      }
    );

    const scanAndObserve = () => {
      const mainEl = document.querySelector('main');
      if (!mainEl) return;

      const targets = mainEl.querySelectorAll(
        'section, article, footer, .grid > div, .rounded-3xl, .rounded-\\[2\\.5rem\\]'
      );

      targets.forEach((el) => {
        if (observedElements.has(el)) return;
        if (el.closest('header') || el.closest('nav')) return;

        observedElements.add(el);
        el.classList.add('dpa-scroll-init');
        const mod = globalCounter % 3;
        globalCounter++;
        if (mod === 0) el.classList.add('dpa-scroll-from-up');
        else if (mod === 1) el.classList.add('dpa-scroll-from-right');
        else el.classList.add('dpa-scroll-from-left');

        const htmlEl = el as HTMLElement;
        if (el.parentElement?.classList.contains('grid')) {
          const siblings = Array.from(el.parentElement.children);
          const idx = siblings.indexOf(el);
          if (idx >= 0 && idx < 8) {
            htmlEl.style.transitionDelay = `${(idx % 4) * 70}ms`;
          }
        }

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          requestAnimationFrame(() => {
            el.classList.add('dpa-scroll-visible');
          });
        }

        intersectionObserver.observe(el);
      });
    };

    scanAndObserve();
    const t1 = setTimeout(scanAndObserve, 120);
    const t2 = setTimeout(scanAndObserve, 450);

    const mainNode = document.querySelector('main') || document.body;
    const mutationObserver = new MutationObserver(() => {
      scanAndObserve();
    });
    mutationObserver.observe(mainNode, { childList: true, subtree: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [dependencyKey]);
}
