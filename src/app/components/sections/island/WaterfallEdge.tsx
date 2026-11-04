import React, { useEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { readWaterfall, whenWaterfallReady } from './waterfallEnd';
import { WaterfallEdgeFx, type WaterfallSprites } from './waterfallFx';

const BASE = `${import.meta.env.BASE_URL}island/`;
const SPRITE_FILES: Record<keyof WaterfallSprites, string> = {
  column: 'water/fall-column-tile-128x512.png',
  foam: 'water/edge-foam-256x64.png',
  sheen: 'water/edge-sheen-512x16.png',
  glow: 'water/edge-glow-512x160.png',
  mist: 'water/mist-256.png',
  square: 'particles/square-pixel-24.png',
};
// The splash reaches this far past the hero, so it keeps running until that has left the screen too.
const WATCH_MARGIN = '160px 0px';

function loadSprites() {
  const load = ([name, file]: [string, string]) =>
    new Promise<[string, HTMLImageElement]>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([name, img]);
      img.onerror = reject;
      img.src = BASE + file;
    });
  return Promise.all(Object.entries(SPRITE_FILES).map(load)).then((pairs) => Object.fromEntries(pairs) as unknown as WaterfallSprites);
}

/**
 * The island's waterfall carries on to the bottom of the hero and splashes there. This sits beside
 * the hero rather than in it, because the hero clips and the splash spills onto the next section.
 */
export function WaterfallEdge({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const hero = heroRef.current;
    if (!canvas || !host || !hero) return;

    let fx: WaterfallEdgeFx | null = null;
    let visible = false;
    let disposed = false;

    const read = () => {
      const ends = readWaterfall();
      if (!ends) return null;
      const { left, top } = host.getBoundingClientRect();
      const inHost = ({ x, y }: { x: number; y: number }) => ({ x: x - left, y: y - top });
      return { tl: inHost(ends.tl), tr: inHost(ends.tr), bl: inHost(ends.bl), br: inHost(ends.br) };
    };
    const edge = () => hero.getBoundingClientRect().bottom - host.getBoundingClientRect().top;

    const sync = () => {
      if (!fx) return;
      if (reduced) {
        fx.stop();
        fx.tick(0);
      } else if (visible && !document.hidden) {
        fx.start();
      } else {
        fx.stop();
      }
    };

    const stopWaiting = whenWaterfallReady(() => {
      void loadSprites()
        .then((sprites) => {
          if (disposed) return;
          fx = new WaterfallEdgeFx({ canvas, host, read, edge, sprites, reduced });
          sync();
        })
        .catch(() => {
          // Without its sprites the fall simply ends in the island's own mist.
        });
    });

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: WATCH_MARGIN },
    );
    intersection.observe(host);

    // Reduced motion has no loop, so a change of size has to redraw it. A frame later, because the
    // island takes its own new size in a resize callback that may run after this one.
    let redraw = 0;
    const resize = new ResizeObserver(() => {
      if (!reduced) return;
      cancelAnimationFrame(redraw);
      redraw = requestAnimationFrame(() => fx?.tick(0));
    });
    resize.observe(hero);

    document.addEventListener('visibilitychange', sync);

    return () => {
      disposed = true;
      stopWaiting();
      cancelAnimationFrame(redraw);
      fx?.stop();
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [heroRef, reduced]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute left-0 top-0 pointer-events-none z-[5]" style={{ visibility: 'hidden' }} />;
}
