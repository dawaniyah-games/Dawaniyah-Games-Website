/** The burst when the bird is touched. Ported from film3.py's `particles_at`, in CSS pixels. */
import { smoothstep } from './springs';

const DRAG = 2.4;
const TERMINAL = 75;
const SWAY_RATE = 3.2;
const FADE_S = 0.6;

// Cells of bird-feathers: 0 blue, 1 teal, 2 amber, 3 yellow down, 4 thin blue, 5 rust, 6 pale blue, 7 orange.
const BURST = [0, 1, 4, 6, 1, 2, 3];
const DOWN = 3;

interface Feather {
  cell: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  sway: number;
  phase: number;
  life: number;
  age: number;
}

const between = (low: number, high: number) => low + Math.random() * (high - low);

export class FeatherBurst {
  private feathers: Feather[] = [];

  get active() {
    return this.feathers.length > 0;
  }

  /** From the bird's chest, thrown the way it faces. */
  spawn(x: number, y: number, facing: 1 | -1, height: number) {
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const cell = BURST[(BURST.length - count + i) % BURST.length];
      const angle = (between(-160, -20) * Math.PI) / 180;
      const speed = between(120, 190);
      this.feathers.push({
        cell,
        x: x + facing * between(-0.11, 0.18) * height,
        y: y - between(0.5, 0.8) * height,
        vx: Math.cos(angle) * speed * facing,
        vy: Math.sin(angle) * speed,
        rot: between(0, Math.PI * 2),
        spin: (between(-90, 90) * Math.PI) / 180,
        size: cell === DOWN ? 13 : between(14, 19),
        sway: between(5, 9),
        phase: between(0, Math.PI * 2),
        life: between(1.5, 2.1),
        age: 0,
      });
    }
  }

  step(dt: number) {
    for (const feather of this.feathers) feather.age += dt;
    this.feathers = this.feathers.filter((feather) => feather.age < feather.life);
  }

  draw(ctx: CanvasRenderingContext2D, sheet: ImageBitmap, cell: number) {
    for (const f of this.feathers) {
      const t = f.age;
      const drag = 1 - Math.exp(-DRAG * t);
      const wave = SWAY_RATE * t + f.phase;
      const x = f.x + (f.vx / DRAG) * drag + f.sway * Math.sin(wave) * smoothstep(t / 0.5);
      const y = f.y + ((f.vy - TERMINAL) / DRAG) * drag + TERMINAL * t;
      const rot = f.rot + f.spin * t + ((25 * Math.PI) / 180) * Math.sin(wave);
      ctx.save();
      ctx.globalAlpha = 1 - smoothstep((t - (f.life - FADE_S)) / FADE_S);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(sheet, f.cell * cell, 0, cell, cell, -f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }
  }
}
