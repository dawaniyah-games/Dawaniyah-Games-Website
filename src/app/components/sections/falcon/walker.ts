/**
 * The walker rig: walking without skating. Ported from `Walk` and `draw_leg` / `draw_walker` in
 * design-handoff/falcon-sprites/film2.py. The distance travelled drives the feet, so a planted foot
 * stays on its spot at any speed; only the shank swings from the hip to the ankle above it, and the
 * lifted leg (curled talons) swings forward in an arc. Canvas CSS px and seconds.
 */
import { clamp, smooth, type DrawCmd, type FalconAtlas, type Pt, type WalkerPart } from './falconAtlas';

export interface Foot {
  x: number;
  y: number;
  up: boolean; // drawn with the lifted leg
}

export interface WalkerPose {
  bx: number;
  by: number;
  feet: [Foot, Foot]; // rear, front
  rock: number; // degrees, nose up positive for a right-facing falcon
}

/** H: the falcon's height in CSS px. DS: CSS px per sheet px. */
export interface Scale {
  H: number;
  DS: number;
}

const ENDS_S = 0.25; // the bob and the rock ease in and out over this at each end
const SETTLE_S = 0.22; // the last step, onto the standing spot
const SETTLE_DASH_S = 0.14;
const SHORT_STEP = 0.3; // a step shorter than this share of a stride is shuffled, not lifted

interface Settle {
  from: number;
  to: number;
  w0: number; // how far through its swing the foot already is
}

/**
 * A walk from x0 to x1, facing the way it goes. Footprints follow the gait, except that it starts on
 * the spots it was standing on and never steps past the spots it will stand on: the last step is a
 * short one, taken after the body has stopped. So no foot ever moves while it is on the line.
 */
export class Walk {
  readonly dir: 1 | -1;
  readonly D: number;
  /** The whole walk, with its settling step. */
  readonly T: number;
  private travel: number;
  private v: number;
  private S: number;
  private ein: number;
  private eout: number;
  private hipX: [number, number];
  private settle: [Settle | null, Settle | null] = [null, null];
  private settleT = 0;
  private planted = new Set<string>();

  constructor(
    private atlas: FalconAtlas,
    private m: Scale,
    readonly x0: number,
    readonly x1: number,
    readonly wet = false,
    readonly dash = false,
  ) {
    const g = atlas.walker.gait;
    this.dir = x1 >= x0 ? 1 : -1;
    this.D = Math.abs(x1 - x0);
    this.v = (dash ? g.dashSpeed : g.speed) * m.H;
    [this.ein, this.eout] = dash ? [0.12, 0.2] : [g.easeIn, g.easeOut];
    this.travel = this.D / this.v + (this.ein + this.eout) / 2;
    this.S = this.v * (dash ? g.dashCycle : g.cycle);
    this.hipX = [atlas.walker.hips.rear[0] * m.DS * this.dir, atlas.walker.hips.front[0] * m.DS * this.dir];

    // Whatever is left when the body stops: a swing to finish, or a foot to bring under its hip.
    const phi = this.D / this.S;
    for (const k of [0, 1] as const) {
      const off = k * 0.5;
      const u = phi + off - Math.floor(phi + off);
      const n = Math.floor(phi + off);
      const end = this.x1 + this.hipX[k];
      if (u < g.duty) {
        const at = this.footprint(k, n);
        if (Math.abs(at - end) > 0.5) this.settle[k] = { from: at, to: end, w0: 0 };
      } else {
        this.settle[k] = { from: this.footprint(k, n), to: this.footprint(k, n + 1), w0: smooth((u - g.duty) / (1 - g.duty)) };
      }
    }
    if (this.settle[0] || this.settle[1]) this.settleT = dash ? SETTLE_DASH_S : SETTLE_S;
    this.T = this.travel + this.settleT;
  }

  /** Footprint n of a foot, where its hip passes over it at mid-stance, kept between the two standing spots. */
  private footprint(k: 0 | 1, n: number) {
    const start = this.x0 + this.hipX[k];
    if (n <= 0) return start;
    const end = this.x1 + this.hipX[k];
    const x = this.x0 + this.dir * this.S * (n - k * 0.5 + this.atlas.walker.gait.duty / 2) + this.hipX[k];
    return this.dir * (x - end) > 0 ? end : x;
  }

  /** Distance travelled: a trapezoid of speed, easing in and out. */
  s(t: number) {
    const { v, ein: a, eout: b, travel: T } = this;
    if (t <= 0) return 0;
    if (t < a) return (v * t * t) / (2 * a);
    if (t < T - b) return (v * a) / 2 + v * (t - a);
    if (t >= T) return this.D;
    const r = T - t;
    return this.D - (v * r * r) / (2 * b);
  }

  private swing(from: number, to: number, w: number, liftScale: number, line: number): Foot {
    const g = this.atlas.walker.gait;
    const len = Math.abs(to - from);
    const step = Math.min(1, len / this.S);
    const up = len >= SHORT_STEP * this.S && w > 0.18 && w < 0.82;
    const lift = g.lift * this.m.H * Math.sin(Math.PI * w) * step * liftScale;
    return { x: from + (to - from) * w, y: line - lift - (up && liftScale > 0.5 ? 0.07 * this.m.H : 0), up: up && liftScale > 0.5 };
  }

