/**
 * What the bird does next: a small state machine, not a timeline. After each action it rests, then
 * draws the next thing by weight. Being touched interrupts almost anything. Nothing here touches the
 * page: it asks the world where things are, and leaves a pose for the engine to draw.
 */
import type { PalmCrownId } from '../island/birdPerches';
import type { BirdAnim, BirdAnimation, BirdSheets } from './birdAtlas';
import { FlightRun, PathCurve, TAKEOFF_AIR_S, TICK_S, landingBack, planStretches, takeoffCarry, type FlightSprites, type Point, type Rect, type Stretch } from './flight';
import type { Facing } from './perches';
import { worldOf } from './sprite';
import { Follow, clamp, lowPass, smoothstep } from './springs';

export type Home = 'headline' | 'island' | 'prompt'; // the sound popup, for as long as it is open

export interface Perch {
  id: string;
  home: Home;
  x: number; // where the feet go, relative to the composition, right now
  y: number;
  facing: Facing;
  width: number;
  group?: string;
  palm?: PalmCrownId;
  el?: HTMLElement;
  gone?: boolean; // no longer on the page: re-measured away
}

export type Reaction = 'land' | 'leave' | 'peck' | 'note' | 'flinch';
export type BirdSurface = 'letter' | 'ground' | 'palm' | 'air';

/** How far the way round the island reaches, top to bottom. It stays under what the bird cannot cross. */
export interface Circuit {
  top: number;
  bottom: number;
}

/** Everything the flights need to know about the page, read fresh from the live layout. */
export interface Sky {
  left: number;
  right: number;
  top: number; // nothing flies higher than this
  noFly: Rect[];
  under: Rect[]; // where these stand, it flies below them: a ceiling that steps with the text
  circuit: Circuit | null; // with one home, the way round it
  cruise: number;
  corridorX: number | null; // between the two homes
  side: 1 | -1; // from the headline towards the island
  lineTop: number | null; // the top of the headline's first line
  lineMiddle: number | null;
}

export interface BirdWorld {
  sheets: BirdSheets;
  perches(): Perch[];
  usable(perch: Perch): boolean;
  crowded(perch: Perch): boolean;
  at(perch: Perch): Point; // where the feet go now, with the perch's own movement
  heightOn(perch: Perch): number;
  sky(): Sky;
  middleX(): number;
  cursor(): Point | null; // the mouse, while it is near the bird
  sinceCursorNear(): number;
  twoHomes(): boolean;
  react(perch: Perch, what: Reaction): void;
  burst(at: Point, facing: 1 | -1, height: number): void;
}

export interface BirdPose {
  anim: BirdAnim;
  frame: number;
  x: number; // where `pin` goes
  y: number;
  pin: Point;
  flip: boolean;
  rot: number;
  sx: number;
  k: number;
  breathe: boolean;
  fixed: boolean; // pinned on the feet and staying there
  slow: boolean; // cross-fades take their time (reduced motion)
  perch: string | null;
  surface: BirdSurface;
  clip: number; // which run of a clip this frame belongs to; 0 at rest and in flight
}

// ---------------------------------------------------------------------- the weights

const IDLE_WEIGHTS = { 'look-around': 30, chirp: 12, bob: 12, preen: 10, fluff: 8, scratch: 8, peck: 10, sleep: 5 };
type IdleName = keyof typeof IDLE_WEIGHTS | 'look-back';
const LOOK_BACK_WEIGHT = 14; // at a word's end, instead of a turn towards the cursor

const MOVE_WEIGHTS = { hop: 40, home: 35, other: 25 };
// With only the island to live on, it uses all of it, and sooner: a phone does not stay here for long.
const ONE_HOME_WEIGHTS = { hop: 15, home: 55, lap: 30 };
const REST_S: [number, number] = [2, 5];
const IDLES_BEFORE_MOVE: [number, number] = [3, 5];
const ONE_HOME_IDLES_BEFORE_MOVE: [number, number] = [1, 2];
const SLEEP_AFTER_S = 60;
const SHY_S = 10;
const SHY_PX = 200;
const HOP_REACH = 1.8; // of the bird's height
const LOOK_S = 0.2;
const TURN_PAUSE_S = 1.2;
const WAKE_AFTER_S = 1.5;
const HOVER_CHANCE = 0.5;
const SWOOP_CHANCE = 0.5;
const STILL_OFFENDED_TICKS = 16;
const HOVER_HALF_PX = 90; // the pace is smoothed over 60 px, so this comes to 1 to 1.5 s
const LAP_POINTS = 6;
const LAP_TURN = 1.85 * Math.PI; // nearly all the way round: the landing closes the circle
const RETRIES = 4;
const LEVEL_OFF = 0.22; // of its height: a curve overshoots by about this where it levels out under the ceiling
const SAME_POINT_PX = 10; // closer than this, two points of a route only put a kink in it

