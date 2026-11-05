import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StoryFaceProps {
  number: string;
  title: string;
  Icon: LucideIcon;
  className?: string;
}

/**
 * One face of the story card (Figma "Card / Front — Story item"): one per service and reason. It is
 * drawn in units of its own width, so the same face works on the card and as a small card in a list.
 */
export const StoryFace = forwardRef<HTMLDivElement, StoryFaceProps>(function StoryFace({ number, title, Icon, className = '' }, ref) {
  return (
    <div ref={ref} className={`story-face ${className}`}>
      <div className="sf">
        <span className="sf-inner-line" />
        <span className="sf-sadu" />
        <span className="sf-sadu sf-sadu-bottom" />
        <b className="sf-number" dir="ltr">
          {number}
        </b>
        <b className="sf-number sf-number-end" dir="ltr">
          {number}
        </b>
        <span className="sf-medallion">
          <Icon strokeWidth={1.6} />
        </span>
        <p className="sf-title" dir="auto">
          {title}
        </p>
      </div>
    </div>
  );
});