  /** `onStep(foot, x)` once each time a foot comes down on a new spot (0 rear, 1 front). */
  pose(t: number, line: number, onStep?: (foot: 0 | 1, x: number) => void): WalkerPose {
    const g = this.atlas.walker.gait;
    const step = (k: 0 | 1, key: string, x: number) => {
      if (this.planted.has(key)) return;
      this.planted.add(key);
      onStep?.(k, x);
    };

    if (t >= this.travel) {
      const w = this.settleT ? smooth((t - this.travel) / this.settleT) : 1;
      const feet = ([0, 1] as const).map((k) => {
        const s = this.settle[k];
        if (!s) return { x: this.x1 + this.hipX[k], y: line, up: false };
        const ww = s.w0 + (1 - s.w0) * w;
        if (ww >= 1) step(k, `${k} end`, s.to);
        return this.swing(s.from, s.to, ww, 1, line);
      });
      return { bx: this.x1, by: line, feet: feet as [Foot, Foot], rock: 0 };
    }

    const s = this.s(t);
    const bx = this.x0 + this.dir * s;
    const phi = s / this.S;
    const ease = smooth(Math.min(t / ENDS_S, (this.travel - t) / ENDS_S, 1));
    const start = smooth(t / ENDS_S);
    const feet = ([0, 1] as const).map((k) => {
      const off = k * 0.5;
      const u = phi + off - Math.floor(phi + off);
      const n = Math.floor(phi + off);
      const here = this.footprint(k, n);
      if (u < g.duty) {
        // Planted: it stays exactly where it came down.
        if (n > 0 && Math.abs(here - this.footprint(k, n - 1)) > 0.5) step(k, `${k} ${n}`, here);
        return { x: here, y: line, up: false };
      }
      return this.swing(here, this.footprint(k, n + 1), smooth((u - g.duty) / (1 - g.duty)), start, line);
    });
    const bob = g.bob * this.m.H * (0.5 - 0.5 * Math.cos(4 * Math.PI * phi)) * ease;
    const rock = g.rock * Math.sin(2 * Math.PI * phi) * ease;
    return { bx, by: line - bob, feet: feet as [Foot, Foot], rock };
  }
}

// -------------------------------------------------------------------- drawing the rig

const part = (atlas: FalconAtlas, name: keyof FalconAtlas['walker']['parts']) => atlas.walker.parts[name];

function pieceOf(p: WalkerPart, flip: 1 | -1, k: number, x: number, y: number, pivot: Pt, rot: number, top = 0, height?: number): DrawCmd {
  const [rx, ry, rw, rh] = p.rect;
  const sh = Math.min(rh - top, height ?? rh - top);
  return { sheet: 'walker', sx: rx, sy: ry + top, sw: rw, sh, px: pivot[0], py: pivot[1] - top, x, y, k, flip, rot };
}

/**
 * Planted: the toes stay flat on the line, unrotated (a rotated foot dips through it), and the shank
 * runs from the hip to the ankle above them. Lifted: the whole leg swings about the hip.
 */
function legCmds(atlas: FalconAtlas, DS: number, name: 'legRear' | 'legFront' | 'legLifted', f: 1 | -1, hip: Pt, foot: Pt): DrawCmd[] {
  const p = part(atlas, name);
  const [px, py] = p.pivot!;
  const [fx, fy] = p.foot!;
  const [tx, ty] = [foot[0] - hip[0], foot[1] - hip[1]];
  if (name === 'legLifted') {
    const [sx, sy] = [f * (fx - px) * DS, (fy - py) * DS];
    const rot = Math.atan2(ty, tx) - Math.atan2(sy, sx);
    const sc = clamp(Math.hypot(tx, ty) / Math.max(1e-3, Math.hypot(sx, sy)), 0.85, 1.15);
    return [pieceOf(p, f, DS * sc, hip[0], hip[1], [px, py], rot)];
  }
  const ay = fy - 0.32 * (fy - py); // the ankle, just above the red cord
  const overlap = 3 / DS; // 3 CSS px of shank and toes overlap, so no seam shows
  const axSrc = px + ((fx - px) * (ay - py)) / (fy - py); // where the shank meets the ankle in the art
  const ankle: Pt = [foot[0] + f * (axSrc - fx) * DS, foot[1] - (fy - ay) * DS];
  const [sx, sy] = [f * (axSrc - px) * DS, (ay - py) * DS];
  const [ax, ayW] = [ankle[0] - hip[0], ankle[1] - hip[1]];
  const rot = Math.atan2(ayW, ax) - Math.atan2(sy, sx);
  const sc = clamp(Math.hypot(ax, ayW) / Math.max(1e-3, Math.abs(sy)), 0.8, 1.25);
  const toesFrom = Math.max(0, ay - overlap);
  return [
    pieceOf(p, f, DS * sc, hip[0], hip[1], [px, py], rot, 0, ay + overlap),
    pieceOf(p, f, DS, foot[0], foot[1], [fx, fy], 0, toesFrom),
  ];
}

/** Rear leg, front leg, then the body over both: its trousers hide the hips. */
export function walkerCmds(atlas: FalconAtlas, DS: number, pose: WalkerPose, facing: 1 | -1, wet: boolean): DrawCmd[] {
  const { hips } = atlas.walker;
  const cmds: DrawCmd[] = [];
  (['rear', 'front'] as const).forEach((side, k) => {
    const foot = pose.feet[k];
    const hip: Pt = [pose.bx + facing * hips[side][0] * DS, pose.by + hips[side][1] * DS];
    const name = foot.up ? 'legLifted' : side === 'rear' ? 'legRear' : 'legFront';
    cmds.push(...legCmds(atlas, DS, name, facing, hip, [foot.x, foot.y]));
  });
  const body = part(atlas, wet ? 'bodyWet' : 'bodyDry');
  const cmd = pieceOf(body, facing, DS, pose.bx, pose.by, body.anchor!, (-pose.rock * facing * Math.PI) / 180);
  cmd.water = true;
  cmds.push(cmd);
  return cmds;
}
