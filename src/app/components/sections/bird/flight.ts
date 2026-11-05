/**
 * The bird in the air: the path, the pace along it, which sprite each stretch uses, the bank spring,
 * turning round, and the take-off and landing hand-overs. Numbers are CSS pixels and seconds, ported
 * from film3.py (which works in 2x pixels, so its distances are double these).
 */
import { Follow, clamp, lowPass, smoothstep } from './springs';

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type FlightKind = 'flap' | 'glide' | 'swoop' | 'hover';
export type Stretch = { end: number; kind: FlightKind }; // end: px along the path

export const TICK_S = 1 / 24;
export const TAKEOFF_SPEED = 260;
export const LANDING_SPEED = 220;
const CRUISE = 380;
const PACE: Record<FlightKind, number> = { flap: 1, glide: 1.1, swoop: 1.45, hover: 0.22 };
const PACE_SMOOTH_PX = 60;
const ACCEL_LIMIT = 450;
const TURN_S = 0.36;
const BANK_OMEGA = 9;

/** Take-off moves the anchor during frames 5 to 8, landing during frames 1 to 3. */
export const TAKEOFF_AIR_S = 8 * TICK_S;
export const LANDING_AIR_S = 6 * TICK_S;

/** How far the anchor has been carried forward `tau` seconds into the take-off's air frames. */
export const takeoffCarry = (tau: number, v0 = TAKEOFF_SPEED) => (v0 * tau * tau) / (2 * TAKEOFF_AIR_S);
/** How far behind the perch the anchor still is `tau` seconds into the landing. */
export function landingBack(tau: number, v1 = LANDING_SPEED) {
  const left = Math.max(0, LANDING_AIR_S - tau);
  return (v1 * left * left) / (2 * LANDING_AIR_S);
}

function catmull(points: Point[], u: number): Point {
  const n = points.length - 1;
  const segment = Math.min(n - 1, Math.floor(u * n));
  const t = u * n - segment;
  const p0 = points[Math.max(0, segment - 1)];
  const p1 = points[segment];
  const p2 = points[segment + 1];
  const p3 = points[Math.min(n, segment + 2)];
  const axis = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}

/** A Catmull-Rom path through the points, sampled densely and parametrised by distance. */
export class PathCurve {
  readonly length: number;
  private dense: Point[] = [];
  private cumulative: number[] = [0];

  constructor(readonly points: Point[]) {
    const samples = 400;
    for (let i = 0; i <= samples; i += 1) this.dense.push(catmull(points, i / samples));
    for (let i = 1; i <= samples; i += 1) {
      const a = this.dense[i - 1];
      const b = this.dense[i];
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cumulative[samples];
  }

  at(distance: number): Point {
    const d = clamp(distance, 0, this.length);
    let low = 0;
    let high = this.cumulative.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (this.cumulative[middle] < d) low = middle;
      else high = middle;
    }
    const span = Math.max(1e-6, this.cumulative[high] - this.cumulative[low]);
    const f = (d - this.cumulative[low]) / span;
    const a = this.dense[low];
    const b = this.dense[high];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  get highest() {
    return this.dense.reduce((top, p) => Math.min(top, p.y), Infinity);
  }

  /** Whether any of the path comes within `margin` of a rectangle. */
  hits(rects: Rect[], margin: number) {
    return this.dense.some((p) => rects.some((r) => p.x > r.left - margin && p.x < r.right + margin && p.y > r.top - margin && p.y < r.bottom + margin));
  }
}

/**
 * Which sprite each stretch of the path uses: flap to climb, glide on straight runs and descents, a
 * burst of flaps on a long glide, swoop on a long dip, hover over the perch before landing.
 */
export function planStretches(path: PathCurve, { hover = false, swoop = false }: { hover?: boolean; swoop?: boolean }): Stretch[] {
  const L = path.length;
  const step = 30;
  const stretches: { from: number; to: number; kind: FlightKind }[] = [];
  for (let s = 0; s < L; s += step) {
    const a = path.at(s - 30);
    const b = path.at(s + 30);
    const slope = (b.y - a.y) / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const kind: FlightKind = s < 60 || slope < -0.18 ? 'flap' : 'glide';
    const last = stretches[stretches.length - 1];
    if (last?.kind === kind) last.to = s + step;
    else stretches.push({ from: s, to: s + step, kind });
  }
  // Short stretches read as twitching: fold them into what comes before.
  for (let i = stretches.length - 1; i > 0; i -= 1) {
    if (stretches[i].to - stretches[i].from < 90) {
      stretches[i - 1].to = stretches[i].to;
      stretches.splice(i, 1);
    }
  }
  for (let i = stretches.length - 2; i >= 0; i -= 1) {
    if (stretches[i].kind === stretches[i + 1].kind) {
      stretches[i].to = stretches[i + 1].to;
      stretches.splice(i + 1, 1);
    }
  }

  const out: Stretch[] = [];
  const push = (end: number, kind: FlightKind) => {
    const last = out[out.length - 1];
    if (last?.kind === kind) last.end = end;
    else out.push({ end, kind });
  };
  const tail = hover ? L - 185 : L - 45;
  let swooped = false;
  for (const { from, to, kind } of stretches) {
    const end = Math.min(to, tail);
    if (end <= from) continue;
    if (kind === 'glide' && swoop && !swooped && end - from >= 170) {
      const a = path.at(from);
      const b = path.at(end);
      if (b.y - a.y > 0.25 * (end - from)) {
        push(end, 'swoop');
        swooped = true;
        continue;
      }
    }
    if (kind === 'glide' && end - from > 300) {
      const middle = (from + end) / 2;
      push(middle - 45, 'glide');
      push(middle + 45, 'flap');
    }
    push(end, kind);
  }
  if (hover) push(L - 45, 'hover');
  push(L + 1, 'glide');
  return out;
}

/** The time it takes to reach each point of the path, from a pace that varies along it. */
export class FlightTiming {
  readonly duration: number;
  private distances: number[] = [];
  private times: number[] = [0];

