/**
 * Where the painted waterfall hands over to the one that falls to the hero's edge, on screen right
 * now. Like deckCard.ts, this sits in its own file so the hero does not need three.js to ask.
 */
export type WaterfallPoint = { x: number; y: number };

/** The fall's edges at the top and at the foot of the hand-over, in viewport pixels. */
export interface WaterfallEnds {
  tl: WaterfallPoint;
  tr: WaterfallPoint;
  bl: WaterfallPoint;
  br: WaterfallPoint;
}

let reader: (() => WaterfallEnds) | null = null;
const waiting = new Set<() => void>();

export function setWaterfallReader(next: (() => WaterfallEnds) | null) {
  reader = next;
  if (!next) return;
  waiting.forEach((listener) => listener());
  waiting.clear();
}

/** Null while the island is not ready, and for good on the still picture drawn without WebGL. */
export function readWaterfall() {
  return reader?.() ?? null;
}

/** Calls back once the island can be read. Returns a function that cancels the wait. */
export function whenWaterfallReady(listener: () => void) {
  if (reader) {
    listener();
    return () => {};
  }
  waiting.add(listener);
  return () => {
    waiting.delete(listener);
  };
}
