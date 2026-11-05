import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';

interface PixelDissolveProps {
  /** Colour of the squares: the section this one follows. */
  color: string;
  cell?: number;
  duration?: number;
}

/**
 * Motion spec 2d: a grid in the previous section's colour covers the block, then clears square by
 * square in random order to reveal it. Goes inside a `position: relative` block.
 */
export function PixelDissolve({ color, cell = 56, duration = 500 }: PixelDissolveProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (prefersReducedMotion()) {
      canvas.style.display = 'none';
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const order = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - 0.5);

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    let raf = 0;
    let timer = 0;
    let started = false;
    let finished = false;
    // The one way out of a reveal, whatever interrupts it: animation frames can stall (a hidden tab,
    // a screen recorder) and the effect can be cleaned up part way, and neither may leave squares.
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        started = true;
        const startedAt = performance.now();
        let cleared = 0;
        const step = (now: number) => {
          const target = Math.min(order.length, Math.ceil(((now - startedAt) / duration) * order.length));
          for (; cleared < target; cleared += 1) {
            const i = order[cleared];
            ctx.clearRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
          }
          if (cleared < order.length) raf = requestAnimationFrame(step);
          else finish();
        };
        raf = requestAnimationFrame(step);
        timer = window.setTimeout(finish, duration + 200);
      },
      { threshold: 0.2 },
    );
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      if (started) finish();
    };
  }, [cell, color, duration]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 size-full z-10 pointer-events-none" />;
}
