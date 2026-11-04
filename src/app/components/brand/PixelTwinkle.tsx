import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';

interface PixelTwinkleProps {
  /** Grid pitch and square size, in CSS pixels. */
  cell?: number;
  size?: number;
  /** "r, g, b" of the squares. */
  rgb?: string;
  /** Peak opacity of a square. */
  peak?: number;
  /** Share of cells lit at any moment. */
  density?: number;
  /** Lean towards the top-right of the block (the hero's denser corner). */
  bias?: boolean;
  className?: string;
}

const FADE_IN = 600;
const HOLD = 800;
const FADE_OUT = 900;
const LIFE = FADE_IN + HOLD + FADE_OUT;

interface Lit {
  x: number;
  y: number;
  start: number;
  peak: number;
}

/** Motion spec 2a: a pixel grid behind a block. Squares fade in, hold and fade out at random. */
export function PixelTwinkle({
  cell = 56,
  size = 40,
  rgb = '255, 255, 255',
  peak = 0.5,
  density = 0.06,
  bias = false,
  className = '',
}: PixelTwinkleProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let lit: Lit[] = [];
    let raf = 0;
    let visible = false;

    const pickCell = () => {
      for (let tries = 0; tries < 8; tries += 1) {
        const c = Math.floor(Math.random() * cols);
        const r = Math.floor(Math.random() * rows);
        const across = c / Math.max(cols - 1, 1);
        const up = 1 - r / Math.max(rows - 1, 1);
        if (!bias || Math.random() < 0.3 + 0.35 * (across + up)) return { c, r };
      }
      return { c: Math.floor(Math.random() * cols), r: Math.floor(Math.random() * rows) };
    };

    const makeLit = (now: number, midCycle: boolean): Lit => {
      const { c, r } = pickCell();
      return {
        x: c * cell + (cell - size) / 2,
        y: r * cell + (cell - size) / 2,
        start: now + (midCycle ? -Math.random() * LIFE : Math.random() * 900),
        peak: peak * (0.55 + Math.random() * 0.45),
      };
    };

    const paintSquare = (x: number, y: number, alpha: number) => {
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 8);
      ctx.fill();
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      lit.forEach((square, i) => {
        const age = now - square.start;
        if (age >= LIFE) {
          lit[i] = makeLit(now, false);
          return;
        }
        if (age < 0) return;
        let k = 1;
        if (age < FADE_IN) k = age / FADE_IN;
        else if (age >= FADE_IN + HOLD) k = 1 - (age - FADE_IN - HOLD) / FADE_OUT;
        paintSquare(square.x, square.y, square.peak * k);
      });
    };

    const tick = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const start = () => {
      if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      const now = performance.now();
      lit = Array.from({ length: Math.max(6, Math.round(cols * rows * density)) }, () => makeLit(now, true));
      if (reduced) {
        ctx.clearRect(0, 0, width, height);
        lit.forEach((square) => paintSquare(square.x, square.y, square.peak * 0.7));
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    intersection.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [bias, cell, density, peak, rgb, size]);

  return <canvas ref={ref} aria-hidden="true" className={`absolute inset-0 size-full pointer-events-none ${className}`} />;
}