  constructor(path: PathCurve, plan: Stretch[], v0: number, v1: number) {
    const L = path.length;
    const count = clamp(Math.ceil(L / 2), 40, 800);
    const paces: number[] = [];
    for (let i = 0; i <= count; i += 1) {
      const s = (L * i) / count;
      this.distances.push(s);
      const kind = (plan.find((stretch) => s <= stretch.end) ?? plan[plan.length - 1]).kind;
      paces.push(CRUISE * PACE[kind]);
    }
    // Smooth the pace along the path, then cap it by how hard the bird can speed up and brake.
    const window = Math.max(1, Math.round(PACE_SMOOTH_PX / (L / count)));
    const speeds = paces.map((_, i) => {
      let sum = 0;
      for (let j = i - window; j <= i + window; j += 1) sum += paces[clamp(j, 0, count)];
      const smooth = sum / (2 * window + 1);
      const s = this.distances[i];
      return Math.min(smooth, Math.sqrt(v0 * v0 + 2 * ACCEL_LIMIT * s), Math.sqrt(v1 * v1 + 2 * ACCEL_LIMIT * (L - s)));
    });
    for (let i = 1; i <= count; i += 1) {
      const ds = this.distances[i] - this.distances[i - 1];
      this.times.push(this.times[i - 1] + ds / ((speeds[i - 1] + speeds[i]) / 2));
    }
    this.duration = this.times[count];
  }

  distanceAt(t: number) {
    const { times, distances } = this;
    const time = clamp(t, 0, this.duration);
    let low = 0;
    let high = times.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (times[middle] < time) low = middle;
      else high = middle;
    }
    const f = (time - times[low]) / Math.max(1e-6, times[high] - times[low]);
    return distances[low] + (distances[high] - distances[low]) * f;
  }
}

/** Sprite orders the flight needs from the atlas. */
export interface FlightSprites {
  flap: { order: number[]; fps: number };
  hover: { order: number[]; fps: number };
  glide: { order: number[]; fps: number };
  swoop: { sequence: number[] };
}

export interface FlightPose {
  x: number; // the eye
  y: number;
  anim: FlightKind;
  frame: number;
  flip: boolean;
  rot: number; // radians, clockwise on screen
  sx: number;
  k: number;
  speed: number;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** One flight, played forward by real time. Sprites advance on the 24 fps clock. */
export class FlightRun {
  readonly plan: Stretch[];
  readonly timing: FlightTiming;
  private time = 0;
  private bank = new Follow(0);
  private bob = 0;
  private flip: boolean;
  private turnAt: number | null = null;
  private held: { frame: number; until: number } = { frame: 1, until: 0 };
  /** Where the bird really is at the start, if the perch moved since the path was drawn. */
  private startError: Point = { x: 0, y: 0 };

  constructor(
    readonly path: PathCurve,
    plan: Stretch[],
    private sprites: FlightSprites,
    flip: boolean,
    private kFrom: number,
    public kTo: number,
    v0 = TAKEOFF_SPEED,
    v1 = LANDING_SPEED,
  ) {
    this.plan = plan;
    this.flip = flip;
    this.timing = new FlightTiming(path, plan, v0, v1);
  }

  get done() {
    return this.time >= this.timing.duration;
  }

  /** The time past the end of the flight in the last step, which belongs to the landing. */
  get overrun() {
    return Math.max(0, this.time - this.timing.duration);
  }

