import React, { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { falconSounds } from '../../../audio/falconSounds';
import { prefersReducedMotion, useReducedMotion } from '../../../hooks/useReducedMotion';
import { whenWaterfallReady } from '../island/waterfallEnd';
import type { FalconEngine } from './falconEngine';

// Nothing loads until the line is this close to the screen.
const LOAD_MARGIN = '600px 0px';
// The island says when it is ready; the still picture drawn without WebGL never does.
const ISLAND_WAIT_MS = 5000;

// H: the falcon's height. The canvas reaches 4.4 H above the line and 0.5 H below it.
const CANVAS_STYLE = {
  '--falcon-h': 'clamp(76px, 8.4vw, 121px)',
  height: 'calc(var(--falcon-h) * 4.9)',
  bottom: 'calc(var(--falcon-h) * -0.5)',
} as CSSProperties;

/**
 * The saker falcon on the line between the hero and the purple section. It sits beside the hero, like
 * the waterfall's edge, because the hero clips. Its canvas takes no pointer events: everything under
 * it still clicks. The engine is its own chunk.
 */
export function FalconLine({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FalconEngine | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const sentinel = sentinelRef.current;
    if (!canvas || !sentinel || !heroRef.current) return;
    let disposed = false;
    let stopWaiting = () => {};
    let timer = 0;

    const start = () => {
      if (disposed || engineRef.current) return;
      stopWaiting();
      window.clearTimeout(timer);
      void import('./falconEngine')
        .then(({ FalconEngine }) => {
          if (disposed || engineRef.current) return;
          const engine = new FalconEngine({ canvas, sentinel, sounds: falconSounds, reduced: prefersReducedMotion() });
          engineRef.current = engine;
          return engine.start();
        })
        .catch(() => {
          // The page is complete without the falcon.
        });
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        stopWaiting = whenWaterfallReady(start);
        timer = window.setTimeout(start, ISLAND_WAIT_MS);
      },
      { rootMargin: LOAD_MARGIN },
    );
    near.observe(sentinel);

    return () => {
      disposed = true;
      near.disconnect();
      stopWaiting();
      window.clearTimeout(timer);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [heroRef]);

  useEffect(() => {
    engineRef.current?.setReduced(reduced);
  }, [reduced]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-px w-px" />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute left-0 z-[6] w-full" style={CANVAS_STYLE} />
    </>
  );
}
