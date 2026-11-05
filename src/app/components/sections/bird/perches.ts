/**
 * Where can the bird stand on a headline? Only where both feet land on ink: a top that is level (or a
 * gentle round crown) across at least `minFlat` CSS px, with room for the body: no taller letter within
 * `body / 2` CSS px either side, so the crossbar of an H or a low stroke between two Arabic stems is
 * not a perch. Measured from the live glyphs, so it follows the font, the language and the width.
 *
 * Marks (dots, shadda, hamza, madda: any ink smaller than `marks` CSS px²) are not surfaces and do not
 * block the body, but a mark right above the feet does block that spot.
 *
 * A port of design-handoff/bird-sprites/perches.js, with the rejected runs kept for the debug overlay.
 */
export type Facing = 'any' | 'left' | 'right';

export interface PerchRun {
  x: number; // where the feet go
  y: number; // the run's highest point
  width: number;
  sag: number; // how much it curves down at its ends
  facing: Facing;
}

export interface HeadlinePerch extends PerchRun {
  el: HTMLElement;
}

export interface RejectedRun {
  x: number;
  y: number;
  width: number;
  why: string;
}

interface InkBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface FlatTopOptions {
  minFlat?: number;
  tolerance?: number;
  body?: number;
  tallBy?: number;
  marks?: number;
  endOfWord?: number; // the bird's height turns on word-end spots, 0 is off
  k?: number; // how many canvas pixels per CSS pixel to read the glyphs at
  rejected?: RejectedRun[];
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

let lastInk: InkBox | null = null;

/** Perch spots on one element, relative to its border box. Also leaves its ink box in `lastInk`. */
export function flatTops(el: HTMLElement, { minFlat = 14, tolerance = 2, body = 44, tallBy = 1, marks = 220, endOfWord = 0, k = 2, rejected }: FlatTopOptions = {}): PerchRun[] {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const pad = 40;
  const W = Math.ceil((r.width + 2 * pad) * k);
  const H = Math.ceil((r.height + 2 * pad) * k);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return [];
  g.scale(k, k);
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if ('letterSpacing' in g) (g as { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  g.direction = cs.direction as CanvasDirection;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const text = cs.textTransform === 'uppercase' ? (el.textContent ?? '').toUpperCase() : (el.textContent ?? '');
  const m = g.measureText(text);
  const A = m.fontBoundingBoxAscent;
  const D = m.fontBoundingBoxDescent;
  const L = cs.lineHeight === 'normal' ? A + D : parseFloat(cs.lineHeight);
  const padTop = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
  const padLeft = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const baseline = padTop + (L - (A + D)) / 2 + A; // where CSS puts the baseline in the box
  g.fillStyle = '#000';
  g.fillText(text, pad + padLeft + (cs.direction === 'rtl' ? m.actualBoundingBoxLeft : 0), pad + baseline);
  const data = g.getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) ink[i] = data[i * 4 + 3] > 128 ? 1 : 0;

  // Split the ink into pieces. Small pieces are marks.
  const label = new Int32Array(W * H).fill(-1);
  const isMark: boolean[] = [];
  const stack: number[] = [];
  for (let i = 0; i < W * H; i += 1) {
    if (!ink[i] || label[i] >= 0) continue;
    const id = isMark.length;
    let area = 0;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      area += 1;
      const x = j % W;
      const y = (j - x) / W;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (ink[n] && label[n] < 0) {
          label[n] = id;
          stack.push(n);
        }
      }
    }
    isMark.push(area / (k * k) < marks);
  }

