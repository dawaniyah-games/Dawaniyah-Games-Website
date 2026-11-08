/**
 * The knock's glass: the crack, the flash and the shards, on a canvas fixed over the viewport (under
 * the navbar), made on the first knock and hidden again once the crack has faded. It runs its own
 * short loop while anything is showing, so a crack never freezes on screen if the line scrolls away.
 * Ported from film2.py. Viewport CSS px and seconds.
 */
import { FALCON_BASE, rand, smooth } from './falconAtlas';

const HOLD_S = 1.4; // after the second hit
const FADE_S = 1.4;
const LONE_HOLD_S = 3; // when the second hit never came
const POP_S = 0.08;
const FLASH_S = 0.15;
const FLASH_PX = 260;
const JITTER_PX = 3;
const JITTER_S = 0.18;
const SHARD_CELL = 96;
const SHARD_GRAVITY = 1100;
const PHONE = 768;

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  cell: number;
  age: number;
  spin: number;
  angle: number;
}

async function bitmap(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return createImageBitmap(await response.blob());
}

export class GlassCrack {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private img: { cracks: [ImageBitmap, ImageBitmap]; shards: ImageBitmap; flash: ImageBitmap } | null = null;
  private loading: Promise<void> | null = null;
  private level: 0 | 1 | 2 = 0;
  private at: [number, number] = [0, 0];
  private hitTime = -Infinity;
  private fadeFrom = Infinity;
  private fadeCalled = false;
  private shards: Shard[] = [];
  private time = 0;
  private ticks = 0;
  private raf = 0;
  private last = 0;
  private dpr = 1;

  /** Called once when the crack starts to fade, with where it is. */
  constructor(private onFade: (x: number) => void) {}

  /** The glass images come last of everything, or on the first hover near the falcon. */
  load() {
    this.loading ??= Promise.all([
      bitmap(`${FALCON_BASE}fx/glass-crack-1.webp`),
      bitmap(`${FALCON_BASE}fx/glass-crack-2.webp`),
      bitmap(`${FALCON_BASE}fx/glass-shards.webp`),
      bitmap(`${import.meta.env.BASE_URL}island/water/mist-256.png`),
    ])
      .then(([c1, c2, shards, flash]) => {
        this.img = { cracks: [c1, c2], shards, flash };
      })
      .catch(() => {
        // A knock without its glass is still a knock.
      });
    return this.loading;
  }

  get active() {
    return this.raf !== 0;
  }

  /** ±3 px, alternating every tick, decaying over 180 ms. For the falcon too; never the page. */
  jitter(tick: number) {
    const since = this.time - this.hitTime;
    if (since < 0 || since >= JITTER_S) return 0;
    return JITTER_PX * (1 - since / JITTER_S) * (tick % 2 ? 1 : -1);
  }

  /** A beak hit at (x, y) in viewport px. */
  hit(crack: 1 | 2, x: number, y: number) {
    if (!this.img) return;
    this.ensureCanvas();
    this.level = crack;
    this.at = [x, y];
    this.hitTime = this.time;
    this.fadeFrom = this.time + (crack === 2 ? HOLD_S : LONE_HOLD_S);
    this.fadeCalled = false;
    for (let i = 0; i < (crack === 1 ? 6 : 12); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(80, 260);
      this.shards.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120,
        size: rand(14, 30),
        life: rand(1.0, 1.6),
        cell: Math.floor(Math.random() * 8),
        age: 0,
        spin: rand(-400, 400),
        angle: rand(0, 360),
      });
    }
    this.run();
  }

  private ensureCanvas() {
    if (this.canvas) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '45', pointerEvents: 'none' });
    document.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  private size() {
    const { canvas } = this;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.dpr = dpr;
  }

  private run() {
    if (this.raf) return;
    this.canvas!.style.display = 'block';
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.frame(dt)) this.raf = requestAnimationFrame(loop);
      else this.stop();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.level = 0;
    this.shards = [];
    if (this.canvas && this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.style.display = 'none';
    }
  }

  /** One tick. False when nothing is left to show. */
  private frame(dt: number) {
    const { ctx, img } = this;
    if (!ctx || !img) return false;
    this.time += dt;
    this.ticks += 1;
    this.size();
    const { dpr, time } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    if (this.level) {
      if (time >= this.fadeFrom && !this.fadeCalled) {
        this.fadeCalled = true;
        this.onFade(this.at[0]);
      }
      const alpha = time < this.fadeFrom ? 1 : Math.max(0, 1 - (time - this.fadeFrom) / FADE_S);
      if (alpha <= 0) this.level = 0;
      else {
        const since = time - this.hitTime;
        const vw = window.innerWidth;
        const base = vw < PHONE ? 0.8 * vw : 0.55 * Math.min(vw, window.innerHeight);
        const size = base * (0.94 + 0.06 * smooth(since / POP_S));
        const [cx, cy] = this.at;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img.cracks[this.level - 1], cx - size / 2 + this.jitter(this.ticks), cy - size / 2, size, size);
        if (since < FLASH_S) {
          ctx.globalAlpha = 0.5 * (1 - since / FLASH_S);
          ctx.drawImage(img.flash, cx - FLASH_PX / 2, cy - FLASH_PX / 2, FLASH_PX, FLASH_PX);
        }
      }
    }

    for (const s of this.shards) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += SHARD_GRAVITY * dt;
      s.age += dt;
      s.angle += s.spin * dt;
    }
    this.shards = this.shards.filter((s) => s.age < s.life && s.y < window.innerHeight + 40);
    for (const s of this.shards) {
      ctx.globalAlpha = Math.max(0, 1 - s.age / s.life);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((-s.angle * Math.PI) / 180);
      ctx.drawImage(img.shards, s.cell * SHARD_CELL, 0, SHARD_CELL, SHARD_CELL, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return this.level > 0 || this.shards.length > 0;
  }

  dispose() {
    this.stop();
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
