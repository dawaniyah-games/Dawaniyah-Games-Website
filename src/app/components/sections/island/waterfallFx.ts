/**
 * The waterfall from the island's lip down to the hero's bottom edge, and its splash there. Plain
 * canvas 2D. Ported from design-handoff/island/waterfall-edge/prototype.html; the numbers are
 * waterfall-edge.json. Lengths are art pixels of the island, so everything scales with it, and times
 * are seconds.
 */
import type { WaterfallEnds, WaterfallPoint } from './waterfallEnd';

export const WATERFALL = {
  handoff: { fadeFrom: 1660, fadeTo: 1806, top: { y: 1660, x: [371, 514] }, bottom: { y: 1793, x: [368, 498] } },
  column: {
    widenAtEdge: 0.12,
    scroll: 300,
    stretch: 220,
    alpha: 0.92,
    thinAtEdge: 0.72,
    band: 10,
    layerB: { speed: 1.35, alpha: 0.45 },
    // Fully in within this share of the painted fall's fade, so the two never thin out together.
    fadeInShare: 0.35,
    // Soft sides, as a share of the fall's width on each side.
    feather: 0.1,
  },
  fall: { v0: [300, 420], gravity: 2600 },
  streaks: { rate: 110, cap: 80, width: [1.4, 3], len: [0.03, 10, 70], alpha: [0.3, 0.75] },
  sideDrops: { rate: 9, cap: 14, vx: [20, 70], r: [2, 3.6] },
  splash: {
    chance: 0.85,
    perHit: [1, 3],
    vy: [300, 820],
    boostChance: 0.14,
    boost: 1.5,
    vx: [220, 640],
    vxJitter: 80,
    gravity: 2600,
    r: [2.6, 5.5],
    trail: 0.03,
    cap: 110,
    life: 1.4,
    beadChance: 0.4,
  },
  spray: { rate: 70, cap: 60, vy: [150, 420], vx: 220, r: [1.2, 2.2], life: [0.25, 0.5] },
  sheets: { rate: 24, cap: 30, vx: [180, 620], drag: 2.4, life: [0.5, 1], width: 3.2, trail: 0.1 },
  foam: { width: 3.2, height: 0.55, pulse: 0.07, period: 0.9, alpha: 1 },
  sheen: { width: 10, height: 9, alpha: 0.75, pulse: 0.2, period: 2.2 },
  mist: { rate: 5, cap: 10, size: [1.4, 3.2], rise: [20, 60], drift: 34, life: [1.6, 2.4], alpha: 0.32 },
  squares: { rate: 1.2, cap: 6, size: [7, 11], vx: [60, 180], vy: [320, 620], gravity: 1600, life: [1, 1.5] },
  glow: { width: 7, alpha: 0.38, pulse: 0.08, period: 3.1 },
  drips: { rate: 5, cap: 10, spread: 1.6, vy: [30, 90], gravity: 1800, fall: [160, 320], r: [3, 4.6] },
  spill: 300,
  minEdge: 8, // art px of fall below the island; less than this and nothing is drawn
  minCss: { line: 0.8, drop: 1.1, square: 3, sheen: 2.5 },
  lite: { below: 640, factor: 0.45 },
  colors: { white: '255,255,255', pale: '185,233,242', teal: '99,199,222', lavender: '201,182,242' },
};
const C = WATERFALL;

const TAU = 6.283;
const MAX_DPR = 2;
const SIDE_ROOM = 6; // the canvas reaches this many fall widths either side of the fall
const TOP_ROOM = 40;

export interface WaterfallSprites {
  column: HTMLImageElement;
  foam: HTMLImageElement;
  sheen: HTMLImageElement;
  glow: HTMLImageElement;
  mist: HTMLImageElement;
  square: HTMLImageElement;
}

interface FxOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  /** The hand-over points in host pixels, or null while the island is not ready. */
  read: () => WaterfallEnds | null;
  /** The y of the hero's bottom edge in host pixels. */
  edge: () => number;
  sprites: WaterfallSprites;
  reduced: boolean;
}

type Tone = 'white' | 'pale' | 'teal' | 'lavender';
type Tinted = 'white' | 'pale' | 'lavender';
type Range = number[];

interface Geometry {
  s: number; // CSS px per art px
  cx: number;
  cy: number;
  edgeY: number;
  yEdge: number; // from here on, art px with the origin at the painted fall's foot
  yStart: number;
  xTop: number;
  wTop: number;
  wBottom: number;
}