  // The top of the letters (marks ignored) and the top of the marks, per column.
  const top = new Int32Array(W).fill(-1);
  const markTop = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x += 1) {
    for (let y = 0; y < H; y += 1) {
      const i = y * W + x;
      if (!ink[i]) continue;
      if (isMark[label[i]]) {
        if (markTop[x] < 0) markTop[x] = y;
        continue;
      }
      top[x] = y;
      break;
    }
  }

  let ix0 = W;
  let iy0 = H;
  let ix1 = -1;
  let iy1 = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!ink[y * W + x]) continue;
      if (x < ix0) ix0 = x;
      if (x > ix1) ix1 = x;
      if (y < iy0) iy0 = y;
      if (y > iy1) iy1 = y;
    }
  }
  lastInk = ix1 < 0 ? null : { x0: ix0 / k - pad, y0: iy0 / k - pad, x1: (ix1 + 1) / k - pad, y1: (iy1 + 1) / k - pad };

  const tol = tolerance * k;
  const half = Math.round((body / 2) * k);
  const tall = tallBy * k;
  const feetPad = 4 * k;
  const out: PerchRun[] = [];
  let x = 0;
  while (x < W) {
    if (top[x] < 0) {
      x += 1;
      continue;
    }
    let e = x;
    let hi = top[x];
    let lo = top[x];
    while (e + 1 < W && top[e + 1] >= 0 && Math.max(lo, top[e + 1]) - Math.min(hi, top[e + 1]) <= tol) {
      e += 1;
      hi = Math.min(hi, top[e]);
      lo = Math.max(lo, top[e]);
    }
    const width = (e - x + 1) / k;
    const place = { x: (x + e + 1) / 2 / k - pad, y: hi / k - pad, width };
    if (width >= minFlat) {
      const cx = Math.round((x + e) / 2);
      // No dot or other mark sitting right over the feet.
      let marksClear = true;
      for (let q = Math.max(0, x - feetPad); q <= Math.min(W - 1, e + feetPad) && marksClear; q += 1) {
        if (markTop[q] >= 0 && markTop[q] < hi) marksClear = false;
      }
      // Room for the body: no letter rising above the run nearby.
      let clear = true;
      for (let q = Math.max(0, cx - half); q <= Math.min(W - 1, cx + half) && clear; q += 1) {
        if (top[q] >= 0 && top[q] < hi - tall) clear = false;
      }
      if (marksClear && clear) {
        out.push({ ...place, sag: (lo - hi) / k, facing: 'any' });
      } else if (marksClear && endOfWord) {
        // The end of a word (the final stroke of an Arabic word, often): the bird can stand at the very
        // end facing out, its back to the word, as long as the letters behind it stay below its tail
        // (lower than half its height) and nothing is in front of it.
        const h = endOfWord * k;
        const near = Math.round(0.14 * h);
        const back = Math.round(0.3 * h);
        const tryEnd = (outward: -1 | 1): PerchRun | null => {
          if (outward < 0 ? x - ix0 > near : ix1 - e > near) return null; // not at the word's end
          const feet = outward < 0 ? Math.min(e, x + Math.round(0.17 * h)) : Math.max(x, e - Math.round(0.17 * h));
          for (let q = feet; outward < 0 ? q <= Math.min(W - 1, feet + back) : q >= Math.max(0, feet - back); q -= outward) {
            if (top[q] >= 0 && top[q] < hi - 0.5 * h) return null; // a stem would cut through its back
          }
          return { x: (feet + 0.5) / k - pad, y: hi / k - pad, width, sag: (lo - hi) / k, facing: outward < 0 ? 'left' : 'right' };
        };
        const spot = tryEnd(-1) ?? tryEnd(1);
        if (spot) out.push(spot);
        else rejected?.push({ ...place, why: 'no body room' });
      } else {
        rejected?.push({ ...place, why: marksClear ? 'no body room' : 'mark above' });
      }
    } else if (width >= 4) {
      rejected?.push({ ...place, why: 'too narrow' });
    }
    x = e + 1;
  }
  return out;
}

/**
 * Letters in inline-blocks lose the kerning between them, which opens up pairs like the T and O of
 * TOOLS. This puts each pair's kerning back as a margin, so the headline sets as it did in one piece.
 */
export function restoreKerning(pieces: HTMLElement[]) {
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return;
  for (const letter of pieces) {
    const before = letter.previousElementSibling;
    const cs = getComputedStyle(letter);
    if (!before || cs.direction === 'rtl') continue;
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const a = before.textContent ?? '';
    const b = letter.textContent ?? '';
    const kerning = g.measureText(a + b).width - g.measureText(a).width - g.measureText(b).width;
    letter.style.marginInlineStart = Math.abs(kerning) > 0.01 ? `${(kerning / parseFloat(cs.fontSize)).toFixed(4)}em` : '';
  }
}

export interface HeadlineOptions {
  birdHeight: number;
  tolerance?: number;
  origin: { left: number; top: number };
  rejected?: RejectedRun[];
}

/**
 * All the perches on a headline: flatTops on every piece (EN letters, AR words), keeping only spots with
 * headroom: nothing from another piece inside the space the standing bird takes up, which is its
 * height tall, 0.6 of that wide, and shifted forwards at a word's end. In px relative to `origin`.
 */
export function headlinePerches(pieces: HTMLElement[], { birdHeight, tolerance = 2, origin, rejected }: HeadlineOptions): HeadlinePerch[] {
  const runRejected: RejectedRun[] = [];
  const options = { minFlat: 0.2 * birdHeight, body: 0.65 * birdHeight, tolerance, endOfWord: birdHeight };
  const found: HeadlinePerch[] = [];
  const inks: (InkBox & { el: HTMLElement })[] = [];
  for (const el of pieces) {
    const r = el.getBoundingClientRect();
    runRejected.length = 0;
    const spots = flatTops(el, { ...options, rejected: rejected ? runRejected : undefined });
    if (lastInk) inks.push({ el, x0: r.left + lastInk.x0, y0: r.top + lastInk.y0, x1: r.left + lastInk.x1, y1: r.top + lastInk.y1 });
    for (const spot of spots) found.push({ ...spot, x: r.left + spot.x, y: r.top + spot.y, el });
    if (rejected) for (const run of runRejected) rejected.push({ ...run, x: r.left + run.x - origin.left, y: r.top + run.y - origin.top });
  }
  const spaceOf = (p: PerchRun) =>
    p.facing === 'left' ? [p.x - 0.42 * birdHeight, p.x + 0.22 * birdHeight] : p.facing === 'right' ? [p.x - 0.22 * birdHeight, p.x + 0.42 * birdHeight] : [p.x - 0.3 * birdHeight, p.x + 0.3 * birdHeight];
  const hasHeadroom = (p: HeadlinePerch) => {
    const [left, right] = spaceOf(p);
    return !inks.some((box) => box.el !== p.el && box.x1 > left && box.x0 < right && box.y1 > p.y - birdHeight && box.y0 < p.y - 2);
  };
  const out: HeadlinePerch[] = [];
  for (const p of found) {
    if (hasHeadroom(p)) out.push({ ...p, x: p.x - origin.left, y: p.y - origin.top });
    else rejected?.push({ x: p.x - origin.left, y: p.y - origin.top, width: p.width, why: 'no headroom' });
  }
  return out;
}
