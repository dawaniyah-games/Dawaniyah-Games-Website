/**
 * The water rule's drawing: the wall of water over any part of the falcon inside the fall's column,
 * the mist puff of the soak, and the drops (spray, drips, the shake). Ported from film2.py. Canvas CSS
 * px; every drop size and speed is scaled by H / 121, the height the film was made at.
 */
import { FALCON_BASE, rand } from './falconAtlas';

const ISLAND_WATER = `${import.meta.env.BASE_URL}island/water/`;
const DROP_CELL = 48;
const DROP_GRAVITY = 900;
const WALL_ALPHA = 0.85;
const WALL_SPEED = 3.5; // falcon heights per second
const SOFT = 2.2; // soft sides: alpha x clamp((1 - |x|) x 2.2) across the fall
const RUN_H = 0.55; // how far the water runs down the falcon from where it lands, in heights
const FOAM_PERIOD = 0.9;

/** Where the fall lands on the falcon: slices across the fall, each with the y it lands at (or none). */
export interface Landing {
  x0: number;
  step: number;
  tops: (number | null)[];
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  cell: number;
  age: number;
}

async function bitmap(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return createImageBitmap(await response.blob());
}

export class FalconWater {
  private drops: Drop[] = [];
  private img: { drops: ImageBitmap; tile: ImageBitmap; mist: ImageBitmap; foam: ImageBitmap } | null = null;
  private pour: HTMLCanvasElement | null = null;
  private wall: { width: number; canvas: HTMLCanvasElement } | null = null;
  /** H / 121. */
  k = 1;

  async load() {
    try {
      const [drops, tile, mist, foam] = await Promise.all([
        bitmap(`${FALCON_BASE}fx/water-drops.webp`),
        bitmap(`${ISLAND_WATER}fall-column-tile-128x512.png`),
        bitmap(`${ISLAND_WATER}mist-256.png`),
        bitmap(`${ISLAND_WATER}edge-foam-256x64.png`),
      ]);
      this.img = { drops, tile, mist, foam };
    } catch {
      // Without them the falcon still soaks; it just shows no water of its own.
    }
  }

  get mistImage() {
    return this.img?.mist ?? null;
  }

  get busy() {
    return this.drops.length > 0;
  }

  clear() {
    this.drops = [];
  }

  /** Speeds in px/s at H = 121; sizes likewise. */
  spawn(x: number, y: number, vx: number, vy: number, size = rand(5, 11), life = rand(0.5, 0.9)) {
    const { k } = this;
    this.drops.push({ x, y, vx: vx * k, vy: vy * k, size: size * k, life, cell: Math.floor(Math.random() * 8), age: 0 });
  }

  /** Removed when they reach the line or their life ends. */
  step(dt: number, line: number) {
    const g = DROP_GRAVITY * this.k;
    for (const d of this.drops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += g * dt;
      d.age += dt;
    }
    this.drops = this.drops.filter((d) => d.age < d.life && d.y < line + 3);
  }

  drawDrops(ctx: CanvasRenderingContext2D) {
    const sheet = this.img?.drops;
    if (!sheet) return;
    for (const d of this.drops) {
      const s = Math.max(2, d.size);
      ctx.drawImage(sheet, d.cell * DROP_CELL, 0, DROP_CELL, DROP_CELL, d.x - s / 2, d.y - s / 2, s, s);
    }
  }

  /** The soak's mist puff: `size` wide, centred on (x, y). */
  drawMist(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
    const mist = this.img?.mist;
    if (!mist) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(mist, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  /** The tile at the fall's width in device px, with its soft sides baked in. */
  private wallTile(widthPx: number) {
    const width = Math.max(2, Math.round(widthPx));
    if (this.wall?.width === width) return this.wall.canvas;
    const tile = this.img!.tile;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.max(2, Math.round((tile.height * width) / tile.width));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
    const full = (1 - 1 / SOFT) / 2; // where (1 - |x|) x 2.2 reaches 1, as a share of the width
    const sides = ctx.createLinearGradient(0, 0, width, 0);
    sides.addColorStop(0, 'rgba(0,0,0,0)');
    sides.addColorStop(0.5 - full, 'rgba(0,0,0,1)');
    sides.addColorStop(0.5 + full, 'rgba(0,0,0,1)');
    sides.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = sides;
    ctx.fillRect(0, 0, width, canvas.height);
    this.wall = { width, canvas };
    return canvas;
  }

  /**
   * The fall landing on the falcon: in each slice of the fall's width it starts where the water hits
   * the falcon there and runs down its feathers (only over its own pixels), thinning out, scrolling
   * down at 3.5 H/s. Drawn into the falcon's layer straight after the falcon.
   */
  drawPour(ctx: CanvasRenderingContext2D, dpr: number, landing: Landing, fallW: number, time: number, H: number) {
    if (!this.img || fallW < 1) return;
    const run = RUN_H * H;
    const tile = this.wallTile(fallW * dpr);
    const th = (tile.height / tile.width) * fallW;
    const sheet = (this.pour ??= document.createElement('canvas'));
    const w = Math.max(1, Math.ceil(fallW * dpr));
    const h = Math.max(1, Math.ceil(run * dpr));
    if (sheet.width !== w || sheet.height !== h) {
      sheet.width = w;
      sheet.height = h;
    }
    const sc = sheet.getContext('2d')!;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = 'source-over';
    sc.clearRect(0, 0, w, h);
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The stream's own scroll, so the water keeps falling while the falcon moves under it.
    const offset = (time * WALL_SPEED * H) % th;
    for (let y = offset - th; y < run; y += th) sc.drawImage(tile, 0, y, fallW, th);
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = 'destination-in';
    const fade = sc.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.3, 'rgba(0,0,0,0.75)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    sc.fillStyle = fade;
    sc.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = WALL_ALPHA;
    const k = w / fallW; // sheet px per CSS px
    landing.tops.forEach((top, i) => {
      if (top === null) return;
      const sx = i * landing.step;
      ctx.drawImage(sheet, sx * k, 0, landing.step * k, h, landing.x0 + sx, top - 2, landing.step + 0.5, run);
    });
    ctx.restore();
  }

  /** Foam where the fall hits the falcon, on top of it. */
  drawFoam(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, time: number) {
    const foam = this.img?.foam;
    if (!foam) return;
    const pulse = 1 + 0.08 * Math.sin((Math.PI * 2 * time) / FOAM_PERIOD);
    const w = width * pulse;
    const h = (w * foam.height) / foam.width * 1.3;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(foam, x - w / 2, y - h * 0.55, w, h);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(foam, x - w * 0.34, y - h * 0.5, w * 0.68, h * 0.62);
    ctx.globalAlpha = 1;
  }
}
