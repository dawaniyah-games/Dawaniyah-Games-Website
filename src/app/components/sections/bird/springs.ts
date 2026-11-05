/** Everything that moves is eased or sprung. These are the pieces. */

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function smoothstep(u: number) {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Moves towards a target with a time constant, whatever the frame rate. */
export function lowPass(current: number, target: number, tau: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

/** A critically damped spring, solved exactly, so it never overshoots or depends on the frame rate. */
export class Follow {
  velocity = 0;

  constructor(public value = 0) {}

  step(target: number, omega: number, dt: number) {
    const offset = this.value - target;
    const slope = this.velocity + omega * offset;
    const fade = Math.exp(-omega * dt);
    this.value = target + (offset + slope * dt) * fade;
    this.velocity = (slope - omega * (offset + slope * dt)) * fade;
    return this.value;
  }
}

const BOUNCE_STEP_S = 1 / 240;

/** An underdamped spring about zero: what a letter or a palm does when something lands on it. */
export class Bounce {
  value = 0;
  velocity = 0;

  constructor(
    private hz = 2.2,
    private damping = 0.35,
  ) {}

  kick(velocity: number) {
    this.velocity += velocity;
  }

  step(dt: number) {
    const omega = Math.PI * 2 * this.hz;
    const stiffness = omega * omega;
    const friction = 2 * this.damping * omega;
    for (let left = dt; left > 0; left -= BOUNCE_STEP_S) {
      const h = Math.min(left, BOUNCE_STEP_S);
      this.velocity += (-stiffness * this.value - friction * this.velocity) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  get resting() {
    return Math.abs(this.value) < 0.02 && Math.abs(this.velocity) < 0.2;
  }

  reset() {
    this.value = 0;
    this.velocity = 0;
  }
}
