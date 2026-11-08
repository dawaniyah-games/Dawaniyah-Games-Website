/**
 * The falcon's atlas: its types, the sheets (fetched lazily, decoded with createImageBitmap), an alpha
 * mask per sheet read once after loading, and the one way a piece of a sheet is drawn and hit-tested.
 * Sheet pixels everywhere until a DrawCmd scales them onto the line.
 */
export type FalconAnim =
  | 'walk' | 'peek' | 'look-around' | 'turn' | 'soaked' | 'shake' | 'screech' | 'knock' | 'takeoff' | 'landing' | 'flap' | 'glide';
export type SheetKey = Exclude<FalconAnim, 'walk'> | 'walker';
export type Pt = [number, number];

export interface FrameInfo {
  grounded: boolean;
  eye?: Pt;
  beak?: Pt;
}

export interface FalconAnimation {
  file: string;
  frames: number;
  frameSize: Pt;
  anchor: Pt;
  fps: number;
  order: number[];
  loop: boolean;
  frameInfo: FrameInfo[];
  hits?: { frame: number; crack: 1 | 2; beak: Pt }[];
  handoverEye?: Pt;
}

export type WalkerPartName = 'bodyDry' | 'bodyWet' | 'legRear' | 'legFront' | 'legLifted';

export interface WalkerPart {
  rect: [number, number, number, number];
  anchor?: Pt;
  pivot?: Pt;
  foot?: Pt;
}

export interface Gait {
  cycle: number;
  speed: number;
  duty: number;
  lift: number;
  bob: number;
  rock: number;
  dashCycle: number;
  dashSpeed: number;
  easeIn: number;
  easeOut: number;
}

export interface FalconAtlas {
  version: number;
  referenceHeight: number;
  animations: Record<FalconAnim, FalconAnimation>;
  walker: {
    file: string;
    parts: Record<WalkerPartName, WalkerPart>;
    hips: { rear: Pt; front: Pt };
    gait: Gait;
  };
}

/** Every sheet a visit can play. `walk` steps in place and is never drawn: the walker rig walks. */
export const ALL_SHEETS: SheetKey[] = ['peek', 'walker', 'look-around', 'soaked', 'shake', 'turn', 'screech', 'takeoff', 'flap', 'glide', 'landing', 'knock'];

export const FALCON_BASE = `${import.meta.env.BASE_URL}falcon/`;

export const smooth = (u: number) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

// -------------------------------------------------------------------- masks

const MASK_SCALE = 0.5; // mask px per sheet px
const OPAQUE = 100; // what counts as the falcon, for the hit test and the silhouettes
const WATER_OPAQUE = 60; // the wall of water starts at a fainter pixel, as in the film

/** A sheet's alpha at half size, and the first fairly opaque row in each of its columns. */
class AlphaMask {
  readonly w: number;
  readonly h: number;
  readonly tops: Int16Array;

  constructor(
    private data: Uint8Array,
    w: number,
    h: number,
  ) {
    this.w = w;
    this.h = h;
    this.tops = new Int16Array(w).fill(-1);
    for (let x = 0; x < w; x += 1) {
      for (let y = 0; y < h; y += 1) {
        if (data[y * w + x] > WATER_OPAQUE) {
          this.tops[x] = y;
          break;
        }
      }
    }
  }

  /** Alpha at a sheet pixel. */
  at(sx: number, sy: number) {
    const x = Math.floor(sx * MASK_SCALE);
    const y = Math.floor(sy * MASK_SCALE);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }

  /** The first opaque row (sheet px) of a sheet column, or -1. */
  top(sx: number) {
    const x = Math.floor(sx * MASK_SCALE);
    if (x < 0 || x >= this.w) return -1;
    const y = this.tops[x];
    return y < 0 ? -1 : y / MASK_SCALE;
  }
}

function readMask(bitmap: ImageBitmap) {
  const w = Math.max(1, Math.round(bitmap.width * MASK_SCALE));
  const h = Math.max(1, Math.round(bitmap.height * MASK_SCALE));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = rgba[i * 4 + 3];
  return new AlphaMask(alpha, w, h);
}

const idle = () =>
  new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 60);
  });

// -------------------------------------------------------------------- the sheets

export class FalconSheets {
  private bitmaps = new Map<SheetKey, ImageBitmap>();
  private masks = new Map<SheetKey, AlphaMask>();
  private closed = false;

  constructor(
    readonly atlas: FalconAtlas,
    private base: string,
  ) {}

  has(key: SheetKey) {
    return this.bitmaps.has(key) && this.masks.has(key);
  }

