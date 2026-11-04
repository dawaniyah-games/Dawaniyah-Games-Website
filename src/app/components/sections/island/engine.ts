/**
 * The animated island hero: its asset loading and everything that happens on it. Timings and
 * positions come from scene.json and the Figma motion spec (section 08), in art pixels on the
 * 2408x1806 artboard.
 *
 * This file only decides what is where. stage.ts draws it, one three.js scene seen by one camera,
 * and is loaded separately so three.js stays out of the main bundle.
 */
import type { IslandStage } from './stage';
import { DIE_IMPACTS, DIE_LAND_MS, throwPosition } from './dieThrow';
import scene from './scene.json';

export type Layer = (typeof scene.layers)[number] & { pivot?: number[]; anim?: string; role?: string };
export type Point = [number, number];

const BASE = `${import.meta.env.BASE_URL}island/`;
export const LAYERS = (scene.layers as Layer[]).filter((layer) => layer.id !== 'sky_backdrop');
export const byId = (id: string) => LAYERS.find((layer) => layer.id === id)!;

/** The art rectangle the canvas covers: the artboard plus room for the turn, crowns and mist. */
export const VIEW = { x: -190, y: -350, w: 2790, h: 2340 };
export const ARTBOARD = scene.artboard;

const BOB_PX = 6;
const BOB_PERIOD = 7;

// The camera: pointer orbit, slow idle orbit, and what scrolling through the hero does to it.
const ORBIT_YAW = (6 * Math.PI) / 180;
const ORBIT_PITCH = (3.5 * Math.PI) / 180;
const ORBIT_SETTLE_S = 0.35;
const IDLE_ORBIT = (1.5 * Math.PI) / 180;
const IDLE_PERIOD = 9;
const SCROLL_TIP = (8 * Math.PI) / 180;
const SCROLL_DOLLY = 0.12;
const SCROLL_RISE = 60;

const DIE_ART_PER_UNIT = scene.board.die.edge / 1.6;
const DIE_THROW_ANGLE = Math.PI + 0.5; // back and to the left, away from the island's edge
const DIE_THROW_SPREAD = 0.9;
const DIE_FADE_MS = 200;
const GROUND_SLANT = 0.55; // how flat the sand is drawn: sine of the angle the art looks down at it
const REDUCED_RESULT_EVERY_MS = 6000;

const SHARED_OFFSET = 14;
const NEAR_STONE = 70; // further off than this, a token is beside the stone rather than on it
const KNOCK_PX = 22;
const KNOCK_MS = 140;
const KNOCK_ARC = 14;
const WOBBLE_DEG = 10;
const WOBBLE_MS = 450;
const IMPACT_SQUASH = 0.92;
const IMPACT_SQUASH_S = 0.08;
const RECOIL_PX = 6;
const RECOIL_S = 0.26;
const LEAN_DEG = 6;
const LEAN_S = 0.8;
const COLLISION_EXTRA_GLOW_MS = 350;

type WaterKind = 'drop' | 'spray' | 'mist' | 'pixel';
const WATER_KINDS: WaterKind[] = ['drop', 'spray', 'mist', 'pixel'];
// How many of each may be alive, on desktop and on phones: 60 and 25 in all.
const WATER_CAPS: Record<WaterKind, [number, number]> = { drop: [26, 11], spray: [12, 5], mist: [14, 6], pixel: [8, 3] };
const WATER_LIFE: Record<WaterKind, [number, number]> = { drop: [0.7, 1.1], spray: [0.45, 0.8], mist: [1.2, 2], pixel: [1.4, 2] };
const DROP_GRAVITY = 900;
const SPRAY_GRAVITY = 640;

const SPRITE_FILES = {
  streak: 'water/streaks-tile-256x512.png',
  ripple: 'water/ripples-tile-256.png',
  maskFall: 'water/mask-waterfall.png',
  maskStream: 'water/mask-stream.png',
  droplet: 'water/droplet-16.png',
  foam: 'water/foam-puff-128.png',
  mist: 'water/mist-256.png',
  sparkle: 'particles/sparkle-48.png',
  depth: scene.depth.map,
};
export type SpriteName = keyof typeof SPRITE_FILES;

