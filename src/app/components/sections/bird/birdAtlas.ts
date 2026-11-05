/** The sprite atlas: its types, and the sheets, loaded lazily and decoded with createImageBitmap. */
export type StandingAnim =
  | 'look-around' | 'chirp' | 'turn' | 'bob' | 'hop' | 'peck' | 'preen' | 'fluff'
  | 'scratch' | 'stretch' | 'startled' | 'sleep' | 'annoyed' | 'takeoff' | 'landing';
export type FlyingAnim = 'flap' | 'glide' | 'swoop' | 'hover';
export type BirdAnim = StandingAnim | FlyingAnim;

export interface BirdAnimation {
  image: string;
  fallback: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  loop: boolean;
  anchor: { kind: 'feet' | 'eye'; x: number; y: number };
  sequence?: number[];
  hold?: number[];
  order?: number[];
  grounded?: boolean[];
  burstFrame?: number;
  eye: ([number, number] | null)[];
  handoverEye?: { frame: number; x: number; y: number };
}

export interface BirdAtlas {
  version: number;
  referenceHeight: number;
  animations: Record<BirdAnim, BirdAnimation>;
  particles: { feathers: { image: string; fallback: string; cell: number; count: number } };
}

export const FEATHERS = 'feathers';
const BASE = `${import.meta.env.BASE_URL}bird/`;

/** Decoded first: everything it needs to wake up, leave, land and be annoyed. */
export const CORE_SHEETS: BirdAnim[] = ['look-around', 'sleep', 'stretch', 'peck', 'hop', 'turn', 'annoyed', 'takeoff', 'landing', 'flap', 'glide'];
const LATER_SHEETS: BirdAnim[] = ['chirp', 'bob', 'fluff', 'startled', 'hover', 'preen', 'scratch', 'swoop'];
const NOT_ON_PHONES: BirdAnim[] = ['swoop', 'scratch', 'preen'];

export const laterSheets = (compact: boolean) => LATER_SHEETS.filter((name) => !compact || !NOT_ON_PHONES.includes(name));

/** Whether a silhouette covers each cell, in a coarse grid: what cross-fades and hit-testing use. */
interface FrameMask {
  cells: number[]; // x, y pairs in sheet pixels, cell centres
  count: number;
  bounds: { left: number; top: number; right: number; bottom: number };
}

export interface FrameRef {
  anim: BirdAnim;
  frame: number;
  flip: boolean;
}

const GRID = 36; // cells across a frame

export class BirdSheets {
  private bitmaps = new Map<string, ImageBitmap>();
  private masks = new Map<BirdAnim, FrameMask[]>();
  private overlaps = new Map<string, number>();
  private closed = false;

  constructor(
    readonly atlas: BirdAtlas,
    private base: string,
  ) {}

  has(name: BirdAnim) {
    return this.bitmaps.has(name);
  }

  sheet(name: string) {
    return this.bitmaps.get(name) ?? null;
  }

  get feathers() {
    return this.bitmaps.get(FEATHERS) ?? null;
  }

  /** Loads what is not loaded yet. A sheet that fails is simply never played. */
  async load(names: BirdAnim[]) {
    await Promise.all(
      names.map(async (name) => {
        if (this.bitmaps.has(name)) return;
        const { image, fallback } = this.atlas.animations[name];
        const bitmap = await this.fetchSheet(image, fallback);
        if (!bitmap) return;
        if (this.closed) {
          bitmap.close();
          return;
        }
        this.bitmaps.set(name, bitmap);
        this.masks.set(name, this.readMasks(name, bitmap));
      }),
    );
  }

  async loadFeathers() {
    if (this.bitmaps.has(FEATHERS)) return;
    const { image, fallback } = this.atlas.particles.feathers;
    const bitmap = await this.fetchSheet(image, fallback);
    if (bitmap && !this.closed) this.bitmaps.set(FEATHERS, bitmap);
  }

  private async fetchSheet(image: string, fallback: string) {
    for (const file of [image, fallback]) {
      try {
        const response = await fetch(this.base + file);
        if (response.ok) return await createImageBitmap(await response.blob());
      } catch {
        // Try the next one.
      }
    }
    return null;
  }