  bitmap(key: SheetKey) {
    return this.bitmaps.get(key) ?? null;
  }

  mask(key: SheetKey) {
    return this.masks.get(key) ?? null;
  }

  /** One sheet at a time, each on an idle moment. True when every one of them arrived. */
  async load(keys: SheetKey[]) {
    let ok = true;
    for (const key of keys) {
      if (this.has(key)) continue;
      await idle();
      if (this.closed) return false;
      const file = key === 'walker' ? this.atlas.walker.file : this.atlas.animations[key].file;
      try {
        const response = await fetch(this.base + file);
        if (!response.ok) throw new Error(file);
        const bitmap = await createImageBitmap(await response.blob());
        if (this.closed) {
          bitmap.close();
          return false;
        }
        const mask = readMask(bitmap);
        if (!mask) throw new Error('mask');
        this.bitmaps.set(key, bitmap);
        this.masks.set(key, mask);
      } catch {
        ok = false;
      }
    }
    return ok;
  }

  dispose() {
    this.closed = true;
    this.bitmaps.forEach((bitmap) => bitmap.close());
    this.bitmaps.clear();
    this.masks.clear();
  }
}

/** Phones and small-memory devices get the sheets at 0.36 x master instead of 0.58. */
export function useMobileSheets() {
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return window.innerWidth < 768 || (memory !== undefined && memory <= 4);
}

export async function loadFalconAtlas(mobile: boolean) {
  const base = FALCON_BASE + (mobile ? 'mobile/' : '');
  const response = await fetch(`${base}falcon-atlas.json`);
  if (!response.ok) throw new Error('No falcon atlas');
  return new FalconSheets((await response.json()) as FalconAtlas, base);
}

// -------------------------------------------------------------------- drawing

/**
 * One piece of a sheet on the line: the source rect, the point of it (`px`, `py`, unflipped source
 * px) that lands on (`x`, `y`) in canvas CSS px, scaled by `k`, mirrored about that point when `flip`
 * is -1, and rotated by `rot` radians (canvas direction) about it.
 */
export interface DrawCmd {
  sheet: SheetKey;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  px: number;
  py: number;
  x: number;
  y: number;
  k: number;
  flip: 1 | -1;
  rot: number;
  /** Counts for the wall of water's top: whole frames and the walker's body, not the legs. */
  water?: boolean;
}

export function frameCmd(
  atlas: FalconAtlas,
  anim: Exclude<FalconAnim, 'walk'>,
  n: number,
  flip: 1 | -1,
  x: number,
  y: number,
  scale: number,
  pin: 'feet' | 'eye' = 'feet',
  rot = 0,
): DrawCmd {
  const a = atlas.animations[anim];
  const [fw, fh] = a.frameSize;
  const pivot = pin === 'eye' ? (a.frameInfo[n - 1]?.eye ?? a.anchor) : a.anchor;
  return { sheet: anim, sx: (n - 1) * fw, sy: 0, sw: fw, sh: fh, px: pivot[0], py: pivot[1], x, y, k: scale, flip, rot, water: true };
}

export function drawCmd(ctx: CanvasRenderingContext2D, sheets: FalconSheets, cmd: DrawCmd) {
  const bitmap = sheets.bitmap(cmd.sheet);
  if (!bitmap || cmd.sw <= 0 || cmd.sh <= 0) return;
  ctx.save();
  ctx.translate(cmd.x, cmd.y);
  if (cmd.rot) ctx.rotate(cmd.rot);
  ctx.scale(cmd.flip * cmd.k, cmd.k);
  ctx.drawImage(bitmap, cmd.sx, cmd.sy, cmd.sw, cmd.sh, -cmd.px, -cmd.py, cmd.sw, cmd.sh);
  ctx.restore();
}

