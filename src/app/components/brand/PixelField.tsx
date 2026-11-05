import React from 'react';

const ALPHAS = [0.06, 0.1, 0.14, 0.18, 0.22];

/** The scattered violet squares behind the Tools section (Figma frame "03 Tools"). */
export function PixelField() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-[8px] size-[40px]"
          style={{
            insetInlineStart: `${((840 + ((i * 97) % 560)) / 1440) * 100}%`,
            top: `${((40 + ((i * 53) % 700)) / 820) * 100}%`,
            backgroundColor: `rgba(138, 92, 240, ${ALPHAS[i % ALPHAS.length]})`,
          }}
        />
      ))}
    </div>
  );
}
