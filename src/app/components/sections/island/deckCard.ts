/**
 * Where the top card of the deck on the island is on screen right now. The story's card starts its
 * journey there. This sits in its own file so the story does not need three.js to ask.
 */
export type ScreenPoint = { x: number; y: number };

/** The card's four corners on screen: top left, top right, bottom right, bottom left. */
export type DeckCardCorners = [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];

export interface DeckCardPlace {
  x: number;
  y: number;
  width: number; // of the card lying flat, as a card of this size stood up would be
  roll: number; // rotateZ, then
  tilt: number; // rotateX, then
  twist: number; // rotateZ, all in degrees
}

let reader: (() => DeckCardCorners) | null = null;

export function setDeckCardReader(next: (() => DeckCardCorners) | null) {
  reader = next;
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * The turn and size that put a card of this width and height exactly on those corners. A flat card
 * seen from far off is a 2x2 matrix, and its singular value decomposition is the turn on the table,
 * the tilt away from the viewer and the turn on the screen.
 */
export function readDeckCard(cardWidth: number, cardHeight: number): DeckCardPlace | null {
  const corners = reader?.();
  if (!corners) return null;
  const [tl, tr, br, bl] = corners;
  const a = (tr.x - tl.x + br.x - bl.x) / 2 / cardWidth;
  const b = (tr.y - tl.y + br.y - bl.y) / 2 / cardWidth;
  const c = (bl.x - tl.x + br.x - tr.x) / 2 / cardHeight;
  const d = (bl.y - tl.y + br.y - tr.y) / 2 / cardHeight;

  const e = (a + d) / 2;
  const f = (a - d) / 2;
  const g = (b + c) / 2;
  const h = (b - c) / 2;
  const q = Math.hypot(e, h);
  const r = Math.hypot(f, g);
  const major = q + r;
  const minor = q - r;
  const first = Math.atan2(g, f);
  const second = Math.atan2(h, e);

  // Half a turn on both sides cancels out, so keep the turn on the table the short way round.
  let twist = toDegrees((second - first) / 2);
  let roll = toDegrees((second + first) / 2);
  if (twist > 90) {
    twist -= 180;
    roll += 180;
  } else if (twist < -90) {
    twist += 180;
    roll -= 180;
  }
  if (roll > 180) roll -= 360;
  else if (roll < -180) roll += 360;

  return {
    x: (tl.x + tr.x + br.x + bl.x) / 4,
    y: (tl.y + tr.y + br.y + bl.y) / 4,
    width: major * cardWidth,
    roll,
    tilt: toDegrees(Math.acos(Math.min(1, minor / major))),
    twist,
  };
}