/** A canvas point in the piece's source px, or null when it falls outside the piece. */
function toSource(cmd: DrawCmd, X: number, Y: number): [number, number] | null {
  let dx = X - cmd.x;
  let dy = Y - cmd.y;
  if (cmd.rot) {
    const c = Math.cos(-cmd.rot);
    const s = Math.sin(-cmd.rot);
    [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
  }
  const u = cmd.px + dx / (cmd.flip * cmd.k);
  const v = cmd.py + dy / cmd.k;
  if (u < 0 || v < 0 || u >= cmd.sw || v >= cmd.sh) return null;
  return [cmd.sx + u, cmd.sy + v];
}

export function covers(sheets: FalconSheets, cmds: DrawCmd[], X: number, Y: number) {
  for (const cmd of cmds) {
    const at = toSource(cmd, X, Y);
    if (at && (sheets.mask(cmd.sheet)?.at(at[0], at[1]) ?? 0) > OPAQUE) return true;
  }
  return false;
}

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export function bounds(cmds: DrawCmd[]): Box | null {
  let box: Box | null = null;
  for (const cmd of cmds) {
    const c = Math.cos(cmd.rot);
    const s = Math.sin(cmd.rot);
    for (const [u, v] of [[0, 0], [cmd.sw, 0], [0, cmd.sh], [cmd.sw, cmd.sh]]) {
      const lx = (u - cmd.px) * cmd.k * cmd.flip;
      const ly = (v - cmd.py) * cmd.k;
      const X = cmd.x + lx * c - ly * s;
      const Y = cmd.y + lx * s + ly * c;
      if (!box) box = { l: X, t: Y, r: X, b: Y };
      else {
        box.l = Math.min(box.l, X);
        box.r = Math.max(box.r, X);
        box.t = Math.min(box.t, Y);
        box.b = Math.max(box.b, Y);
      }
    }
  }
  return box;
}

/** Intersection over union of two drawn falcons' silhouettes, sampled on a grid over both. */
export function silhouetteIoU(sheets: FalconSheets, a: DrawCmd[], b: DrawCmd[]) {
  const ba = bounds(a);
  const bb = bounds(b);
  if (!ba || !bb) return 0;
  const l = Math.min(ba.l, bb.l);
  const t = Math.min(ba.t, bb.t);
  const r = Math.max(ba.r, bb.r);
  const bt = Math.max(ba.b, bb.b);
  const N = 32;
  let both = 0;
  let either = 0;
  for (let i = 0; i < N; i += 1) {
    const X = l + ((i + 0.5) / N) * (r - l);
    for (let j = 0; j < N; j += 1) {
      const Y = t + ((j + 0.5) / N) * (bt - t);
      const inA = covers(sheets, a, X, Y);
      const inB = covers(sheets, b, X, Y);
      if (inA || inB) either += 1;
      if (inA && inB) both += 1;
    }
  }
  return either ? both / either : 0;
}

/**
 * Where the head is in some frames of a sheet, as sheet px from the anchor along x (facing right):
 * the middle of the front of the silhouette's top third, averaged over the frames. It is the front
 * because a hunched falcon's back can be as high as its head.
 */
export function headOffset(sheets: FalconSheets, anim: Exclude<FalconAnim, 'walk'>, frames: number[]) {
  const mask = sheets.mask(anim);
  if (!mask) return null;
  const a = sheets.atlas.animations[anim];
  const [fw] = a.frameSize;
  const headWidth = 0.3 * sheets.atlas.referenceHeight;
  let sum = 0;
  let n = 0;
  for (const f of frames) {
    const x0 = (f - 1) * fw;
    let top = Infinity;
    for (let x = 0; x < fw; x += 2) {
      const t = mask.top(x0 + x);
      if (t >= 0) top = Math.min(top, t);
    }
    if (!Number.isFinite(top)) continue;
    let front = -1;
    for (let y = top; y < top + (a.anchor[1] - top) / 3; y += 2) {
      for (let x = fw - 1; x > front; x -= 2) {
        if (mask.at(x0 + x, y) > OPAQUE) {
          front = x;
          break;
        }
      }
    }
    if (front < 0) continue;
    sum += front - headWidth / 2 - a.anchor[0];
    n += 1;
  }
  return n ? sum / n : null;
}

/**
 * The highest falcon pixel (canvas y) between two canvas x's, from the masks' column tops. Legs are
 * left out (the body above them is higher); a banked flight frame is read as if level, which at
 * most 14 degrees of bank is close enough for where the water starts.
 */
export function topBetween(sheets: FalconSheets, cmds: DrawCmd[], x0: number, x1: number) {
  let top = Infinity;
  for (const cmd of cmds) {
    if (!cmd.water) continue;
    const mask = sheets.mask(cmd.sheet);
    if (!mask) continue;
    const step = Math.max(1, 2 * cmd.k);
    for (let X = x0; X <= x1; X += step) {
      const u = cmd.px + (X - cmd.x) / (cmd.flip * cmd.k);
      if (u < 0 || u >= cmd.sw) continue;
      const row = mask.top(cmd.sx + u);
      if (row < 0 || row >= cmd.sy + cmd.sh) continue;
      top = Math.min(top, cmd.y + (row - cmd.sy - cmd.py) * cmd.k);
    }
  }
  return Number.isFinite(top) ? top : null;
}