  private readMasks(name: BirdAnim, bitmap: ImageBitmap): FrameMask[] {
    const { frameWidth, frameHeight, frames } = this.atlas.animations[name];
    const cell = frameWidth / GRID;
    const rows = Math.ceil(frameHeight / cell);
    const canvas = document.createElement('canvas');
    canvas.width = GRID * frames;
    canvas.height = rows;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const masks: FrameMask[] = [];
    for (let f = 0; f < frames; f += 1) {
      const cells: number[] = [];
      let left = frameWidth;
      let top = frameHeight;
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < GRID; x += 1) {
          if (data[(y * canvas.width + f * GRID + x) * 4 + 3] <= 100) continue;
          const px = (x + 0.5) * cell;
          const py = (y + 0.5) * cell;
          cells.push(px, py);
          left = Math.min(left, px - cell / 2);
          right = Math.max(right, px + cell / 2);
          top = Math.min(top, py - cell / 2);
          bottom = Math.max(bottom, py + cell / 2);
        }
      }
      masks.push({ cells, count: cells.length / 2, bounds: { left, top, right, bottom } });
    }
    return masks;
  }

  /** Where the ink of a frame is, in sheet pixels. */
  bounds(name: BirdAnim, frame: number) {
    return this.masks.get(name)?.[frame - 1]?.bounds ?? null;
  }

  /** The eye of a frame, or the anchor where the eye is closed or turned away. */
  eyeOr(name: BirdAnim, frame: number) {
    const animation = this.atlas.animations[name];
    const eye = animation.eye[frame - 1];
    return eye ? { x: eye[0], y: eye[1] } : { x: animation.anchor.x, y: animation.anchor.y };
  }

  /**
   * How much two frames share, 0 to 1, with both pinned on their anchors or on their eyes. Worked out
   * the first time a pair is needed and kept, since the bird only ever uses a small part of the
   * 23,000 possible pairs.
   */
  overlap(a: FrameRef, b: FrameRef, pinned: 'anchor' | 'eye') {
    if (a.anim === b.anim && a.frame === b.frame && a.flip === b.flip) return 1;
    const key = `${a.anim}${a.frame}${a.flip}|${b.anim}${b.frame}${b.flip}|${pinned}`;
    const known = this.overlaps.get(key);
    if (known !== undefined) return known;
    const maskA = this.masks.get(a.anim)?.[a.frame - 1];
    const maskB = this.masks.get(b.anim)?.[b.frame - 1];
    if (!maskA || !maskB) return 0;
    const animationB = this.atlas.animations[b.anim];
    const pinOf = (ref: FrameRef) => (pinned === 'eye' ? this.eyeOr(ref.anim, ref.frame) : this.atlas.animations[ref.anim].anchor);
    const pinA = pinOf(a);
    const pinB = pinOf(b);
    const cellB = animationB.frameWidth / GRID;
    const taken = new Set<number>();
    for (let i = 0; i < maskB.cells.length; i += 2) {
      const x = Math.floor(maskB.cells[i] / cellB);
      const y = Math.floor(maskB.cells[i + 1] / cellB);
      taken.add(y * 1000 + x);
    }
    let shared = 0;
    const sign = a.flip === b.flip ? 1 : -1;
    for (let i = 0; i < maskA.cells.length; i += 2) {
      const x = Math.floor((pinB.x + sign * (maskA.cells[i] - pinA.x)) / cellB);
      const y = Math.floor((pinB.y + (maskA.cells[i + 1] - pinA.y)) / cellB);
      if (x >= 0 && y >= 0 && taken.has(y * 1000 + x)) shared += 1;
    }
    const value = shared / Math.max(1, maskA.count + maskB.count - shared);
    this.overlaps.set(key, value);
    return value;
  }

  dispose() {
    this.closed = true;
    this.bitmaps.forEach((bitmap) => bitmap.close());
    this.bitmaps.clear();
  }
}

export async function loadBirdAtlas(compact: boolean) {
  const base = compact ? `${BASE}mobile/` : BASE;
  const response = await fetch(`${base}bird-atlas.json`);
  const atlas = (await response.json()) as BirdAtlas;
  return new BirdSheets(atlas, base);
}