export interface IslandImages {
  layers: Map<string, HTMLImageElement>;
  sprites: Map<SpriteName, HTMLImageElement>;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let imagesPromise: Promise<IslandImages> | null = null;
const progressListeners = new Set<(done: number) => void>();
let lastProgress = 0;

/** Loads the island once, three.js included. The loading screen and the hero share this promise. */
export function loadIslandImages(onProgress?: (done: number) => void): Promise<IslandImages> {
  if (onProgress) {
    progressListeners.add(onProgress);
    onProgress(lastProgress);
  }
  if (imagesPromise) return imagesPromise;

  const images: IslandImages = { layers: new Map(), sprites: new Map() };
  const total = LAYERS.length + Object.keys(SPRITE_FILES).length + 1;
  let loaded = 0;
  const tick = () => {
    loaded += 1;
    lastProgress = loaded / total;
    progressListeners.forEach((listener) => listener(lastProgress));
  };

  const jobs: Promise<void>[] = [
    ...LAYERS.map(async (layer) => {
      const img = await loadImage(BASE + layer.file);
      if (img) images.layers.set(layer.id, img);
      tick();
    }),
    ...(Object.entries(SPRITE_FILES) as [SpriteName, string][]).map(async ([name, file]) => {
      const img = await loadImage(BASE + file);
      if (img) images.sprites.set(name, img);
      tick();
    }),
    import('./stage').then(tick, tick),
  ];

  imagesPromise = Promise.all(jobs).then(() => images);
  return imagesPromise;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

export interface Token {
  layer: Layer;
  footOffset: Point;
  pos: Point;
  stone: number;
  hopFrom: Point;
  hopTo: Point;
  hopT: number; // 0..1 while hopping, -1 at rest
  landedAt: number; // seconds, for the small squash on landing
  impactAt: number; // seconds, when this token last hit another one
  impactDir: Point;
  bump: Bump | null; // set while this token is recovering from being hit
  lift: number; // art pixels off the ground while knocked
  tilt: number; // degrees, pivoting at the foot
  leanAt: number; // seconds, when another token last passed over this one
  leanSign: number;
  // What the stage draws this frame.
  height: number; // art pixels above the ground
  scaleY: number;
  rotation: number; // degrees
  offset: Point;
}

interface Bump {
  at: number;
  from: Point;
  dir: Point;
  rest: Point;
  sign: number; // the way it tips first
}

export interface Particle {
  sprite: WaterKind | 'sparkle' | 'puff';
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  scale: number;
  gravity: number;
  pale: boolean; // the pale cyan one of a pair of colours
  spin: number;
}

type Phase = 'idle' | 'roll' | 'wait' | 'hop' | 'glow';

export interface DieElements {
  host: HTMLElement;
  chip: HTMLElement;
}

/** Everything the stage needs to draw one frame. */
export interface IslandFrame {
  time: number;
  bob: number;
  yaw: number;
  pitch: number;
  dolly: number;
  rise: number;
  tokens: Token[];
  particles: Particle[];
  glowStone: number;
  glowAlpha: number;
  lantern: number;
  popIndex: number;
  popScale: number;
  still: boolean;
}

export class IslandEngine {
  private lite = false;
  private stones = scene.board.stones;
  private tokens: Token[];

  private raf = 0;
  private running = false;
  private lastNow = 0;
  private time = 0; // seconds, frozen while paused so the scene resumes where it stopped

  private pointer = { x: 0, y: 0 };
  private orbit = { x: 0, y: 0, vx: 0, vy: 0 };
  private scrollProgress = 0;

  private phase: Phase = 'idle';
  private phaseMs = 0;
  private tokenTurn = 0;
  private hopsLeft = 0;
  private results: number[] = [];
  private result = 1;
  private dieLanded = false;
  private dieImpact = 0;
  private dieAngle = DIE_THROW_ANGLE;
  private glowStone = -1;
  private glowMs = 0;
  private glowExtraMs = 0;

  private particles: Particle[] = [];
  private waterBudget: Record<WaterKind, number> = { drop: 0, spray: 0, mist: 0, pixel: 0 };
  private nextSparkle = 2;
  private lanternLevel = 0.9;
  private nextFlicker = 0;
  private popIndex = -1;
  private popStart = 0;
  private nextPop = 6;

  private reducedTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private die: DieElements,
    private reduced: boolean,
    private stage: IslandStage,
  ) {
    const stoneIndex = (id: string) => this.stones.findIndex((stone) => stone.id === id);
    this.tokens = scene.loop.tokenOrder.map((id) => {
      const layer = byId(id);
      const info = scene.board.tokens[id as keyof typeof scene.board.tokens];
      return {
        layer,
        footOffset: [info.foot[0] - layer.x, info.foot[1] - layer.y] as Point,
        pos: [info.foot[0], info.foot[1]] as Point,
        stone: stoneIndex(info.startStone),
        hopFrom: [0, 0] as Point,
        hopTo: [0, 0] as Point,
        hopT: -1,
        landedAt: -10,
        impactAt: -10,
        impactDir: [0, 0] as Point,
        bump: null,
        lift: 0,
        tilt: 0,
        leanAt: -10,
        leanSign: 1,
        height: 0,
        scaleY: 1,
        rotation: 0,
        offset: [0, 0] as Point,
      };
    });
    stage.setTokens(this.tokens);
    this.resize();
  }

  /** Call when the canvas CSS size changes. */
  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.lite = width < 640;
    this.stage.resize(width, height);
    this.draw();
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  setScrollProgress(progress: number) {
    const next = clamp01(progress);
    if (next === this.scrollProgress) return;
    this.scrollProgress = next;
    if (!this.running && !this.reduced) this.draw();
  }

  /** The visitor can change this while the page is open. */
  setReduced(reduced: boolean) {
    if (reduced === this.reduced) return;
    this.stop();
    this.reduced = reduced;
    if (reduced) this.orbit = { x: 0, y: 0, vx: 0, vy: 0 };
    this.start();
  }

  start() {
    if (this.reduced) {
      this.startReducedLoop();
      return;
    }
    if (this.running) return;
    this.running = true;
    this.lastNow = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.reducedTimer);
    this.reducedTimer = 0;
    this.stage.die.setOpacity(1);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    // A long gap (tab switch, slow frame) must not skip the animation forward.
    const dt = Math.min(now - this.lastNow, 50);
    this.lastNow = now;
    this.time += dt / 1000;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Reduced motion: a still render. A new result every 6 s, faded, and the token jumps to its stone. */
  private startReducedLoop() {
    if (this.reducedTimer) return;
    this.draw();
    this.reducedTimer = window.setInterval(() => {
      const result = this.pickResult();
      const token = this.tokens[this.tokenTurn];
      for (let i = 0; i < result; i += 1) token.stone = this.nextStone(token.stone);
      token.pos = this.stoneSpot(token.stone, token);
      this.tokenTurn = (this.tokenTurn + 1) % this.tokens.length;

      const started = performance.now();
      let swapped = false;
      const fade = (now: number) => {
        if (!this.reducedTimer) return;
        const t = clamp01((now - started) / (DIE_FADE_MS * 2));
        if (t >= 0.5 && !swapped) {
          swapped = true;
          this.stage.die.place(result);
        }
        this.stage.die.setOpacity(Math.abs(t * 2 - 1));
        this.draw();
        if (t < 1) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
    }, REDUCED_RESULT_EVERY_MS);
  }

  private pickResult() {
    const [a, b] = this.results.slice(-2);
    let result: number;
    do {
      result = scene.loop.results[Math.floor(Math.random() * scene.loop.results.length)];
    } while (a !== undefined && a === b && result === a);
    this.results.push(result);
    if (this.results.length > 4) this.results.shift();
    return result;
  }

  private nextStone(index: number) {
    if (index + 1 < this.stones.length) return index + 1;
    return this.stones.findIndex((stone) => stone.id === scene.board.loopFrom);
  }

  private stoneSpot(index: number, token: Token): Point {
    const [x, y] = this.stones[index].center;
    // Two tokens may share a stone: the second stands 14 px aside.
    const shared = this.tokens.some((other) => other !== token && other.stone === index && other.hopT < 0);
    return [x + (shared ? SHARED_OFFSET : 0), y];
  }

  /** The other tokens standing on a stone, not just counted as on it from the opening layout. */
  private standingOn(index: number, token: Token) {
    const [x, y] = this.stones[index].center;
    return this.tokens.filter(
      (other) =>
        other !== token && other.stone === index && other.hopT < 0 && Math.hypot(other.pos[0] - x, other.pos[1] - y) < NEAR_STONE,
    );
  }

  private setPhase(phase: Phase) {
    this.phase = phase;
    this.phaseMs = 0;
  }

  private step(dt: number) {
    this.phaseMs += dt;
    const { idleMs, rollMs, afterLandDelayMs, hopMs, stoneGlowMs } = scene.loop;

    switch (this.phase) {
      case 'idle': {
        if (this.phaseMs >= idleMs) {
          this.result = this.pickResult();
          this.die.chip.textContent = String(this.result);
          this.dieAngle = DIE_THROW_ANGLE + (Math.random() - 0.5) * DIE_THROW_SPREAD;
          this.stage.die.rollTo(this.result, this.dieAngle);
          this.setPhase('roll');
        }
        break;
      }
      case 'roll': {
        this.stepRoll(this.phaseMs);
        if (this.phaseMs >= rollMs) {
          this.dieLanded = false;
          this.dieImpact = 0;
          this.setPhase('wait');
        }
        break;
      }
      case 'wait': {
        if (this.phaseMs >= afterLandDelayMs) {
          this.hopsLeft = this.result;
          this.beginHop();
          this.setPhase('hop');
        }
        break;
      }
      case 'hop': {
        const token = this.tokens[this.tokenTurn];
        token.hopT = clamp01(this.phaseMs / hopMs);
        const e = easeInOutSine(token.hopT);
        token.pos = [lerp(token.hopFrom[0], token.hopTo[0], e), lerp(token.hopFrom[1], token.hopTo[1], e)];
        if (token.hopT >= 1) {
          token.hopT = -1;
          token.pos = token.hopTo;
          this.hopsLeft -= 1;
          if (this.hopsLeft > 0 || !this.collide(token)) {
            token.landedAt = this.time;
            this.spawnPuff(token.pos[0], token.pos[1], 0.45);
          }
          if (this.hopsLeft > 0) {
            this.beginHop();
            this.phaseMs = 0;
          } else {
            this.glowStone = token.stone;
            this.glowMs = 0;
            this.setPhase('glow');
          }
        }
        break;
      }
      case 'glow': {
        if (this.phaseMs >= stoneGlowMs + this.glowExtraMs) {
          this.glowExtraMs = 0;
          this.tokenTurn = (this.tokenTurn + 1) % this.tokens.length;
          this.die.chip.style.opacity = '0';
          this.setPhase('idle');
        }
        break;
      }
    }

    if (this.glowStone >= 0) {
      this.glowMs += dt;
      if (this.glowMs >= stoneGlowMs) this.glowStone = -1;
    }

    this.tokens.forEach((token) => this.stepBump(token));
    this.stepEffects(dt);
    this.stage.die.update(dt);
    this.stepOrbit(dt);
  }

  private stepRoll(ms: number) {
    const [cx, cy] = scene.board.die.center;
    while (this.dieImpact < DIE_IMPACTS.length && ms >= DIE_IMPACTS[this.dieImpact].ms) {
      const impact = DIE_IMPACTS[this.dieImpact];
      const { x, z } = throwPosition(impact.ms, this.dieAngle);
      this.spawnPuff(cx + x * DIE_ART_PER_UNIT, cy + scene.board.die.foot + z * DIE_ART_PER_UNIT * GROUND_SLANT, impact.puff);
      this.dieImpact += 1;
    }
    if (ms >= DIE_LAND_MS && !this.dieLanded) {
      this.dieLanded = true;
      this.die.chip.style.opacity = '1';
    }
  }

  private beginHop() {
    const token = this.tokens[this.tokenTurn];
    const next = this.nextStone(token.stone);
    const [x, y] = this.stones[next].center;
    const occupants = this.standingOn(next, token);
    const stopping = this.hopsLeft === 1;
    token.hopFrom = [token.pos[0], token.pos[1]];
    token.stone = next;
    // Stopping on someone: the mover takes the middle of the stone and they are pushed to the side.
    token.hopTo = stopping && occupants.length ? [x, y] : this.stoneSpot(next, token);
    token.hopT = 0;
    if (!stopping) {
      const sign = token.hopTo[0] < token.hopFrom[0] ? -1 : 1;
      occupants.forEach((other) => {
        other.leanAt = this.time;
        other.leanSign = sign;
      });
    }
  }

  /** The mover has stopped on a taken stone. Returns false if the stone was free. */
  private collide(token: Token) {
    const occupants = this.standingOn(token.stone, token);
    if (!occupants.length) return false;
    const [x, y] = this.stones[token.stone].center;
    const dx = token.hopTo[0] - token.hopFrom[0];
    const dy = token.hopTo[1] - token.hopFrom[1];
    const span = Math.hypot(dx, dy) || 1;
    const dir: Point = [dx / span, dy / span];
    const sign = dx < 0 ? -1 : 1;

    token.impactAt = this.time;
    token.impactDir = dir;
    occupants.forEach((other, i) => {
      // With three on one stone, the second is pushed to the far side of the mover.
      const side = i === 0 ? sign : -sign;
      other.bump = { at: this.time, from: [other.pos[0], other.pos[1]], dir, rest: [x + side * SHARED_OFFSET, y], sign };
    });
    const [hit] = occupants;
    this.spawnPuff((token.pos[0] + hit.pos[0]) / 2 + dir[0] * 18, (token.pos[1] + hit.pos[1]) / 2 + dir[1] * 18, 0.7);
    this.glowExtraMs = COLLISION_EXTRA_GLOW_MS;
    return true;
  }

  /** A token that has been hit: a small hop along the blow, then a damped wobble as it settles. */
  private stepBump(token: Token) {
    const { bump } = token;
    if (!bump) return;
    const ms = (this.time - bump.at) * 1000;
    const kick = clamp01(ms / KNOCK_MS);
    const settle = clamp01((ms - KNOCK_MS) / WOBBLE_MS);
    const out = easeOutQuad(kick) * KNOCK_PX;
    const e = easeInOutSine(settle);
    token.pos = [
      lerp(bump.from[0] + bump.dir[0] * out, bump.rest[0], e),
      lerp(bump.from[1] + bump.dir[1] * out, bump.rest[1], e),
    ];
    token.lift = Math.sin(Math.PI * kick) * KNOCK_ARC;
    token.tilt = bump.sign * WOBBLE_DEG * (kick < 1 ? kick : Math.cos(TAU * 1.25 * settle) * (1 - settle));
    if (settle >= 1) {
      token.bump = null;
      token.lift = 0;
      token.tilt = 0;
    }
  }

  /** Keeps each kind of water particle topped up to its share of the budget. */
  private stepWater(seconds: number) {
    const alive: Record<string, number> = {};
    for (const p of this.particles) alive[p.sprite] = (alive[p.sprite] ?? 0) + 1;

    for (const kind of WATER_KINDS) {
      const cap = WATER_CAPS[kind][this.lite ? 1 : 0];
      const [shortest, longest] = WATER_LIFE[kind];
      this.waterBudget[kind] += (seconds * cap) / ((shortest + longest) / 2);
      while (this.waterBudget[kind] >= 1) {
        this.waterBudget[kind] -= 1;
        if ((alive[kind] ?? 0) >= cap) continue;
        alive[kind] = (alive[kind] ?? 0) + 1;
        this.particles.push(this.spawnWater(kind, shortest + Math.random() * (longest - shortest)));
      }
    }
  }

  private spawnWater(kind: WaterKind, life: number): Particle {
    const { edges, mistBlobs, sparkleArea } = scene.water.waterfall;
    const random = (from: number, to: number) => from + Math.random() * (to - from);
    const base = { sprite: kind, age: 0, life, gravity: 0, pale: Math.random() < 0.5, spin: 0 };

    if (kind === 'drop') {
      // Peels off one edge of the falling water, at a height that follows the mask.
      const i = Math.floor(Math.random() * (edges.length - 1));
      const t = Math.random();
      const side = Math.random() < 0.5 ? -1 : 1;
      const edge = side < 0 ? 1 : 2;
      return {
        ...base,
        x: lerp(edges[i][edge], edges[i + 1][edge], t) + side * 4,
        y: lerp(edges[i][0], edges[i + 1][0], t),
        vx: side * random(14, 46),
        vy: random(120, 240),
        scale: random(1, 1.7),
        gravity: DROP_GRAVITY,
      };
    }

    if (kind === 'spray') {
      // Mostly at the lip where the stream tips over, a little at the cascades above it.
      const points = scene.water.splashPoints;
      const [x, y] = points[Math.random() < 0.8 ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2)];
      const angle = -Math.PI / 2 + random(-0.75, 0.75);
      const speed = random(70, 170);
      return {
        ...base,
        x: x + random(-18, 18),
        y: y + random(-6, 6),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        scale: random(0.8, 1.5),
        gravity: SPRAY_GRAVITY,
      };
    }

    if (kind === 'mist') {
      const [x, y, width] = mistBlobs[Math.floor(Math.random() * mistBlobs.length)];
      return {
        ...base,
        x: x + random(-14, 14),
        y: y + random(-10, 10),
        vx: random(-20, 20),
        vy: random(-14, 10),
        scale: (width / 256) * random(0.9, 1.25),
      };
    }

    const [left, top, right, bottom] = sparkleArea;
    return {
      ...base,
      x: random(left, right),
      y: random(top, bottom),
      vx: random(-14, 14),
      vy: random(24, 58),
      scale: random(8, 16),
      spin: random(-0.9, 0.9),
    };
  }

  private spawnPuff(x: number, y: number, scale: number) {
    this.particles.push({ sprite: 'puff', x, y, vx: 0, vy: -12, age: 0, life: 0.5, scale, gravity: 0, pale: false, spin: 0 });
  }

  private stepEffects(dt: number) {
    const seconds = dt / 1000;
    this.stepWater(seconds);

    // One sparkle every 2 s near the lantern or the die.
    if (this.time >= this.nextSparkle) {
      this.nextSparkle = this.time + 2;
      const [x, y] = Math.random() < 0.5 ? scene.lanternGlow.center : scene.board.die.center;
      this.particles.push({
        sprite: 'sparkle',
        x: x + (Math.random() - 0.5) * 140,
        y: y + (Math.random() - 0.5) * 140,
        vx: 0,
        vy: -8,
        age: 0,
        life: 0.8,
        scale: 0.8 + Math.random() * 0.5,
        gravity: 0,
        pale: false,
        spin: 0,
      });
    }

    for (const p of this.particles) {
      p.age += seconds;
      p.vy += p.gravity * seconds;
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    if (this.time >= this.nextFlicker) {
      this.nextFlicker = this.time + 0.12 + Math.random() * 0.28;
      this.lanternLevel = 0.75 + Math.random() * 0.25;
    }

    if (this.time >= this.nextPop) {
      this.nextPop = this.time + 6;
      this.popIndex = Math.floor(Math.random() * scene.floatingSquares.length);
      this.popStart = this.time;
    }
  }

  /** A critically damped spring towards the pointer. Phones have no pointer, so theirs stays at rest. */
  private stepOrbit(dt: number) {
    const omega = 4.7 / ORBIT_SETTLE_S;
    const { orbit, pointer } = this;
    const targetX = this.lite ? 0 : pointer.x;
    const targetY = this.lite ? 0 : pointer.y;
    const seconds = dt / 1000 / 2;
    for (let i = 0; i < 2; i += 1) {
      orbit.vx += (omega * omega * (targetX - orbit.x) - 2 * omega * orbit.vx) * seconds;
      orbit.vy += (omega * omega * (targetY - orbit.y) - 2 * omega * orbit.vy) * seconds;
      orbit.x += orbit.vx * seconds;
      orbit.y += orbit.vy * seconds;
    }
  }

  /** Works out what each token looks like right now. */
  private poseTokens(t: number) {
    this.tokens.forEach((token, index) => {
      const { hopT, impactDir } = token;
      const sinceImpact = t - token.impactAt;
      let arc = 0;
      let scaleY = 1;
      if (hopT >= 0) {
        arc = Math.sin(Math.PI * hopT) * 36;
        if (hopT < 0.25) scaleY = lerp(1, 1.08, hopT / 0.25);
        else if (hopT < 0.6) scaleY = lerp(1.08, 1, (hopT - 0.25) / 0.35);
      } else {
        arc = this.reduced ? 0 : 1 + Math.sin(t * 2 + index * 1.7);
        if (t - token.landedAt < 0.09) scaleY = 0.9;
        if (sinceImpact < IMPACT_SQUASH_S) scaleY = IMPACT_SQUASH;
      }
      const recoil = sinceImpact < RECOIL_S ? Math.sin((Math.PI * sinceImpact) / RECOIL_S) * RECOIL_PX : 0;
      const lean = LEAN_DEG * token.leanSign * Math.sin(Math.PI * clamp01((t - token.leanAt) / LEAN_S));
      token.height = arc + token.lift;
      token.scaleY = scaleY;
      token.rotation = token.tilt + lean;
      token.offset = [-impactDir[0] * recoil, -impactDir[1] * recoil];
    });
  }

  private draw() {
    const t = this.reduced ? 0 : this.time;
    this.poseTokens(t);
    const idle = this.reduced ? 0 : IDLE_ORBIT;
    const scroll = this.reduced ? 0 : this.scrollProgress;
    const popT = (t - this.popStart) / 0.4;

    this.stage.render({
      time: t,
      bob: this.reduced ? 0 : Math.sin((TAU * t) / BOB_PERIOD) * BOB_PX,
      yaw: -this.orbit.x * ORBIT_YAW + idle * Math.sin((TAU * t) / IDLE_PERIOD),
      pitch: this.orbit.y * ORBIT_PITCH + idle * 0.6 * Math.cos((TAU * t) / IDLE_PERIOD) + SCROLL_TIP * scroll,
      dolly: 1 + SCROLL_DOLLY * scroll,
      rise: SCROLL_RISE * scroll,
      tokens: this.tokens,
      particles: this.particles,
      glowStone: this.glowStone,
      glowAlpha: this.glowStone >= 0 ? Math.sin(Math.PI * clamp01(this.glowMs / scene.loop.stoneGlowMs)) * 0.8 : 0,
      lantern: this.reduced ? 0.9 : this.lanternLevel,
      popIndex: popT >= 0 && popT < 1 ? this.popIndex : -1,
      popScale: 1 + 0.15 * Math.sin(Math.PI * clamp01(popT)),
      still: this.reduced,
    });

    const { x, y, scale } = this.stage.project(scene.board.die.center[0], scene.board.die.center[1]);
    this.die.host.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
}
