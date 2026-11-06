import React, { useEffect, useRef, useState } from 'react';
import { openSoundPrompt, shouldAskForSound, startSoundIfAllowed } from '../../audio/soundStore';
import { EmblemLockup } from '../brand/EmblemLockup';
import { loadIslandImages } from '../sections/island/engine';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';

const SQUARES = 10;
const MIN_VISIBLE_MS = 700;
// On a slow connection the page shows after this even if the island is still loading; it appears when ready.
const MAX_WAIT_MS = 4000;
const DISSOLVE_MS = 500;
const CELL = 56;

/** Shows while the island assets load, then dissolves into the hero square by square. */
export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'dissolving' | 'done'>('loading');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();
    let timer = 0;
    let finished = false;

    const finish = () => {
      // The timeout and the images can both get here.
      if (cancelled || finished) return;
      finished = true;
      window.clearTimeout(timer);
      setProgress(1);
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - started));
      window.setTimeout(() => {
        void startSoundIfAllowed().then((sound) => {
          if (cancelled) return;
          if (sound === 'needs-gesture' && shouldAskForSound()) openSoundPrompt();
          setPhase('dissolving');
        });
      }, wait);
    };

    timer = window.setTimeout(finish, MAX_WAIT_MS);
    void loadIslandImages((done) => {
      if (!cancelled) setProgress(done);
    }).then(finish);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'dissolving') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || prefersReducedMotion()) {
      setPhase('done');
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#2B1B4D';
    ctx.fillRect(0, 0, width, height);

    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const order = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - 0.5);
    const started = performance.now();
    let cleared = 0;
    let raf = 0;

    const step = (now: number) => {
      const target = Math.min(order.length, Math.ceil(((now - started) / DISSOLVE_MS) * order.length));
      for (; cleared < target; cleared += 1) {
        const i = order[cleared];
        ctx.clearRect((i % cols) * CELL, Math.floor(i / cols) * CELL, CELL, CELL);
      }
      if (cleared < order.length) raf = requestAnimationFrame(step);
      else setPhase('done');
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === 'done') return null;

  const filled = Math.round(progress * SQUARES);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" role="status" aria-label="Loading">
      {phase === 'loading' ? (
        <div className="absolute inset-0 bg-night flex flex-col items-center justify-center gap-10 px-6">
          <EmblemLockup className="w-[min(74vw,1070px,calc((100vh-160px)*1.6))]" />
          {/* In the page's direction: the squares fill right to left on /ar/. */}
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: SQUARES }, (_, i) => (
              <span
                key={i}
                className={`size-4 rounded-[4px] transition-colors duration-150 ${i < filled ? 'bg-saffron' : 'bg-white/15'}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      )}
    </div>
  );
}