interface Streak { x: number; y: number; vy: number; w: number; a: number; tone: Tone; phase: number }
interface SideDrop { x: number; y: number; vx: number; vy: number; r: number }
interface Splash { x: number; y: number; vx: number; vy: number; r: number; age: number; life: number; tone: Tone }
interface Sheet { x: number; vx: number; age: number; life: number; w: number }
interface Mist { x: number; y: number; vx: number; vy: number; age: number; life: number; tone: Tone }
interface Square { x: number; y: number; vx: number; vy: number; size: number; spin: number; age: number; life: number; tone: Tinted }
interface Drip { x: number; y: number; vy: number; fall: number; r: number }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (range: Range) => range[0] + Math.random() * (range[1] - range[0]);

/** White reads on the night and teal on the light sky, so the splash mixes them. */
const pickTone = (): Tone => {
  const r = Math.random();
  return r < 0.6 ? 'white' : r < 0.9 ? 'pale' : 'teal';
};

function flippedCopy(img: HTMLImageElement | HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(img.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function tintedCopy(img: HTMLImageElement, rgb: string) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export class WaterfallEdgeFx {
  private canvas: HTMLCanvasElement;
  private host: HTMLElement;
  private read: FxOptions['read'];
  private edge: FxOptions['edge'];
  private sprites: WaterfallSprites;
  private ctx: CanvasRenderingContext2D;
  private buffer = document.createElement('canvas');
  private bctx: CanvasRenderingContext2D;
  private scaledTiles: { width: number; height: number; tile: HTMLCanvasElement; flipped: HTMLCanvasElement } | null = null;
  private tinted: Record<Tinted, HTMLCanvasElement>;

  private time = 0;
  private scroll = 0;
  private dpr = 1;
  private box = { left: 0, top: 0, width: 0, height: 0 };
  private streaks: Streak[] = [];
  private side: SideDrop[] = [];
  private splash: Splash[] = [];
  private spray: Splash[] = [];
  private sheets: Sheet[] = [];
  private mist: Mist[] = [];
  private squares: Square[] = [];
  private drips: Drip[] = [];
  private budget: Record<string, number> = {};
  private running = false;
  private raf = 0;

  reduced: boolean;

  constructor({ canvas, host, read, edge, sprites, reduced }: FxOptions) {
    this.canvas = canvas;
    this.host = host;
    this.read = read;
    this.edge = edge;
    this.sprites = sprites;
    this.reduced = reduced;
    this.ctx = canvas.getContext('2d')!;
    this.bctx = this.buffer.getContext('2d')!;
    this.tinted = {
      white: tintedCopy(sprites.square, C.colors.white),
      pale: tintedCopy(sprites.square, C.colors.pale),
      lavender: tintedCopy(sprites.square, C.colors.lavender),
    };
  }

  /** Where the fall is this frame, and its local frame: art px, origin at the painted fall's foot. */
  private frameGeometry(): Geometry | null {
    const ends = this.read();
    if (!ends) return null;
    const { tl, tr, bl, br } = ends;
    const bottomArt = C.handoff.bottom.x[1] - C.handoff.bottom.x[0];
    const topArt = C.handoff.top.x[1] - C.handoff.top.x[0];
    const s = Math.hypot(br.x - bl.x, br.y - bl.y) / bottomArt;
    if (!(s > 0)) return null;
    const cx = (bl.x + br.x) / 2;
    const cy = (bl.y + br.y) / 2;
    const edgeY = this.edge();
    return {
      s,
      cx,
      cy,
      edgeY,
      yEdge: (edgeY - cy) / s,
      yStart: ((tl.y + tr.y) / 2 - cy) / s,
      xTop: ((tl.x + tr.x) / 2 - cx) / s,
      wTop: Math.hypot(tr.x - tl.x, tr.y - tl.y) / s || topArt,
      wBottom: bottomArt,
    };
  }

  private place(g: Geometry) {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const half = SIDE_ROOM * g.wBottom * g.s;
    const top = Math.floor(g.cy + (g.yStart - TOP_ROOM) * g.s);
    // Kept inside the host, so the canvas never makes the page wider.
    const left = Math.max(0, Math.round(g.cx - half));
    const right = Math.min(this.host.clientWidth, Math.round(g.cx + half));
    const width = Math.max(1, right - left);
    const height = Math.ceil(g.edgeY + C.spill * g.s - top);
    const { box } = this;
    if (Math.abs(width - box.width) > 2 || Math.abs(height - box.height) > 2 || dpr !== this.dpr) {
      this.dpr = dpr;
      box.width = width;
      box.height = height;
      for (const c of [this.canvas, this.buffer]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    if (left !== box.left || top !== box.top) {
      box.left = left;
      box.top = top;
      this.canvas.style.transform = `translate(${left}px, ${top}px)`;
    }
  }

  private widthAt(g: Geometry, y: number) {
    if (y <= 0) return lerp(g.wTop, g.wBottom, Math.min(1, Math.max(0, (y - g.yStart) / -g.yStart)));
    return g.wBottom * (1 + C.column.widenAtEdge * Math.min(1, y / Math.max(1, g.yEdge)));
  }

  private centerAt(g: Geometry, y: number) {
    return y <= 0 ? lerp(g.xTop, 0, Math.min(1, Math.max(0, (y - g.yStart) / -g.yStart))) : 0;
  }

  private fallSpeed(g: Geometry, y: number) {
    const v0 = (C.fall.v0[0] + C.fall.v0[1]) / 2;
    return Math.sqrt(v0 * v0 + 2 * C.fall.gravity * Math.max(0, y - g.yStart));
  }

  /** The column and its streaks come in over the top of the painted fall's fade, quicker than it goes. */
  private fadeIn(y: number) {
    const from = C.handoff.fadeFrom - C.handoff.bottom.y;
    const to = C.handoff.fadeTo - C.handoff.bottom.y;
    return smooth(from, lerp(from, to, C.column.fadeInShare), y);
  }

  private spawn<T>(name: string, cfg: { rate: number; cap: number }, list: T[], dt: number, lite: number, make: () => T) {
    this.budget[name] = (this.budget[name] ?? 0) + cfg.rate * lite * dt;
    while (this.budget[name] >= 1) {
      this.budget[name] -= 1;
      if (list.length < Math.ceil(cfg.cap * lite)) list.push(make());
    }
  }

  private hitEdge(g: Geometry, lite: number, x: number, speed: number) {
    if (Math.random() > C.splash.chance) return;
    const n = Math.round(rnd(C.splash.perHit));
    for (let i = 0; i < n && this.splash.length < C.splash.cap * lite; i += 1) {
      const raw = x / (g.wBottom / 2);
      const out = Math.sign(raw || Math.random() - 0.5) * Math.max(0.35, Math.min(1, Math.abs(raw)));
      const boost = Math.random() < C.splash.boostChance ? C.splash.boost : 1;
      this.splash.push({
        x: x + (Math.random() - 0.5) * 6,
        y: g.yEdge - 1,
        vx: out * rnd(C.splash.vx) + (Math.random() - 0.5) * 2 * C.splash.vxJitter,
        vy: -rnd(C.splash.vy) * boost * Math.min(1, speed / 1200 + 0.35),
        r: rnd(C.splash.r),
        age: 0,
        life: C.splash.life,
        tone: pickTone(),
      });
    }
  }

  private step(dt: number, g: Geometry) {
    this.time += dt;
    this.scroll += C.column.scroll * dt;
    const lite = window.innerWidth < C.lite.below ? C.lite.factor : 1;

    // The falling water.
    this.spawn('streaks', C.streaks, this.streaks, dt, lite, () => {
      const y = rnd([g.yStart + 10, Math.min(-6, g.yEdge * 0.2)]);
      const pick = Math.random();
      return {
        x: this.centerAt(g, y) + (Math.random() - 0.5) * 0.84 * this.widthAt(g, y),
        y,
        vy: rnd(C.fall.v0),
        w: rnd(C.streaks.width),
        a: rnd(C.streaks.alpha),
        tone: pick < 0.7 ? 'white' : pick < 0.96 ? 'pale' : 'teal',
        phase: Math.random() * TAU,
      };
    });
    for (const s of this.streaks) {
      s.vy += C.fall.gravity * dt;
      s.y += s.vy * dt;
      s.x += Math.sin(this.time * 6 + s.phase) * 3 * dt;
    }
    this.streaks = this.streaks.filter((s) => {
      if (s.y < g.yEdge) return true;
      this.hitEdge(g, lite, s.x, s.vy);
      return false;
    });

    if (g.yEdge > 60) {
      this.spawn('sideDrops', C.sideDrops, this.side, dt, lite, () => {
        const y = rnd([0.15 * g.yEdge, 0.85 * g.yEdge]);
        const side = Math.random() < 0.5 ? -1 : 1;
        return { x: side * (this.widthAt(g, y) / 2 + 2), y, vx: side * rnd(C.sideDrops.vx), vy: this.fallSpeed(g, y), r: rnd(C.sideDrops.r) };
      });
    }
    for (const d of this.side) {
      d.vy += C.fall.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    this.side = this.side.filter((d) => {
      if (d.y < g.yEdge) return true;
      this.hitEdge(g, lite, d.x, d.vy * 0.6);
      return false;
    });

    // The splash: drops thrown up and out, falling back onto the edge.
    for (const d of this.splash) {
      d.age += dt;
      d.vy += C.splash.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    this.splash = this.splash.filter((d) => {
      if (d.age > d.life) return false;
      if (d.vy > 0 && d.y >= g.yEdge) {
        if (Math.random() < C.splash.beadChance && this.sheets.length < C.sheets.cap * lite) {
          this.sheets.push({ x: d.x, vx: Math.sign(d.vx || 1) * rnd([80, 220]), age: 0, life: rnd([0.3, 0.6]), w: 0.7 });
        }
        return false;
      }
      return true;
    });

    // Fine spray right above the impact.
    this.spawn('spray', C.spray, this.spray, dt, lite, () => ({
      x: (Math.random() - 0.5) * g.wBottom * 1.1,
      y: g.yEdge - 1,
      vx: (Math.random() - 0.5) * 2 * C.spray.vx,
      vy: -rnd(C.spray.vy),
      r: rnd(C.spray.r),
      age: 0,
      life: rnd(C.spray.life),
      tone: pickTone(),
    }));
    for (const d of this.spray) {
      d.age += dt;
      d.vy += C.splash.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    this.spray = this.spray.filter((d) => d.age < d.life && !(d.vy > 0 && d.y > g.yEdge));

    // Water running along the edge, both ways.
    this.spawn('sheets', C.sheets, this.sheets, dt, lite, () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      return { x: side * rnd([0.2, 0.6]) * g.wBottom, vx: side * rnd(C.sheets.vx), age: 0, life: rnd(C.sheets.life), w: 1 };
    });
    for (const s of this.sheets) {
      s.age += dt;
      s.x += s.vx * dt;
      s.vx *= Math.exp(-C.sheets.drag * dt);
    }
    this.sheets = this.sheets.filter((s) => s.age < s.life);

    this.spawn('mist', C.mist, this.mist, dt, lite, () => ({
      x: (Math.random() - 0.5) * g.wBottom,
      y: g.yEdge - rnd([0, 20]),
      vx: (Math.random() - 0.5) * 2 * C.mist.drift,
      vy: -rnd(C.mist.rise),
      age: 0,
      life: rnd(C.mist.life),
      tone: Math.random() < 0.5 ? 'pale' : 'white',
    }));
    for (const m of this.mist) {
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
    this.mist = this.mist.filter((m) => m.age < m.life);

    this.spawn('squares', C.squares, this.squares, dt, lite, () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const tones: Tinted[] = ['white', 'pale', 'lavender'];
      return {
        x: side * rnd([0, 0.4]) * g.wBottom,
        y: g.yEdge - 2,
        vx: side * rnd(C.squares.vx),
        vy: -rnd(C.squares.vy),
        size: rnd(C.squares.size),
        spin: (Math.random() - 0.5) * 6,
        age: 0,
        life: rnd(C.squares.life),
        tone: tones[Math.floor(Math.random() * 3)],
      };
    });
    for (const q of this.squares) {
      q.age += dt;
      q.vy += C.squares.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    this.squares = this.squares.filter((q) => q.age < q.life);

    // Drips over the edge, onto the night section.
    this.spawn('drips', C.drips, this.drips, dt, lite, () => ({
      x: (Math.random() - 0.5) * 2 * C.drips.spread * g.wBottom * 0.6,
      y: g.yEdge + 1,
      vy: rnd(C.drips.vy),
      fall: rnd(C.drips.fall),
      r: rnd(C.drips.r),
    }));
    for (const d of this.drips) {
      d.vy += C.drips.gravity * dt;
      d.y += d.vy * dt;
    }
    this.drips = this.drips.filter((d) => d.y - g.yEdge < d.fall);
  }

  /**
   * The tile at the size it is drawn on screen, with soft sides, and its mirror image. Drawing it
   * at about one texel per device pixel keeps the fine strands from shimmering into a mesh.
   */
  private columnTiles(widthPx: number) {
    const cached = this.scaledTiles;
    if (cached && Math.abs(cached.width - widthPx) < 1) return cached;
    const source = this.sprites.column;
    const width = Math.max(4, Math.round(widthPx));
    const height = Math.max(4, Math.round((source.height * width) / source.width));
    // Halve in steps for a clean downscale, then land on the exact size.
    let step: CanvasImageSource = source;
    let w = source.width;
    let h = source.height;
    while (w / 2 >= width) {
      const half = document.createElement('canvas');
      half.width = Math.round(w / 2);
      half.height = Math.round(h / 2);
      const hctx = half.getContext('2d')!;
      hctx.imageSmoothingQuality = 'high';
      hctx.drawImage(step, 0, 0, half.width, half.height);
      step = half;
      w = half.width;
      h = half.height;
    }
    const tile = document.createElement('canvas');
    tile.width = width;
    tile.height = height;
    const tctx = tile.getContext('2d')!;
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(step, 0, 0, width, height);
    // Soft sides, like the painted fall's.
    const soft = C.column.feather;
    const sides = tctx.createLinearGradient(0, 0, width, 0);
    sides.addColorStop(0, 'rgba(0,0,0,0)');
    sides.addColorStop(soft, 'rgba(0,0,0,1)');
    sides.addColorStop(1 - soft, 'rgba(0,0,0,1)');
    sides.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.globalCompositeOperation = 'destination-in';
    tctx.fillStyle = sides;
    tctx.fillRect(0, 0, width, height);
    this.scaledTiles = { width, height, tile, flipped: flippedCopy(tile) };
    return this.scaledTiles;
  }

  /** The column: the tile scrolled down, stretched further down so the water speeds up as it falls. */
  private drawColumn(g: Geometry, X: (x: number) => number, Y: (y: number) => number, edgeCanvasY: number) {
    const { ctx, box, dpr } = this;
    const b = this.bctx;
    const s = g.s;
    const { tile, flipped, width: tileW, height: tileH } = this.columnTiles(g.wBottom * s * dpr);
    // Bands are placed in device pixels, edge to edge, so they never overlap into lines.
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.buffer.width, this.buffer.height);
    const texel = g.wBottom / tileW; // art px per texel
    const L = C.column.stretch;
    const gOf = (y: number) => L * Math.log(1 + Math.max(0, y - g.yStart) / L);
    const band = C.column.band;
    const layers: [CanvasImageSource, number, number, number][] = this.reduced
      ? [[tile, 1, 1, 0]]
      : [
          [tile, 1, 1, 0],
          [flipped, C.column.layerB.speed, C.column.layerB.alpha, tileH / 2],
        ];
    for (const [img, speed, alpha, offset] of layers) {
      b.globalAlpha = alpha;
      for (let y = g.yStart; y < g.yEdge; y += band) {
        const y2 = Math.min(g.yEdge + 1, y + band);
        const w = this.widthAt(g, (y + y2) / 2);
        const xc = this.centerAt(g, (y + y2) / 2);
        let sy = ((gOf(y) - this.scroll * speed) / texel + offset) % tileH;
        if (sy < 0) sy += tileH;
        const sh = Math.max(0.5, (gOf(y2) - gOf(y)) / texel);
        const dx = X(xc - w / 2) * dpr;
        const dw = w * s * dpr;
        const dy = Math.round(Y(y) * dpr);
        const dh = Math.round(Y(y2) * dpr) - dy;
        if (dh <= 0) continue;
        if (sy + sh <= tileH) {
          b.drawImage(img, 0, sy, tileW, sh, dx, dy, dw, dh);
        } else {
          const first = tileH - sy;
          const split = Math.round(dh * (first / sh));
          if (split > 0) b.drawImage(img, 0, sy, tileW, first, dx, dy, dw, split);
          if (dh - split > 0) b.drawImage(img, 0, 0, tileW, sh - first, dx, dy + split, dw, dh - split);
        }
      }
    }
    b.globalAlpha = 1;
    b.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fade in where the painted fall fades out, and thin a little towards the edge.
    b.globalCompositeOperation = 'destination-in';
    const top = Y(g.yStart);
    const span = Math.max(1, edgeCanvasY - top);
    const grad = b.createLinearGradient(0, top, 0, edgeCanvasY);
    const stop = (y: number, a: number) => grad.addColorStop(Math.min(1, Math.max(0, (Y(y) - top) / span)), `rgba(0,0,0,${a})`);
    const f0 = C.handoff.fadeFrom - C.handoff.bottom.y;
    const f1 = C.handoff.fadeTo - C.handoff.bottom.y;
    const fullAt = lerp(f0, f1, C.column.fadeInShare);
    for (let i = 0; i <= 8; i += 1) {
      const y = i < 8 ? lerp(f0, fullAt, i / 7) : f1;
      if (y < g.yEdge) stop(y, this.fadeIn(y) * lerp(1, C.column.thinAtEdge, Math.max(0, y) / g.yEdge));
    }
    stop(g.yEdge, C.column.thinAtEdge);
    b.fillStyle = grad;
    b.fillRect(0, 0, box.width, box.height);
    b.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = C.column.alpha;
    ctx.drawImage(this.buffer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private draw(g: Geometry) {
    const { ctx, box, sprites, dpr } = this;
    const s = g.s;
    const X = (x: number) => g.cx - box.left + x * s;
    const Y = (y: number) => g.cy - box.top + y * s;
    const edgeCanvasY = Y(g.yEdge);
    const px = (art: number, min: number) => Math.max(art * s, min);
    const t = this.time;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    if (g.yEdge < C.minEdge) return;

    // 1. Light on the night section, under the splash.
    const gw = C.glow.width * g.wBottom * s;
    const gh = gw * (sprites.glow.height / sprites.glow.width);
    ctx.globalAlpha = C.glow.alpha + C.glow.pulse * Math.sin((TAU * t) / C.glow.period);
    ctx.drawImage(sprites.glow, X(0) - gw / 2, edgeCanvasY, gw, gh);

    // 2. Drips running off the edge.
    ctx.lineCap = 'round';
    for (const d of this.drips) {
      const k = (d.y - g.yEdge) / d.fall;
      ctx.globalAlpha = 0.9 * (1 - k);
      ctx.strokeStyle = `rgb(${C.colors.pale})`;
      ctx.lineWidth = px(d.r * 2, C.minCss.drop * 2);
      ctx.beginPath();
      ctx.moveTo(X(d.x), Y(d.y - Math.min(14, d.vy * 0.02)));
      ctx.lineTo(X(d.x), Y(d.y));
      ctx.stroke();
    }

    // 3. Mist behind the water.
    for (const m of this.mist) {
      const k = m.age / m.life;
      const size = lerp(C.mist.size[0], C.mist.size[1], k) * g.wBottom * s;
      ctx.globalAlpha = C.mist.alpha * Math.sin(Math.PI * k);
      ctx.drawImage(sprites.mist, X(m.x) - size / 2, Y(m.y) - size * 0.36, size, size * 0.72);
    }

    // 4. The column, and 5. the streaks and side drops: all cut off exactly at the edge.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, box.width, edgeCanvasY);
    ctx.clip();
    this.drawColumn(g, X, Y, edgeCanvasY);
    for (const st of this.streaks) {
      const len = Math.min(C.streaks.len[2], Math.max(C.streaks.len[1], st.vy * C.streaks.len[0]));
      ctx.globalAlpha = st.a * this.fadeIn(st.y);
      ctx.strokeStyle = `rgb(${C.colors[st.tone]})`;
      ctx.lineWidth = px(st.w, C.minCss.line);
      ctx.beginPath();
      ctx.moveTo(X(st.x), Y(st.y - len));
      ctx.lineTo(X(st.x), Y(st.y));
      ctx.stroke();
    }
    for (const d of this.side) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = `rgb(${C.colors.white})`;
      ctx.lineWidth = px(d.r * 2, C.minCss.drop * 2);
      ctx.beginPath();
      ctx.moveTo(X(d.x - d.vx * 0.015), Y(d.y - Math.min(30, d.vy * 0.015)));
      ctx.lineTo(X(d.x), Y(d.y));
      ctx.stroke();
    }
    ctx.restore();

    // 6. Foam where it lands, half on the sky and half on the night.
    const fw = C.foam.width * g.wBottom * (1 + C.column.widenAtEdge) * (1 + C.foam.pulse * Math.sin((TAU * t) / C.foam.period)) * s;
    const fh = C.foam.height * g.wBottom * (1 + 0.1 * Math.sin((TAU * t) / 0.7 + 1)) * s;
    ctx.globalAlpha = C.foam.alpha;
    ctx.drawImage(sprites.foam, X(0) - fw / 2, edgeCanvasY - fh / 2, fw, fh);
    ctx.globalAlpha = C.foam.alpha * 0.6;
    ctx.drawImage(sprites.foam, X(0) - fw * 0.36, edgeCanvasY - fh * 0.42, fw * 0.72, fh * 0.6);

    // 7. Splash drops: a short arc back along each drop's own curve, fainter towards its tail.
    ctx.lineCap = 'round';
    for (const d of this.splash) {
      const k = d.age / d.life;
      ctx.strokeStyle = `rgb(${C.colors[d.tone]})`;
      const tail = Math.min(C.splash.trail * 3, d.age);
      const at = (tau: number): WaterfallPoint => ({ x: d.x - d.vx * tau, y: d.y - d.vy * tau + 0.5 * C.splash.gravity * tau * tau });
      for (let i = 0; i < 3; i += 1) {
        const from = at((tail * i) / 3);
        const to = at((tail * (i + 1)) / 3);
        ctx.globalAlpha = 0.95 * Math.sqrt(Math.max(0, 1 - k)) * (1 - i / 3);
        ctx.lineWidth = px(d.r * 2 * (1 - i * 0.28), C.minCss.drop * 2 * (1 - i * 0.28));
        ctx.beginPath();
        ctx.moveTo(X(from.x), Y(from.y));
        ctx.lineTo(X(to.x), Y(to.y));
        ctx.stroke();
      }
    }

    for (const d of this.spray) {
      ctx.globalAlpha = 0.9 * (1 - d.age / d.life);
      ctx.fillStyle = `rgb(${C.colors[d.tone]})`;
      const r = px(d.r, C.minCss.drop / 2);
      ctx.fillRect(X(d.x) - r, Y(d.y) - r, r * 2, r * 2);
    }

    // 8. Sheets running along the edge.
    for (const sheet of this.sheets) {
      const k = sheet.age / sheet.life;
      const len = Math.max(6, Math.abs(sheet.vx) * C.sheets.trail);
      ctx.globalAlpha = 0.85 * (1 - k) * sheet.w;
      ctx.strokeStyle = `rgb(${C.colors.white})`;
      ctx.lineWidth = px(C.sheets.width * sheet.w, C.minCss.line);
      ctx.beginPath();
      ctx.moveTo(X(sheet.x - Math.sign(sheet.vx) * len), edgeCanvasY - px(1.2, 0.6));
      ctx.lineTo(X(sheet.x), edgeCanvasY - px(1.2, 0.6));
      ctx.stroke();
    }

    // 9. The wet line on the edge.
    const sw = C.sheen.width * g.wBottom * s;
    const shh = px(C.sheen.height, C.minCss.sheen);
    ctx.globalAlpha = C.sheen.alpha + C.sheen.pulse * Math.sin((TAU * t) / C.sheen.period);
    ctx.drawImage(sprites.sheen, X(0) - sw / 2, edgeCanvasY - shh / 2, sw, shh);

    // 10. Brand pixel squares thrown out of the splash.
    for (const q of this.squares) {
      const k = q.age / q.life;
      const size = px(q.size, C.minCss.square);
      ctx.globalAlpha = 0.9 * (1 - k);
      ctx.save();
      ctx.translate(X(q.x), Y(q.y));
      ctx.rotate(q.spin * q.age);
      ctx.drawImage(this.tinted[q.tone], -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** One frame. With dt 0 it only redraws, which is all reduced motion needs. */
  tick(dt: number) {
    const g = this.frameGeometry();
    this.canvas.style.visibility = g ? 'visible' : 'hidden';
    if (!g) return;
    this.place(g);
    if (!this.reduced) this.step(dt, g);
    this.draw(g);
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** For reduced motion switched on while the page is open: nothing left in the air. */
  clearParticles() {
    this.streaks = [];
    this.side = [];
    this.splash = [];
    this.spray = [];
    this.sheets = [];
    this.mist = [];
    this.squares = [];
    this.drips = [];
  }
}
