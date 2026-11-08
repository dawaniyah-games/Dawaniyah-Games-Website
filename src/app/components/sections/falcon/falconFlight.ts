/**
 * Flights, ported from `flight()` and the `fly` branch of film2.py. A flight leaves from take-off
 * frame 4's eye and touches down on landing frame 5's eye; take-off 5-8 and landing 1-4 ride the path
 * itself, pinned on the eye, so one continuous velocity carries it from the line to the line. The
 * planner (falconEngine) never routes one across the waterfall.
 */
import { clamp, type FalconAnimation, type FalconAtlas, type Pt } from './falconAtlas';
import type { Scale } from './walker';

export interface Flight {
  curve: [Pt, Pt, Pt, Pt];
  T: number;
  facing: 1 | -1;
  out: boolean;
  /** Where it lands (anchor x on the line), when it is not leaving the screen. */
  to: number;
}

const EDGE_T = 4 / 12; // take-off 5-8 and landing 1-4, at 12 fps
const BANK_W = 9; // the bank spring, rad/s, critically damped
const BANK_MAX = 14;

/** The eye of a frame, in canvas px, for a falcon whose feet stand at (x, line). */
export function eyeOnLine(a: FalconAnimation, n: number, facing: 1 | -1, x: number, line: number, DS: number): Pt {
  const e = a.frameInfo[n - 1].eye ?? a.anchor;
  return [x + facing * (e[0] - a.anchor[0]) * DS, line + (e[1] - a.anchor[1]) * DS];
}

/** To a landing spot (`to`), or out past `edge` when `to` is null. */
export function planFlight(atlas: FalconAtlas, m: Scale, line: number, from: number, facing: 1 | -1, to: number | null, edge: number): Flight {
  const { H, DS } = m;
  const p0 = eyeOnLine(atlas.animations.takeoff, 4, facing, from, line, DS);
  let p3: Pt;
  let v3: Pt;
  if (to === null) {
    p3 = [edge + facing * 2.6 * H, line - 3.9 * H];
    v3 = [facing * 4.2 * H, -1.2 * H];
  } else {
    p3 = eyeOnLine(atlas.animations.landing, 5, facing, to, line, DS);
    v3 = [facing * 1.1 * H, 0.9 * H];
  }
  const v0: Pt = [facing * 1.5 * H, -2.4 * H]; // the leap: up and forward
  const T = clamp(Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / (2.6 * H) + 0.5, 1.25, 2.6);
  const p1: Pt = [p0[0] + (v0[0] * T) / 3, p0[1] + (v0[1] * T) / 3];
  const p2: Pt = [p3[0] - (v3[0] * T) / 3, p3[1] - (v3[1] * T) / 3];
  return { curve: [p0, p1, p2, p3], T, facing, out: to === null, to: to ?? edge };
}

export function bez([a, b, c, d]: Flight['curve'], u: number): Pt {
  const m = 1 - u;
  const k0 = m * m * m;
  const k1 = 3 * m * m * u;
  const k2 = 3 * m * u * u;
  const k3 = u * u * u;
  return [k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]];
}

export interface FlightFrame {
  anim: 'takeoff' | 'landing' | 'flap' | 'glide';
  n: number;
  eye: Pt;
  /** Path angle in degrees, up positive, for the bank. */
  angle: number;
  /** Take-off and landing frames bank at half strength. */
  edge: boolean;
  /** Which loop of the flap is showing, for its sound. */
  loop: number;
}

/** Time-uniform along the curve: the velocity is continuous at both ends. */
export function flightFrame(atlas: FalconAtlas, fl: Flight, tau: number): FlightFrame {
  const u = clamp(tau / fl.T, 0, 1);
  const eye = bez(fl.curve, u);
  const ahead = bez(fl.curve, Math.min(1, u + 0.01));
  const vx = ahead[0] - eye[0];
  const vy = ahead[1] - eye[1];
  const angle = (Math.atan2(-vy, Math.abs(vx) + 1e-6) * 180) / Math.PI;
  if (tau < EDGE_T) return { anim: 'takeoff', n: 5 + Math.min(3, Math.floor(tau * 12)), eye, angle, edge: true, loop: 0 };
  if (!fl.out && tau > fl.T - EDGE_T) {
    return { anim: 'landing', n: 1 + Math.min(3, Math.floor((tau - (fl.T - EDGE_T)) * 12)), eye, angle, edge: true, loop: 0 };
  }
  const anim = fl.out || vy < -0.2 || u < 0.45 ? 'flap' : 'glide';
  const a = atlas.animations[anim];
  const i = Math.floor(tau * a.fps);
  return { anim, n: a.order[i % a.order.length], eye, angle, edge: false, loop: Math.floor(i / a.order.length) };
}

/** The bank: a critically damped spring towards half the path's angle. Degrees, CCW positive. */
export class Bank {
  angle = 0;
  private v = 0;

  fly(frame: FlightFrame, facing: 1 | -1, dt: number) {
    const target = clamp(0.5 * frame.angle, -BANK_MAX, BANK_MAX) * facing * (frame.edge ? 0.5 : 1);
    const acc = BANK_W * BANK_W * (target - this.angle) - 2 * BANK_W * this.v;
    this.v += acc * dt;
    this.angle += this.v * dt;
  }

  /** On the line it relaxes: x 0.85 per 24 Hz tick. */
  relax(dt: number) {
    this.angle *= 0.85 ** (dt * 24);
    this.v = 0;
  }
}
