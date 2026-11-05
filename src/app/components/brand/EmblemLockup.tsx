import React from 'react';
import emblem from '../../../assets/brand/emblem.webp';

const WIDTH = 1259;
const HEIGHT = 784;

/** Where the arch and the wordmark sit inside the lockup artwork, as fractions of its width. */
const ARCH = { from: 0.03, to: 0.47 };
const WORDMARK = { from: 0.54, to: 1 };

function Crop({ from, to, label }: { from: number; to: number; label?: string }) {
  const share = to - from;
  return (
    <div className="overflow-hidden w-full" style={{ aspectRatio: `${WIDTH * share} / ${HEIGHT}`, maxWidth: `${share * 100}vw` }}>
      <img
        src={emblem}
        alt={label ?? ''}
        width={WIDTH}
        height={HEIGHT}
        decoding="async"
        className="block max-w-none h-full w-auto"
        style={{ marginInlineStart: `-${(from / share) * 100}%` }}
      />
    </div>
  );
}

/**
 * The "Majlis at dusk" lockup. Side by side from tablet up; on a phone the arch sits above the
 * wordmark, as in the mobile loading frame. The artwork is not mirrored on Arabic pages.
 */
export function EmblemLockup({ className = '' }: { className?: string }) {
  return (
    <div className={className} dir="ltr">
      <img
        src={emblem}
        alt="Dawaniyah Games"
        width={WIDTH}
        height={HEIGHT}
        decoding="async"
        className="hidden sm:block w-full h-auto"
      />
      <div className="sm:hidden flex flex-col items-center gap-3">
        <div className="w-[62%]">
          <Crop from={ARCH.from} to={ARCH.to} label="Dawaniyah Games" />
        </div>
        <div className="w-[62%]">
          <Crop from={WORDMARK.from} to={WORDMARK.to} />
        </div>
      </div>
    </div>
  );
}