  /** Puts the path's start on the bird, and fades the difference out over the first third of the path. */
  startFrom(actual: Point) {
    const start = this.path.at(0);
    this.startError = { x: actual.x - start.x, y: actual.y - start.y };
  }

  step(dt: number, endDrift: Point): FlightPose {
    this.time += dt;
    const t = Math.min(this.time, this.timing.duration);
    const { path, timing } = this;
    const L = path.length;
    const here = timing.distanceAt(t);
    const p = path.at(here);
    const before = path.at(timing.distanceAt(t - 0.03));
    const after = path.at(timing.distanceAt(t + 0.03));
    const vx = after.x - before.x;
    const vy = after.y - before.y;
    const frac = here / L;
    const stretch = this.plan.find((s) => here <= s.end) ?? this.plan[this.plan.length - 1];
    const tick = Math.floor(t / TICK_S);
    const clock = tick * TICK_S;

    // Facing comes from motion. A change of side always goes through the turn in the air.
    const want = Math.abs(vx) > 0.75 ? vx < 0 : this.flip;
    if (want !== this.flip && this.turnAt === null) this.turnAt = t;
    let sx = 1;
    let turning = 0;
    if (this.turnAt !== null) {
      const phase = (t - this.turnAt) / TURN_S;
      sx = 1 - 0.45 * Math.sin(Math.PI * Math.min(1, phase));
      if (phase >= 0.5 && phase < 0.8 && want !== this.flip) this.flip = want; // only while edge-on
      turning = phase < 0.2 || phase > 0.8 ? 3 : 4;
      if (phase >= 1) this.turnAt = null;
    }

    // Nose along the path: on screen that is clockwise when flying right and down, or left and up.
    const facing = this.flip ? -1 : 1;
    const slope = Math.atan2(vy, Math.abs(vx) + 1e-6) * facing * 0.5;
    const envelope = smoothstep(Math.min(frac / 0.12, (1 - frac) / 0.15, 1));
    let anim: FlightKind = stretch.kind;
    let frame = 1;
    let target = 0;
    let wantBob = 0;
    let bobPx = 0;
    if (anim === 'flap') {
      const { order, fps } = this.sprites.flap;
      frame = order[Math.floor(clock * fps) % order.length];
      target = clamp(slope, -toRad(16), toRad(16));
      wantBob = 1;
      bobPx = -2 * Math.sin(Math.PI * 2 * 2 * t);
    } else if (anim === 'hover') {
      const { order, fps } = this.sprites.hover;
      frame = order[Math.floor(clock * fps) % order.length];
      wantBob = 1;
      bobPx = -1.5 * Math.sin(Math.PI * 2 * 2.2 * t);
    } else if (anim === 'glide') {
      const a = path.at(here - 20);
      const b = path.at(here + 20);
      const bend = Math.abs(wrapAngle(Math.atan2(b.y - p.y, b.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x)));
      const { order, fps } = this.sprites.glide;
      const next = bend > toRad(11.46) ? 4 : bend > toRad(5.16) ? 3 : order[Math.floor(clock * fps) % order.length];
      // Keeps a wobbly bend from flickering between two wing poses.
      if (next !== this.held.frame && t >= this.held.until) this.held = { frame: next, until: t + 3 * TICK_S };
      frame = this.held.frame;
      target = clamp(slope, -toRad(12), toRad(12));
    } else {
      const { sequence } = this.sprites.swoop;
      const index = this.plan.indexOf(stretch);
      const from = index > 0 ? this.plan[index - 1].end : 0;
      const phase = (here - from) / Math.max(1, stretch.end - from);
      frame = sequence[clamp(Math.floor(phase * sequence.length), 0, sequence.length - 1)];
    }
    if (turning) {
      anim = 'glide';
      frame = turning;
      target = 0;
    }

    // Level out into the landing, so the hand-over to the feet has nothing to snap.
    const rot = this.bank.step(target * smoothstep((1 - frac) / 0.12), BANK_OMEGA, dt);
    this.bob = lowPass(this.bob, wantBob, 0.12, dt);
    const blend = smoothstep(frac);
    const startFade = 1 - smoothstep(frac / 0.33);
    return {
      x: p.x + this.startError.x * startFade + endDrift.x * blend,
      y: p.y + this.startError.y * startFade + endDrift.y * blend + bobPx * this.bob * envelope,
      anim,
      frame,
      flip: this.flip,
      rot,
      sx,
      k: this.kFrom + (this.kTo - this.kFrom) * blend,
      speed: Math.hypot(vx, vy) / 0.06,
    };
  }

  get bankAngle() {
    return this.bank.value;
  }
}
