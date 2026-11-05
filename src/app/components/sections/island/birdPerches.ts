/**
 * Where the bird can stand on the island, on screen right now. Like deckCard.ts, this sits in its own
 * file so the bird does not need three.js to ask.
 */
export type PalmCrownId = 'palm-left-crown' | 'palm-right-crown';
export type IslandPerchId = 'sand-by-bridge' | 'bridge-planks' | 'chip-red-1' | 'chip-red-3' | PalmCrownId;

export interface IslandPerchSpot {
  id: IslandPerchId;
  x: number; // art pixels of scene.json
  y: number;
  palm?: PalmCrownId; // on this palm's crown, and swaying with it
  group?: string; // perches in one group are close enough to hop between
}

/** Never the tent, the pawns, the die, the lantern, the water or the cards the pawns hop on. */
export const ISLAND_PERCHES: IslandPerchSpot[] = [
  { id: 'sand-by-bridge', x: 870, y: 1108, group: 'bridge' },
  { id: 'bridge-planks', x: 518, y: 1147, group: 'bridge' },
  { id: 'chip-red-1', x: 978, y: 876 },
  { id: 'chip-red-3', x: 1895, y: 1085 },
  { id: 'palm-left-crown', x: 739, y: 88, palm: 'palm-left-crown' },
  { id: 'palm-right-crown', x: 1975, y: -112, palm: 'palm-right-crown' },
];

/** The bird's height on the island, in art pixels. */
export const ISLAND_BIRD_HEIGHT = 200;

export type Origin = { left: number; top: number };

export interface BirdIslandView {
  /** The island's box, relative to the origin that was asked for. */
  box: { left: number; top: number; right: number; bottom: number };
  /** CSS pixels relative to the same origin, and CSS pixels per art pixel. */
  perches: Record<IslandPerchId, { x: number; y: number; scale: number }>;
}

interface BirdIslandLink {
  read(origin: Origin): BirdIslandView;
  lean(palm: PalmCrownId, radians: number): void;
}

let link: BirdIslandLink | null = null;
const waiting = new Set<() => void>();

export function setBirdPerchReader(next: BirdIslandLink | null) {
  link = next;
  if (!next) return;
  waiting.forEach((listener) => listener());
  waiting.clear();
}

/** Null while the island is not ready, and for good on the still picture drawn without WebGL. */
export function readBirdPerches(origin: Origin) {
  return link?.read(origin) ?? null;
}

/** The bird's weight on a palm, added to the crown's sway. */
export function leanBirdPalm(palm: PalmCrownId, radians: number) {
  link?.lean(palm, radians);
}

/** Calls back once the island can be read. Returns a function that cancels the wait. */
export function whenBirdPerchesReady(listener: () => void) {
  if (link) {
    listener();
    return () => {};
  }
  waiting.add(listener);
  return () => {
    waiting.delete(listener);
  };
}
