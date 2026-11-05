import React from 'react';
import { cardById, type ProjectCardId } from './projectCards';

interface CardSlotProps {
  id: ProjectCardId;
  alt: string;
  sizes: string;
  className?: string;
  radius: number;
}

/**
 * A stop on the card's flight. Holds the real artwork, which appears when the card first arrives
 * and stays after it moves on. Until then the slot is an outline.
 */
export function CardSlot({ id, alt, sizes, className = '', radius }: CardSlotProps) {
  const card = cardById(id);
  return (
    <div data-card-slot={id} className={`card-slot ${className}`} style={{ borderRadius: radius }}>
      <picture>
        <source type="image/webp" srcSet={card.srcSet} sizes={sizes} />
        <img
          src={card.image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover shadow-[0_16px_28px_rgba(15,8,31,0.35)]"
          style={{ borderRadius: radius }}
        />
      </picture>
    </div>
  );
}
