import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { birdSounds } from '../../../audio/birdSounds';
import { SoundPrompt } from '../../layout/SoundPrompt';
import type { BirdEngine } from './birdEngine';

/**
 * The bird over the hero: one canvas that covers the composition and takes no pointer events, so the
 * hero under it still scrolls and clicks. The engine is its own chunk, loaded once the page has settled.
 */
export function IslandBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BirdEngine | null>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    void import('./birdEngine').then(({ BirdEngine }) => {
      if (disposed) return;
      const engine = new BirdEngine(canvas, birdSounds);
      engineRef.current = engine;
      engine.start().catch(() => {
        // The hero is complete without the bird.
      });
    });
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.remeasure();
  }, [i18n.language]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full" />
      <SoundPrompt />
    </>
  );
}