function pick<T extends string>(weights: [T, number][], random: () => number): T | null {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const [name, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return weights[weights.length - 1][0];
}

const between = (low: number, high: number, random: () => number) => low + random() * (high - low);

// ---------------------------------------------------------------------- clips

type Entries = [frame: number, ticks: number][];

interface ClipOptions {
  loop?: boolean;
  breathe?: boolean;
  locked?: boolean; // cannot be interrupted by a touch
  unflipped?: boolean; // the turn strip faces both ways by itself
  anchor?: (time: number) => Point; // the feet move during this clip
  on?: Partial<Record<number, () => void>>; // once, the first time a frame shows
  atTick?: [tick: number, run: () => void];
}

/** One animation played on the 24 fps clock: `sequence` and `hold` flattened to one frame per tick. */
class Clip {
  private static count = 0;
  readonly id = (Clip.count += 1);
  time = 0;
  private ticks: number[] = [];
  private fired = new Set<number>();
  private tickFired = false;

  constructor(
    readonly anim: BirdAnim,
    entries: Entries,
    readonly options: ClipOptions = {},
  ) {
    for (const [frame, ticks] of entries) for (let i = 0; i < ticks; i += 1) this.ticks.push(frame);
  }

  get tick() {
    return Math.floor(this.time / TICK_S);
  }

  get frame() {
    const { tick, ticks } = this;
    return ticks[this.options.loop ? tick % ticks.length : Math.min(tick, ticks.length - 1)];
  }

  get done() {
    return !this.options.loop && this.tick >= this.ticks.length;
  }

  /** The time past the clip's end in the last step, which belongs to whatever comes next. */
  get overrun() {
    return Math.max(0, this.time - this.ticks.length * TICK_S);
  }

  step(dt: number) {
    this.time += dt;
    if (this.done) return;
    const { frame, options } = this;
    if (options.on?.[frame] && !this.fired.has(frame)) {
      this.fired.add(frame);
      options.on[frame]!();
    }
    if (options.atTick && !this.tickFired && this.tick >= options.atTick[0]) {
      this.tickFired = true;
      options.atTick[1]();
    }
  }
}

function entriesOf(animation: BirdAnimation): Entries {
  const sequence = animation.sequence ?? animation.order ?? [1, 2, 3, 4, 5, 6, 7, 8];
  const ticks = Math.round(24 / animation.fps);
  return sequence.map((frame, i) => [frame, animation.hold?.[i] ?? ticks]);
}

const run = (from: number, to: number, ticks: number): Entries => {
  const out: Entries = [];
  const step = from <= to ? 1 : -1;
  for (let frame = from; frame !== to + step; frame += step) out.push([frame, ticks]);
  return out;
};

// ---------------------------------------------------------------------- the bird

interface FlyOptions {
  urgent?: boolean; // leaves at once, facing however it faces, and turns in the air if it must
  fromFrame?: number;
  hover?: boolean;
  visit?: boolean; // over the headline and back, when the headline has nowhere to land
  free?: boolean; // the page is dimmed behind the popup: straight there, over whatever is in the way
  lap?: boolean; // once round the island on the way
}

interface Route {
  run: FlightRun;
  approach: Point;
  takeoffDir: Point;
}

export class BirdBrain {
  pose: BirdPose;
  private perch: Perch;
  private facing: 1 | -1 = 1;
  private k: number;
  private clip: Clip | null = null;
  private then: (() => void) | null = null;
  private flight: FlightRun | null = null;
  private dest: Perch | null = null;
  private destAtStart: Point = { x: 0, y: 0 };
  private restLeft = 0;
  private idlesLeft = 0;
  private lastIdle: IdleName | null = null;
  private gaze = 0;
  private lastTurnAt = -10;
  private time = 0;
  private touchedAt = -100;
  private shyOf: Point | null = null;
  private sleeping = false;
  private wakeAt = Infinity;
  private offended = false;
  private landingBank: Follow | null = null;
  private overrun = 0; // time past the end of the last clip, so hand-overs lose none of it
  private readonly atlas: BirdSheets['atlas'];
  /** What the debug overlay reads. */
  lastRoute: { path: PathCurve; plan: Stretch[] } | null = null;
  state = 'asleep';

  constructor(
    private world: BirdWorld,
    start: Perch,
    private reduced: boolean,
    private random: () => number = Math.random,
  ) {
    this.atlas = world.sheets.atlas;
    this.perch = start;
    this.k = this.targetK(start);
    this.idlesLeft = this.nextIdleCount();
    this.pose = this.standingPose('look-around', 1, false);
    if (reduced) this.reducedLoop();
    else this.asleepUntilWoken();
    this.compose();
  }

  // -------------------------------------------------------------------- what the engine calls

  step(dt: number) {
    this.time += dt;
    if (this.flight) {
      this.stepFlight(dt);
      return;
    }
    this.k = lowPass(this.k, this.targetK(this.perch), 0.2, dt);
    if (this.landingBank) this.landingBank.step(0, 14, dt);
    if (this.clip) {
      const clip = this.clip;
      clip.step(dt);
      if (this.sleeping && (this.time >= this.wakeAt || this.world.cursor())) this.wake();
      else if (clip === this.clip && clip.done) this.finishClip();
    } else {
      this.stepRest(dt);
    }
    if (!this.flight) this.compose();
  }

  /** The island has loaded and is on screen: wake up in a moment. */
  wakeSoon() {
    if (this.sleeping && this.wakeAt === Infinity) this.wakeAt = this.time + WAKE_AFTER_S;
  }

  /** Whether it took any notice: in the air, or already annoyed, it does not. */
  touched(point: Point) {
    const { atlas, world } = this;
    if (this.reduced) {
      if (this.clip?.anim === 'annoyed') return false;
      world.burst(world.at(this.perch), this.facing, this.height());
      this.play(new Clip('annoyed', [[4, 24]], { locked: true }), () => this.reducedLoop());
      return true;
    }
    if (this.flight || this.clip?.options.locked) return false;
    const again = this.time - this.touchedAt < SHY_S;
    this.touchedAt = this.time;
    this.shyOf = point;
    this.sleeping = false;
    this.wakeAt = Infinity;
    const burstFrame = atlas.animations.annoyed.burstFrame ?? 3;
    const entries: Entries = again ? [[burstFrame, 7], [8, 4]] : entriesOf(atlas.animations.annoyed);
    this.state = 'annoyed';
    this.play(
      new Clip('annoyed', entries, {
        locked: true,
        on: {
          2: () => world.react(this.perch, 'flinch'),
          [burstFrame]: () => world.burst(world.at(this.perch), this.facing, this.height()),
        },
      }),
      () => this.leaveAfterTouch(point),
    );
    return true;
  }

  /** A fright without contact. */
  startled(point: Point) {
    if (this.reduced || this.flight || this.clip?.options.locked) return;
    this.sleeping = false;
    this.wakeAt = Infinity;
    this.shyOf = point;
    this.state = 'startled';
    this.play(new Clip('startled', entriesOf(this.atlas.animations.startled), { locked: true }), () => {
      const near = this.perches().sort((a, b) => Number(b.home === this.perch.home) - Number(a.home === this.perch.home) || this.random() - 0.5);
      if (!near.some((dest) => this.fly(dest, { urgent: true, fromFrame: 2 }))) this.rest();
    });
  }

  /** Stands on the sound popup, whatever it was doing, facing the way it will leave. */
  sitOnCard(card: Perch, facing: 1 | -1) {
    this.flight = null;
    this.dest = null;
    this.landingBank = null;
    this.sleeping = false;
    this.wakeAt = Infinity;
    this.placeOn(card);
    this.facing = facing;
    this.compose();
  }

  /** Off the popup and down to the island. */
  leaveCard(island: Perch) {
    if (this.perch.home !== 'prompt') return;
    this.clip = null;
    this.then = null;
    if (!this.fly(island, { free: true })) this.placeOn(island);
  }

  /** With nobody watching there is nothing to fly past. */
  placeOn(perch: Perch) {
    this.clip = null;
    this.then = null;
    this.perch = perch;
    this.k = this.targetK(perch);
    this.gaze = 0;
    this.rest();
  }

  /** The perch or the page changed under it. It never snaps: it moves on from where it stands. */
  layoutChanged() {
    if (this.flight && this.dest?.gone) this.reroute();
    if (this.perch.gone && !this.flight && !this.clip?.options.locked) this.relocate();
  }

  /** The bounds of the hit test: the ink of the current frame, in the page. */
  hitBox() {
    const { pose, world } = this;
    const bounds = world.sheets.bounds(pose.anim, pose.frame);
    if (!bounds) return null;
    const a = worldOf({ x: bounds.left, y: bounds.top }, pose.pin, pose, pose.flip, pose.k);
    const b = worldOf({ x: bounds.right, y: bounds.bottom }, pose.pin, pose, pose.flip, pose.k);
    return { left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) };
  }

  get flying() {
    return this.flight !== null;
  }

  get scale() {
    return this.k;
  }

  get currentHeight() {
    return this.height();
  }

  /** For the debug keys. */
  force(what: 'look-around' | 'chirp' | 'hop' | 'home' | 'other' | 'annoyed' | 'sleep' | 'startled', point: Point) {
    if (this.flight || this.clip?.options.locked) return;
    this.clip = null;
    this.then = null;
    this.sleeping = false;
    this.wakeAt = Infinity;
    if (what === 'look-around' || what === 'chirp') this.playIdle(what);
    else if (what === 'sleep') this.doze();
    else if (what === 'annoyed') this.touched(point);
    else if (what === 'startled') this.startled(point);
    else if (what === 'hop') {
      const [next] = this.neighbours();
      if (!next || !this.hop(next)) this.rest();
    } else this.moveTo(what);
  }

  // -------------------------------------------------------------------- resting and choosing

  private rest() {
    this.clip = null;
    this.then = null;
    this.state = 'rest';
    this.restLeft = between(REST_S[0], REST_S[1], this.random);
    if (this.offended) {
      this.offended = false;
      this.play(new Clip('annoyed', [[7, STILL_OFFENDED_TICKS]]), () => this.rest());
    }
  }

  private stepRest(dt: number) {
    const cursor = this.world.cursor();
    this.gaze = clamp(this.gaze + (cursor ? dt : -dt), 0, LOOK_S);
    if (cursor) {
      const side = cursor.x >= this.world.at(this.perch).x ? 1 : -1;
      if (this.perch.facing === 'any' && side !== this.facing && this.time - this.lastTurnAt > TURN_PAUSE_S) {
        this.turn(side, () => this.rest());
      }
      return;
    }
    this.restLeft -= dt;
    if (this.restLeft <= 0) this.next();
  }

  private next() {
    if (this.perch.home === 'prompt') {
      const name = this.pickIdle();
      if (name) this.playIdle(name);
      else this.rest();
      return;
    }
    if (this.perch.gone || this.world.crowded(this.perch)) {
      if (this.relocate()) return;
    }
    const want = this.restFacing();
    if (want !== this.facing) {
      this.turn(want, () => this.rest());
      return;
    }
    this.idlesLeft -= 1;
    if (this.idlesLeft <= 0) {
      this.idlesLeft = this.nextIdleCount();
      if (this.moveTo()) return;
    }
    const name = this.pickIdle();
    if (name) this.playIdle(name);
    else this.rest();
  }

  private nextIdleCount() {
    const [fewest, most] = this.world.twoHomes() ? IDLES_BEFORE_MOVE : ONE_HOME_IDLES_BEFORE_MOVE;
    return Math.round(between(fewest, most, this.random));
  }

  /** Faces out from a word's end; anywhere else, towards the middle of the composition. */
  private restFacing(): 1 | -1 {
    const { facing } = this.perch;
    if (facing === 'left') return -1;
    if (facing === 'right') return 1;
    return this.world.middleX() >= this.world.at(this.perch).x ? 1 : -1;
  }

  private pickIdle(): IdleName | null {
    const { sheets } = this.world;
    const entries = (Object.entries(IDLE_WEIGHTS) as [keyof typeof IDLE_WEIGHTS, number][]).filter(([name]) => {
      if (name === this.lastIdle) return false;
      if (name === 'sleep') return this.perch.home !== 'prompt' && this.world.sinceCursorNear() >= SLEEP_AFTER_S;
      return sheets.has(name);
    });
    const options: [IdleName, number][] = entries;
    if (this.perch.facing !== 'any' && this.lastIdle !== 'look-back') options.push(['look-back', LOOK_BACK_WEIGHT]);
    return pick(options, this.random);
  }

  private playIdle(name: IdleName) {
    this.lastIdle = name;
    this.state = name;
    const { animations } = this.atlas;
    if (name === 'sleep') {
      this.doze();
    } else if (name === 'look-back') {
      this.turn(this.facing === 1 ? -1 : 1, () => this.rest());
    } else if (name === 'peck') {
      const peck = () => this.world.react(this.perch, 'peck');
      this.play(new Clip('peck', entriesOf(animations.peck), { on: { 3: peck, 5: peck } }), () => this.rest());
    } else if (name === 'chirp') {
      const note = () => this.world.react(this.perch, 'note');
      this.play(new Clip('chirp', entriesOf(animations.chirp), { on: { 4: note, 6: note } }), () => this.rest());
    } else {
      this.play(new Clip(name, entriesOf(animations[name]), { breathe: name === 'look-around' }), () => this.rest());
    }
  }

  private play(clip: Clip, then: () => void) {
    this.clip = clip;
    this.then = then;
  }

  private finishClip() {
    const { then } = this;
    this.overrun = this.clip?.overrun ?? 0;
    this.clip = null;
    this.then = null;
    then?.();
  }

  private turn(to: 1 | -1, then: () => void) {
    this.lastTurnAt = this.time;
    this.state = 'turn';
    const entries = to < 0 ? run(1, 8, 2) : run(8, 1, 2);
    this.play(new Clip('turn', entries, { unflipped: true }), () => {
      this.facing = to;
      then();
    });
  }

  // -------------------------------------------------------------------- sleep

  private asleepUntilWoken() {
    this.sleeping = true;
    this.clip = new Clip('sleep', [[5, 8], [6, 8]], { loop: true });
  }

  private doze() {
    this.sleeping = true;
    this.state = 'sleep';
    this.wakeAt = this.time + between(9, 18, this.random);
    this.play(new Clip('sleep', [[1, 6], [2, 8], [3, 8], [4, 8]]), () => {
      this.clip = new Clip('sleep', [[5, 8], [6, 8]], { loop: true });
    });
  }

  private wake() {
    this.sleeping = false;
    this.wakeAt = Infinity;
    this.state = 'wake';
    this.play(new Clip('sleep', [[7, 8], [8, 10]]), () => {
      this.play(new Clip('stretch', entriesOf(this.atlas.animations.stretch)), () => this.rest());
    });
  }

  // -------------------------------------------------------------------- moving between perches

  private perches(shy = true) {
    return this.world.perches().filter((p) => p !== this.perch && !p.gone && this.world.usable(p) && !(shy && this.tooClose(p)));
  }

  /** For ten seconds after a touch, nowhere near the pointer. */
  private tooClose(perch: Perch) {
    if (!this.shyOf || this.time - this.touchedAt >= SHY_S) return false;
    const at = this.world.at(perch);
    return Math.hypot(at.x - this.shyOf.x, at.y - this.shyOf.y) < SHY_PX;
  }

  private neighbours() {
    const here = this.perch;
    const reach = HOP_REACH * this.height();
    const atHere = this.world.at(here);
    const near = this.perches().filter((p) => {
      if (p.home !== here.home) return false;
      const at = this.world.at(p);
      const sameLine = here.home === 'headline' ? Math.abs(at.y - atHere.y) < 6 : here.group !== undefined && p.group === here.group;
      return sameLine && Math.abs(at.x - atHere.x) <= reach;
    });
    return near.sort((a, b) => Math.abs(a.x - here.x) - Math.abs(b.x - here.x));
  }

  private choosePerch(from: Perch[]) {
    return from.length ? from[Math.floor(this.random() * from.length)] : null;
  }

  private moveTo(only?: 'home' | 'other') {
    const { world, perch } = this;
    const all = this.perches();
    const same = all.filter((p) => p.home === perch.home);
    const other = all.filter((p) => p.home !== perch.home);
    const twoHomes = world.twoHomes();
    const canVisit = twoHomes && perch.home === 'island' && !other.length && world.sky().lineTop !== null;
    const hopTo = this.neighbours();
    const canLap = world.sky().circuit !== null;
    const weights: ['hop' | 'home' | 'other' | 'lap', number][] = twoHomes
      ? [
          ['hop', hopTo.length ? MOVE_WEIGHTS.hop : 0],
          ['home', same.length ? MOVE_WEIGHTS.home : 0],
          ['other', other.length || canVisit ? MOVE_WEIGHTS.other : 0],
        ]
      : [
          ['hop', hopTo.length ? ONE_HOME_WEIGHTS.hop : 0],
          ['home', same.length ? ONE_HOME_WEIGHTS.home : 0],
          ['lap', same.length && canLap ? ONE_HOME_WEIGHTS.lap : 0],
        ];
    const choice = only ?? pick(weights, this.random);
    if (choice === 'hop') return this.hop(hopTo[Math.floor(this.random() * hopTo.length)]);
    if (choice === 'lap') {
      const dest = this.choosePerch(same);
      return dest ? this.fly(dest, { lap: true }) : false;
    }
    if (choice === 'home') {
      const dest = this.choosePerch(same);
      return dest ? this.fly(dest, {}) : false;
    }
    if (choice === 'other') {
      const dest = this.choosePerch(other);
      if (dest) return this.fly(dest, { hover: dest.home === 'island' && this.random() < HOVER_CHANCE });
      if (canVisit) {
        const back = this.choosePerch(same);
        return back ? this.fly(back, { visit: true }) : false;
      }
    }
    return false;
  }

  private leaveAfterTouch(point: Point) {
    const { world, perch } = this;
    // On a phone every perch can be within reach of the finger, and it still has to leave.
    const all = this.perches().length ? this.perches() : this.perches(false);
    const other = all.filter((p) => p.home !== perch.home);
    const farthestFirst = [...all].sort((a, b) => {
      const atA = world.at(a);
      const atB = world.at(b);
      return Math.hypot(atB.x - point.x, atB.y - point.y) - Math.hypot(atA.x - point.x, atA.y - point.y);
    });
    const preferred = world.twoHomes() && other.length ? this.choosePerch(other) : null;
    this.offended = true;
    const places = preferred ? [preferred, ...farthestFirst] : farthestFirst;
    if (!places.some((dest) => this.fly(dest, { urgent: true, fromFrame: 2 }))) {
      this.offended = false;
      this.rest();
    }
  }

  /** The nearest place that still works, by a hop if it is close enough. */
  private relocate() {
    const here = this.world.at(this.perch);
    const nearestFirst = [...this.perches()].sort((a, b) => {
      const atA = this.world.at(a);
      const atB = this.world.at(b);
      return Math.hypot(atA.x - here.x, atA.y - here.y) - Math.hypot(atB.x - here.x, atB.y - here.y);
    });
    return nearestFirst.some((dest) => this.fly(dest, { urgent: true }));
  }

  private hop(to: Perch) {
    const from = this.perch;
    const direction = this.world.at(to).x >= this.world.at(from).x ? 1 : -1;
    if (direction !== this.facing) {
      this.turn(direction, () => {
        if (!this.hop(to)) this.rest();
      });
      return true;
    }
    this.state = 'hop';
    this.play(
      new Clip('hop', entriesOf(this.atlas.animations.hop), {
        locked: true,
        anchor: (time) => {
          const u = smoothstep((time / TICK_S / 2 - 3) / 3.5);
          const a = this.world.at(from);
          const b = this.world.at(to);
          return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        },
        atTick: [8, () => (this.perch = to)],
        on: { 7: () => this.world.react(to, 'land') },
      }),
      () => this.rest(),
    );
    return true;
  }

  // -------------------------------------------------------------------- flying

  private fly(dest: Perch, options: FlyOptions): boolean {
    const here = this.world.at(this.perch);
    const direction = this.world.at(dest).x >= here.x ? 1 : -1;
    if (!options.urgent && !options.visit && !options.lap && direction !== this.facing && this.perch.facing === 'any') {
      this.turn(direction, () => {
        if (!this.fly(dest, options)) this.rest();
      });
      return true;
    }
    if (!options.urgent && this.perch.facing !== 'any' && this.facing !== this.restFacing()) {
      // At a word's end it always turns out again before it leaves.
      this.turn(this.restFacing(), () => {
        if (!this.fly(dest, options)) this.rest();
      });
      return true;
    }
    const route = this.routeTo(dest, options);
    if (!route) return false;
    this.dest = dest;
    this.destAtStart = this.world.at(dest);
    this.state = 'takeoff';
    const first = options.fromFrame ?? 1;
    const airStarts = (8 - (first - 1) * 2) * TICK_S;
    const flip = this.facing < 0;
    const { takeoffDir } = route;
    const anchorAt = (time: number) => {
      const carried = takeoffCarry(Math.max(0, time - airStarts));
      const feet = this.world.at(this.perch);
      return { x: feet.x + takeoffDir.x * carried, y: feet.y + takeoffDir.y * carried };
    };
    this.play(
      new Clip('takeoff', run(first, 8, 2), {
        locked: true,
        anchor: anchorAt,
        on: { 4: () => this.world.react(this.perch, 'leave') },
      }),
      () => {
        const hand = this.handover('takeoff');
        const { anchor } = this.atlas.animations.takeoff;
        const eye = worldOf(hand, anchor, anchorAt(airStarts + TAKEOFF_AIR_S), flip, this.k);
        route.run.startFrom(eye);
        this.flight = route.run;
        this.lastRoute = { path: route.run.path, plan: route.run.plan };
        this.approach = route.approach;
        this.state = 'flight';
        this.stepFlight(this.overrun);
      },
    );
    return true;
  }

  private approach: Point = { x: 1, y: 0 };

  private handover(anim: 'takeoff' | 'landing') {
    const hand = this.atlas.animations[anim].handoverEye!;
    return { x: hand.x, y: hand.y };
  }

  private flightSprites(): FlightSprites {
    const { flap, glide, hover, swoop } = this.atlas.animations;
    return {
      flap: { order: flap.order!, fps: flap.fps },
      glide: { order: glide.order!, fps: glide.fps },
      hover: { order: hover.order!, fps: hover.fps },
      swoop: { sequence: swoop.sequence! },
    };
  }

  /** Lines the last stretch up with the landing: shallow on a letter, steep onto a palm crown. */
  private approachTo(dest: Perch, facing: 1 | -1, sky: Sky, kTo: number) {
    const animation = this.atlas.animations.landing;
    const degrees = dest.home === 'headline' ? 22 : dest.palm ? 70 : 38;
    const leadLength = Math.max(46, 1.03 * this.atlas.referenceHeight * kTo);
    const at = this.world.at(dest);
    const build = (radians: number) => {
      const dir = { x: facing * Math.cos(radians), y: Math.sin(radians) };
      const back = landingBack(0);
      const start = { x: at.x - dir.x * back, y: at.y - dir.y * back };
      const entry = worldOf(this.handover('landing'), animation.anchor, start, facing < 0, kTo);
      return { dir, entry, lead: { x: entry.x - dir.x * leadLength, y: entry.y - dir.y * leadLength } };
    };
    const wanted = build((degrees * Math.PI) / 180);
    const destHeight = this.atlas.referenceHeight * kTo;
    const margin = this.clearance(destHeight) + this.levelOff(destHeight);
    const ceiling = Math.max(this.ceilingAt(sky, wanted.lead.x, margin), this.ceilingAt(sky, wanted.entry.x, margin));
    if (wanted.lead.y >= ceiling) return wanted;
    // Under the navbar there may not be room: come in flatter rather than fly under it. Under the
    // buttons there may be none at all: it comes in from a little below, and flares up onto the crown.
    const sine = clamp((wanted.entry.y - ceiling) / leadLength, sky.under.length ? -0.15 : 0.08, 1);
    return build(Math.asin(sine));
  }

  /** How far from anything it must not fly into. */
  private clearance(destHeight: number) {
    return 0.35 * Math.max(this.height(), destHeight);
  }

  private levelOff(destHeight: number) {
    return LEVEL_OFF * Math.max(this.height(), destHeight);
  }

  /** How high it can fly at this x. */
  private ceilingAt(sky: Sky, x: number, margin: number) {
    return sky.under.reduce((top, r) => (x > r.left - margin && x < r.right + margin ? Math.max(top, r.bottom + margin) : top), sky.top);
  }

  /** Straight lines cut the corners of what it flies under: this adds the corner to go round instead. */
  private roundCorners(points: Point[], sky: Sky, margin: number, spare: number) {
    const out = points.slice(0, 1);
    const add = (p: Point) => {
      const last = out[out.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > SAME_POINT_PX) out.push(p);
    };
    for (const to of points.slice(1)) {
      for (const r of sky.under) {
        const from = out[out.length - 1];
        const cuts = (u: number) => {
          const x = from.x + (to.x - from.x) * u;
          const y = from.y + (to.y - from.y) * u;
          return x > r.left - margin && x < r.right + margin && y > r.top - margin && y < r.bottom + margin;
        };
        if (![...Array(25).keys()].some((i) => cuts(i / 24))) continue;
        const high = from.y < to.y ? from : to; // the end that is up beside it
        const leftSide = high.x - r.left < r.right - high.x;
        add({ x: clamp(leftSide ? r.left - margin - spare : r.right + margin + spare, sky.left, sky.right), y: r.bottom + margin + spare });
      }
      add(to);
    }
    return out;
  }

  /** Once round the island from where it took off, the way it is already going. */
  private lapFrom(start: Point, sky: Sky, circuit: Circuit, size: number) {
    const cx = (sky.left + sky.right) / 2;
    const cy = (circuit.top + circuit.bottom) / 2;
    const rx = (size * (sky.right - sky.left)) / 2;
    const ry = (size * (circuit.bottom - circuit.top)) / 2;
    const from = Math.atan2((start.y - cy) / ry, (start.x - cx) / rx);
    const way = -Math.sin(from) * this.facing >= 0 ? 1 : -1;
    const points: Point[] = [];
    for (let i = 1; i <= LAP_POINTS; i += 1) {
      const angle = from + (way * i * LAP_TURN) / LAP_POINTS;
      points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
    }
    return points;
  }

  private routeTo(dest: Perch, options: FlyOptions, from?: { eye: Point; speed: number; flip: boolean }): Route | null {
    const { world, atlas } = this;
    const live = world.sky();
    const sky = options.free ? { ...live, top: 0, noFly: [], under: [] } : live;
    const here = this.perch;
    const height = this.height();
    const kTo = this.targetK(dest);
    const destHeight = atlas.referenceHeight * kTo;
    const atDest = world.at(dest);
    const margin = this.clearance(destHeight);
    const levelOff = this.levelOff(destHeight);
    const keep = (p: Point, spare = levelOff) => {
      const x = clamp(p.x, sky.left, sky.right);
      return { x, y: Math.max(p.y, this.ceilingAt(sky, x, margin + spare)) };
    };

    let eye0: Point;
    let first: Point;
    let takeoffDir: Point = { x: 1, y: 0 };
    let backwards = false;
    if (from) {
      eye0 = from.eye;
      first = eye0;
    } else {
      const flip = this.facing < 0;
      const animation = atlas.animations.takeoff;
      const eye8 = worldOf(this.handover('takeoff'), animation.anchor, world.at(here), flip, this.k);
      // Leaving against the way it faces, it climbs steeply, so the turn in the air is a curve, not a cusp.
      backwards = !options.lap && (atDest.x - eye8.x) * this.facing < -height;
      // Under a ceiling it levels off and may dive straight after, which is where a curve bulges most.
      first = keep({ x: eye8.x + this.facing * (backwards ? 0.8 : 1.4) * height, y: eye8.y - (backwards ? 1 : 0.8) * height }, 3 * levelOff);
      const dx = first.x - eye8.x;
      const dy = first.y - eye8.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      takeoffDir = { x: dx / length, y: dy / length };
      const carried = takeoffCarry(TAKEOFF_AIR_S);
      eye0 = { x: eye8.x + takeoffDir.x * carried, y: eye8.y + takeoffDir.y * carried };
      if (length < carried + 12) first = keep({ x: eye0.x + takeoffDir.x * 40, y: eye0.y + takeoffDir.y * 40 });
    }

    const crossing = here.home !== dest.home && here.home !== 'prompt';
    const skyY = Math.max(sky.top, (sky.lineTop ?? atDest.y) - 0.95 * height);
    for (let attempt = 0; attempt < RETRIES; attempt += 1) {
      const via: Point[] = [];
      let hoverOver: Point | null = null;
      // Each try is a little tighter; the last is the plain way there, which has the least to run into.
      const lapping = options.lap && sky.circuit && attempt < RETRIES - 1;
      if (lapping) via.push(...this.lapFrom(first, sky, sky.circuit!, 1 - 0.12 * attempt).map(keep));
      if (backwards) via.push(keep({ x: first.x + this.facing * 0.1 * height, y: first.y - 0.5 * height }));
      const cx = sky.corridorX === null ? null : sky.corridorX + sky.side * attempt * 0.8 * height;
      if ((crossing || options.visit) && cx !== null) {
        if (dest.home === 'headline') {
          via.push(keep({ x: cx, y: (first.y + skyY) / 2 }), keep({ x: cx - sky.side * 0.8 * height, y: skyY }));
        } else if (options.visit) {
          // Along the line, slowly, then a turn in the air and back.
          const y = (sky.lineTop ?? skyY + height) - 0.9 * height;
          const middle = sky.lineMiddle ?? cx;
          hoverOver = keep({ x: middle, y });
          via.push(keep({ x: cx, y: (first.y + skyY) / 2 }), keep({ x: middle + sky.side * 70, y }), keep({ x: middle - sky.side * 70, y }), keep({ x: cx, y: skyY }));
        } else {
          via.push(keep({ x: cx, y: skyY }));
        }
      }

      const fromX = (via[via.length - 1] ?? first).x;
      const facing: 1 | -1 = dest.facing === 'left' ? -1 : dest.facing === 'right' ? 1 : atDest.x >= fromX ? 1 : -1;
      const { dir, entry, lead } = this.approachTo(dest, facing, sky, kTo);

      if (!crossing && !options.visit && !lapping) {
        // A hop in the air: over the top, in an arc that clears what is in between.
        const span = Math.hypot(lead.x - first.x, lead.y - first.y);
        if (span > 2.2 * destHeight) {
          const lift = (between(0.6, 1.5, this.random) * height * (RETRIES - 1 - attempt)) / (RETRIES - 1);
          const top = { x: (first.x + lead.x) / 2 + between(-0.4, 0.4, this.random) * height, y: Math.min(first.y, lead.y) - lift };
          // Pressed flat under the buttons it would be no arc, only a kink.
          if (!sky.under.length || keep(top).y <= top.y) via.push(keep(top));
        }
      }
      // Coming from the wrong side: fly past, turn in the air and come back to land facing out.
      const last = via[via.length - 1] ?? first;
      if (facing * (lead.x - last.x) < 0.5 * destHeight) {
        via.push(keep({ x: lead.x - facing * 2.2 * destHeight, y: Math.min(last.y, lead.y - 0.35 * destHeight) }));
      }

      const start = [eye0, ...(from ? [] : [first])];
      let path = new PathCurve([...this.roundCorners([...start, ...via, lead], sky, margin, levelOff), entry]);
      // The curve can bulge above its points: bring the middle of the route down under the navbar.
      const above = sky.top - path.highest;
      if (above > 2 && via.length) path = new PathCurve([...start, ...via.map((p) => ({ x: p.x, y: p.y + above + 2 })), lead, entry]);
      if (path.hits(sky.noFly, margin)) continue;
      const canHover = world.sheets.has('hover') && path.length > 300;
      const canSwoop = world.sheets.has('swoop') && crossing && this.random() < SWOOP_CHANCE;
      let plan = planStretches(path, { hover: Boolean(options.hover) && canHover, swoop: canSwoop });
      if (hoverOver && canHover) plan = this.hoverAt(path, plan, hoverOver);
      const flight = new FlightRun(path, plan, this.flightSprites(), from?.flip ?? this.facing < 0, this.k, kTo, from?.speed, undefined, sky.cruise);
      return { run: flight, approach: dir, takeoffDir };
    }
    return null;
  }

  /** Hangs for about a second over a point of the path: long enough to look at the words. */
  private hoverAt(path: PathCurve, plan: Stretch[], over: Point) {
    let at = 0;
    let best = Infinity;
    for (let s = 0; s < path.length; s += 10) {
      const p = path.at(s);
      const gap = Math.hypot(p.x - over.x, p.y - over.y);
      if (gap < best) {
        best = gap;
        at = s;
      }
    }
    const from = at - HOVER_HALF_PX;
    const to = at + HOVER_HALF_PX;
    const out: Stretch[] = [];
    for (const stretch of plan) {
      if (stretch.end <= from) out.push(stretch);
      else if (!out.some((s) => s.kind === 'hover')) {
        out.push({ end: from, kind: stretch.kind }, { end: to, kind: 'hover' });
        if (stretch.end > to) out.push(stretch);
      } else if (stretch.end > to) out.push(stretch);
    }
    return out;
  }

  private stepFlight(dt: number) {
    const { flight, dest, world } = this;
    if (!flight || !dest) return;
    if (dest.gone) this.reroute();
    const now = world.at(dest);
    flight.kTo = this.targetK(dest);
    const p = flight.step(dt, { x: now.x - this.destAtStart.x, y: now.y - this.destAtStart.y });
    this.k = p.k;
    this.pose = {
      anim: p.anim,
      frame: p.frame,
      x: p.x,
      y: p.y,
      pin: { ...this.atlas.animations[p.anim].anchor },
      flip: p.flip,
      rot: p.rot,
      sx: p.sx,
      k: p.k,
      breathe: false,
      fixed: false,
      slow: false,
      perch: null,
      surface: 'air',
      clip: 0,
    };
    if (flight.done) this.beginLanding(flight);
  }

  private reroute() {
    const { flight, pose } = this;
    if (!flight) return;
    const dest = this.choosePerch(this.perches());
    if (!dest) return;
    const route = this.routeTo(dest, {}, { eye: { x: pose.x, y: pose.y }, speed: Math.max(120, flight.step(0, { x: 0, y: 0 }).speed), flip: pose.flip });
    if (!route) return;
    this.dest = dest;
    this.destAtStart = this.world.at(dest);
    this.flight = route.run;
    this.approach = route.approach;
    this.lastRoute = { path: route.run.path, plan: route.run.plan };
  }

  private beginLanding(flight: FlightRun) {
    const dest = this.dest!;
    const { approach } = this;
    this.flight = null;
    this.perch = dest;
    this.dest = null;
    this.facing = this.pose.flip ? -1 : 1;
    this.landingBank = new Follow(flight.bankAngle);
    this.state = 'landing';
    const landing = new Clip('landing', run(1, 8, 2), {
        locked: true,
        anchor: (time) => {
          const back = landingBack(time);
          const at = this.world.at(dest);
          return { x: at.x - approach.x * back, y: at.y - approach.y * back };
        },
        on: { 4: () => this.world.react(dest, 'land') },
    });
    landing.time = flight.overrun;
    this.play(landing, () => {
      this.landingBank = null;
      this.rest();
    });
    this.compose();
  }

  // -------------------------------------------------------------------- the pose

  private height() {
    return this.atlas.referenceHeight * this.k;
  }

  private targetK(perch: Perch) {
    return this.world.heightOn(perch) / this.atlas.referenceHeight;
  }

  private standingPose(anim: BirdAnim, frame: number, unflipped: boolean): BirdPose {
    const { anchor } = this.atlas.animations[anim];
    const feet = this.world.at(this.perch);
    return {
      anim,
      frame,
      x: feet.x,
      y: feet.y,
      pin: { x: anchor.x, y: anchor.y },
      flip: !unflipped && this.facing < 0,
      rot: 0,
      sx: 1,
      k: this.k,
      breathe: false,
      fixed: true,
      slow: false,
      perch: this.perch.id,
      surface: this.perch.el ? 'letter' : this.perch.palm ? 'palm' : 'ground',
      clip: this.clip?.id ?? 0,
    };
  }

  private compose() {
    const { clip } = this;
    if (clip) {
      const pose = this.standingPose(clip.anim, clip.frame, Boolean(clip.options.unflipped));
      pose.breathe = Boolean(clip.options.breathe);
      pose.slow = this.reduced;
      if (clip.options.anchor) {
        const at = clip.options.anchor(clip.time);
        pose.x = at.x;
        pose.y = at.y;
        pose.fixed = false;
      }
      if (this.landingBank && clip.anim === 'landing') {
        // Levels off about the eye, so the bank from the flight carries through without a snap.
        const eye = this.handover('landing');
        const world = worldOf(eye, pose.pin, pose, pose.flip, pose.k);
        pose.rot = this.landingBank.value;
        pose.x = world.x;
        pose.y = world.y;
        pose.pin = eye;
      }
      this.pose = pose;
      return;
    }
    const gazing = this.gaze <= 0.02 ? 1 : this.gaze < LOOK_S * 0.8 ? 2 : 3;
    const pose = this.standingPose('look-around', gazing, false);
    pose.breathe = true;
    this.pose = pose;
  }

  private reducedLoop() {
    this.state = 'reduced';
    this.clip = new Clip('look-around', [[1, 72], [2, 24], [3, 48], [4, 8], [3, 24], [2, 24]], { loop: true });
  }
}
