import { motionViewportHeight } from '../../../utils/motionViewport';
import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../../hooks/useReducedMotion';
import { ISLAND_PERCHES, setBirdPerchReader, type BirdIslandView } from './birdPerches';
import { setDeckCardReader } from './deckCard';
import { ARTBOARD, IslandEngine, VIEW, loadIslandImages } from './engine';
import { setWaterfallReader } from './waterfallEnd';
import { WATERFALL } from './waterfallFx';
import scene from './scene.json';

/** The canvas overflows the artboard, so it is placed relative to the art rectangle. */
const canvasBox: React.CSSProperties = {
  left: `${(VIEW.x / ARTBOARD.w) * 100}%`,
  top: `${(VIEW.y / ARTBOARD.h) * 100}%`,
  width: `${(VIEW.w / ARTBOARD.w) * 100}%`,
  height: `${(VIEW.h / ARTBOARD.h) * 100}%`,
};

export function IslandScene({ className = '' }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const chip = chipRef.current;
    if (!root || !canvas || !host || !chip) return;

    let engine: IslandEngine | null = null;
    let visible = true;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    const sync = () => {
      if (!engine) return;
      if (visible && !document.hidden) engine.start();
      else engine.stop();
    };

    void Promise.all([loadIslandImages(), import('./stage')]).then(([images, { createStage, drawStillIsland }]) => {
      if (disposed) return;
      const reduced = prefersReducedMotion();

      let stage: ReturnType<typeof createStage>;
      try {
        stage = createStage(canvas, images);
      } catch {
        const still = document.createElement('canvas');
        still.className = canvas.className;
        canvas.after(still);
        canvas.style.display = 'none';
        drawStillIsland(still, images);
        return;
      }
      cleanups.push(() => stage.dispose());
      engine = new IslandEngine(canvas, { host, chip }, reduced, stage);

      // Where the story card starts: the top card of the deck on the island.
      const deckCorners = scene.loop.deckCard.corners;
      setDeckCardReader(() => {
        const rect = canvas.getBoundingClientRect();
        const [tl, tr, br, bl] = deckCorners.map(([x, y]) => {
          const point = stage.projectOnLayer('deck-slide', x, y);
          return { x: rect.left + point.x, y: rect.top + point.y };
        });
        return [tl, tr, br, bl];
      });
      cleanups.push(() => setDeckCardReader(null));

      // Where the painted fall hands over to the one that carries on to the hero's edge.
      const { top: fallTop, bottom: fallBottom } = WATERFALL.handoff;
      setWaterfallReader(() => {
        const rect = canvas.getBoundingClientRect();
        const onScreen = (x: number, y: number) => {
          const point = stage.project(x, y);
          return { x: rect.left + point.x, y: rect.top + point.y };
        };
        return {
          tl: onScreen(fallTop.x[0], fallTop.y),
          tr: onScreen(fallTop.x[1], fallTop.y),
          bl: onScreen(fallBottom.x[0], fallBottom.y),
          br: onScreen(fallBottom.x[1], fallBottom.y),
        };
      });
      cleanups.push(() => setWaterfallReader(null));

      // Where the bird can stand. The camera moves, so it asks again every frame.
      setBirdPerchReader({
        read(origin) {
          const rect = canvas.getBoundingClientRect();
          const box = root.getBoundingClientRect();
          const offsetX = rect.left - origin.left;
          const offsetY = rect.top - origin.top;
          const perches = {} as BirdIslandView['perches'];
          for (const { id, x, y, palm } of ISLAND_PERCHES) {
            const ground = stage.project(x, y);
            const point = palm ? stage.projectOnPalm(palm, x, y) : ground;
            perches[id] = { x: point.x + offsetX, y: point.y + offsetY, scale: ground.scale };
          }
          return {
            box: { left: box.left - origin.left, top: box.top - origin.top, right: box.right - origin.left, bottom: box.bottom - origin.top },
            perches,
          };
        },
        lean: (palm, radians) => stage.leanPalm(palm, radians),
      });
      cleanups.push(() => setBirdPerchReader(null));

      const resize = new ResizeObserver(() => engine?.resize());
      resize.observe(canvas);
      cleanups.push(() => resize.disconnect());

      // Pause while the hero is off screen or the tab is hidden; resume where it stopped.
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
      intersection.observe(root);
      cleanups.push(() => intersection.disconnect());

      const onVisibility = () => sync();
      document.addEventListener('visibilitychange', onVisibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

      const onScroll = () => engine?.setScrollProgress(window.scrollY / Math.max(motionViewportHeight(), 1));
      window.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener('scroll', onScroll));
      onScroll();

      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => engine?.setReduced(motion.matches);
      motion.addEventListener('change', onMotion);
      cleanups.push(() => motion.removeEventListener('change', onMotion));

      // Pointer orbit, desktop only.
      if (window.matchMedia('(pointer: fine)').matches) {
        const onPointer = (event: PointerEvent) => {
          engine?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('pointermove', onPointer, { passive: true });
        cleanups.push(() => window.removeEventListener('pointermove', onPointer));
      }

      sync();
    });

    return () => {
      disposed = true;
      engine?.stop();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" data-bird-island="" className={`relative pointer-events-none ${className}`} style={{ aspectRatio: `${ARTBOARD.w} / ${ARTBOARD.h}` }}>
      <div className="absolute" style={canvasBox}>
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <div ref={hostRef} className="island-die">
          <span ref={chipRef} className="island-die-chip" style={{ opacity: 0 }} />
        </div>
      </div>
    </div>
  );
}
