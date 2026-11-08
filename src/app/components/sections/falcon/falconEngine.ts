/**
 * The falcon on the line between the hero and the purple section: the story (a queue of clips, each
 * built from where the falcon is when it starts) and the render loop. Brief:
 * design-handoff/falcon-sprites/VSCODE_FALCON_PROMPT.md; the motion is ported from film2.py there.
 *
 * Canvas CSS px throughout: x from the canvas's left edge (the viewport's), y from its top, with the
 * line at 4.4 H. Times in seconds of falcon time, which only runs while the line is near the screen
 * and the tab is visible.
 */
import { readWaterfall } from '../island/waterfallEnd';
import { readFallFoot, setFallBlock } from '../island/waterfallFoot';
import {
  ALL_SHEETS,
  bounds,
  covers,
  drawCmd,
  frameCmd,
  loadFalconAtlas,
  rand,
  silhouetteIoU,
  smooth,
  topBetween,
  headOffset,
  useMobileSheets,
  type Box,
  type DrawCmd,
  type FalconAnim,
  type FalconSheets,
  type Pt,
} from './falconAtlas';
import { Bank, flightFrame, planFlight, type Flight } from './falconFlight';
import { FalconWater, type Landing } from './falconWater';
import { GlassCrack } from './glassCrack';
import { Walk, walkerCmds, type Foot, type Scale } from './walker';

/** What the falcon tells the sound. It knows nothing about audio. x in viewport px. */
export interface FalconSoundSink {
  touched(x: number): void;
  cue(name: string, opts: { x: number; gainDb?: number; delay?: number }): void;
}

type Sheet = Exclude<FalconAnim, 'walk'>;
type Dir = 1 | -1;
type Edge = 'left' | 'right';
type Phase = 'peek' | 'walk' | 'look' | 'soak' | 'dash' | 'drip' | 'shake' | 'turn' | 'screech' | 'takeoff' | 'fly' | 'landing' | 'face' | 'knock';

interface ClipBase {
  id: number;
  dur: number;
  fired: Set<string>;
}
interface AnimClip extends ClipBase {
  kind: 'anim';
  phase: Phase;
  anim: Sheet;
  order: number[];
  fps: number;
  flip: Dir;
  x: number;
  facingAfter: Dir;
  water?: boolean;
  first?: boolean;
  knock?: boolean;
}
interface WalkClip extends ClipBase {
  kind: 'walk';
  phase: 'walk' | 'dash';
  walk: Walk;
  facing: Dir;
}
interface FlyClip extends ClipBase {
  kind: 'fly';
  phase: 'fly';
  flight: Flight;
}
type Clip = AnimClip | WalkClip | FlyClip;
type Step = () => Clip | null;

interface Fall {
  x: number;
  w: number;
}

interface View {
  cmds: DrawCmd[];
  key: string;
  anim: string;
  n: number;
  anchor: Pt;
  eye?: Pt;
  beak?: Pt;
  mist?: { x: number; y: number };
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ox: number;
}

const TOP_H = 4.4; // the canvas reaches this many heights above the line
const SPAN_H = 4.9; // and 0.5 H below it
const LAYER_H = 4.8; // the offscreen falcon layer's width, in heights
const REFERENCE_H = 121; // the film's height: drop sizes and speeds scale from it

const SOAK_ORDER = [2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6];
const LUNGE: Record<number, number> = { 1: 1.0, 2: 1.25, 3: 1.1, 4: 1.45, 5: 1.15, 6: 1.1, 7: 1.45, 8: 1.0 };
const SOAK_HEAD: Record<number, number> = { 2: 0.92, 3: 0.72, 4: 0.62, 5: 0.62 };

const FIRST_WAIT_S = 2.5;
const AWAY_S: [number, number] = [6, 14];
const OFF_SCREEN_S = 20;
const COOLDOWN_S = 12;
const KEK_GAP_S = 2;
const GLARE_S = 0.6;
const TAKEOFF_EARLY_S = 0.08;
const FX_TICK = 1 / 24; // the particle maths and the cross-fade steps run at the film's 24 ticks/s
const CROSS_FADE = [0.6, 0.35, 0.15];
const IN_BETWEEN = [0.5];
const FINGER_REACH = 10;
const MIN_ROOM_H = 0.35; // between an edge and the fall, to come in from that edge

const TOUCHABLE: Phase[] = ['peek', 'walk', 'look', 'screech', 'turn', 'landing'];
const STANDING: Phase[] = ['peek', 'look', 'screech', 'landing'];

const other = (edge: Edge): Edge => (edge === 'left' ? 'right' : 'left');

interface Options {
  canvas: HTMLCanvasElement;
  /** A 1-px element on the line: what the observers watch. */
  sentinel: HTMLElement;
  sounds?: FalconSoundSink;
  reduced: boolean;
}

export class FalconEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sentinel: HTMLElement;
  private sounds?: FalconSoundSink;
  private reduced: boolean;
  private sheets: FalconSheets | null = null;
  private water = new FalconWater();
  private glass: GlassCrack;
  private cleanups: (() => void)[] = [];
  private disposed = false;

  // Measures
  private dpr = 1;
  private W = 0;
  private H = 0;
  private DS = 0;
  private line = 0;
  private left = 0;
  private scale: Scale = { H: 0, DS: 0 };
  private layers: Layer[] = [];

  // The loop
  private ready = false;
  private storyLoading: Promise<void> | null = null;
  private running = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private ticks = 0;
  private fxAcc = 0;
  private fxTicks = 0;
  private near = false;
  private inView = false;
  private tabVisible = !document.hidden;
  private offSince: number | null = null;

  // The story
  private clip: Clip | null = null;
  private tau = 0;
  private queue: Step[] = [];
  private ids = 0;
  private x = 0;
  private facing: Dir = 1;
  private lastEdge: Edge | null = null;
  private visitEdge: Edge = 'left';
  private exitEdge: Edge | null = null;
  private awayLeft: number;
  private screeched = false;
  private fall: Fall | null = null;
  private plannedFall: Fall | null = null;
  private pendingTouch = false;
  private cooldownUntil = -Infinity;
  private lastKek = -Infinity;
  private glare: { until: number; facing: Dir } | null = null;
  private bank = new Bank();

  // Drawing
  private view: View | null = null;
  private viewBox: Box | null = null;
  private prevLayer: Layer | null = null;
  private prevKey: string | null = null;
  private prevCmds: DrawCmd[] = [];
  private fade: { layer: Layer; start: number; steps: number[] } | null = null;
  private tweenIoU = new Map<string, number>();
  private waterTop: number | null = null;
  /** Where the fall lands on the falcon this tick, slice by slice. */
  private landing: Landing | null = null;
  /** The head in the soaked frames, sheet px ahead of the feet: the fall comes down on it. */
  private soakHead: number | null = null;

  // Debug
  private readonly modes = new URLSearchParams(window.location.search).getAll('falcon');
  private readonly debug = this.modes.includes('debug');
  /** `?falcon=trace`: the keys and window.__falcon without the drawing, for checks and screenshots. */
  private readonly checks = this.debug || this.modes.includes('trace');
  private events: { t: number; name: string; x: number; gainDb: number }[] = [];
  private changes: string[] = [];
  private tint: HTMLCanvasElement | null = null;
  private feet: Foot[] | null = null;

  constructor({ canvas, sentinel, sounds, reduced }: Options) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas');
    this.canvas = canvas;
    this.ctx = ctx;
    this.sentinel = sentinel;
    this.sounds = sounds;
    this.reduced = reduced;
    this.awayLeft = this.modes.includes('now') ? 0 : FIRST_WAIT_S;
    this.glass = new GlassCrack((x) => this.cueAt('glass-fade', x));
  }

  async start() {
    this.sheets = await loadFalconAtlas(useMobileSheets());
    if (this.disposed) {
      this.sheets.dispose();
      return;
    }
    this.measure();
    this.listen();
    if (this.checks) this.exposeForChecks();
    if (this.reduced) {
      await this.sheets.load(['look-around']);
      if (this.reduced) this.drawStill();
    } else {
      await this.loadStory();
    }
  }

  dispose() {
    this.disposed = true;
    this.halt();
    this.cleanups.forEach((cleanup) => cleanup());
    this.glass.dispose();
    this.sheets?.dispose();
    setFallBlock(null);
  }

  /** Reduced motion switched while the page is open. */
  setReduced(reduced: boolean) {
    if (reduced === this.reduced) return;
    this.reduced = reduced;
    if (reduced) {
      this.sendAway();
      this.sync();
      void this.sheets?.load(['look-around']).then(() => this.reduced && this.drawStill());
    } else {
      this.clearMain();
      void this.loadStory();
    }
  }

  private loadStory() {
    this.storyLoading ??= (async () => {
      const sheets = this.sheets!;
      const ok = await sheets.load(ALL_SHEETS);
      await this.water.load();
      if (this.disposed) return;
      // A sheet that failed leaves the falcon away for good.
      this.ready = ok;
      this.soakHead = headOffset(this.sheets!, 'soaked', [2, 3, 4, 5]);
      const later = () => void this.glass.load();
      if ('requestIdleCallback' in window) window.requestIdleCallback(later, { timeout: 4000 });
      else setTimeout(later, 1500);
      this.sync();
    })();
    return this.storyLoading;
  }

  // -------------------------------------------------------------------- measuring

  private measure() {
    const box = this.canvas.getBoundingClientRect();
    const widthChanged = Math.abs(box.width - this.W) > 1;
    this.W = box.width;
    this.left = box.left;
    this.H = box.height / SPAN_H;
    this.line = TOP_H * this.H;
    this.DS = this.H / (this.sheets?.atlas.referenceHeight ?? 1);
    this.scale = { H: this.H, DS: this.DS };
    this.water.k = this.H / REFERENCE_H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(box.height * this.dpr));
    this.layers = [0, 1, 2].map(() => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(LAYER_H * this.H * this.dpr));
      canvas.height = this.canvas.height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      return { canvas, ctx, ox: 0 };
    });
    this.prevLayer = null;
    this.prevKey = null;
    this.fade = null;
    this.tweenIoU.clear();
    // The falcon's size and the fall both move with the width: it comes back later instead.
    if (widthChanged && this.clip) this.sendAway();
    if (this.reduced) this.drawStill();
  }

  private listen() {
    const resize = new ResizeObserver(() => this.measure());
    resize.observe(this.canvas);
    this.cleanups.push(() => resize.disconnect());

    const near = new IntersectionObserver(
      ([entry]) => {
        this.near = entry.isIntersecting;
        this.sync();
      },
      { rootMargin: '200px 0px' },
    );
    near.observe(this.sentinel);
    const seen = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
    });
    seen.observe(this.sentinel);
    this.cleanups.push(() => {
      near.disconnect();
      seen.disconnect();
    });

    const onVisibility = () => {
      this.tabVisible = !document.hidden;
      this.sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

    // On the window and passive: the canvases take no pointer events, so what is under them still works.
    const onPointer = (event: PointerEvent) => this.onPointer(event);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
    });

    if (this.checks) {
      const onKey = (event: KeyboardEvent) => this.debugKey(event.key.toLowerCase());
      window.addEventListener('keydown', onKey);
      this.cleanups.push(() => window.removeEventListener('keydown', onKey));
    }
  }

  // -------------------------------------------------------------------- the loop

  private sync() {
    const run = this.ready && !this.reduced && this.near && this.tabVisible && !this.disposed;
    if (run) {
      if (this.clip && this.offSince !== null && performance.now() - this.offSince > OFF_SCREEN_S * 1000) this.sendAway();
      this.offSince = null;
      this.resume();
    } else {
      if (this.offSince === null && this.ready) this.offSince = performance.now();
      this.halt();
    }
  }

  private resume() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private halt() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.tick(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private tick(dt: number) {
    this.time += dt;
    this.ticks += 1;
    this.fall = this.readFall();
    if (this.clip) this.advance(dt);
    else this.waitAway(dt);
    this.view = this.clip ? this.compose(dt) : null;
    this.fxAcc += dt;
    while (this.fxAcc >= FX_TICK) {
      this.fxAcc -= FX_TICK;
      this.fxTicks += 1;
      this.spawnFx();
    }
    this.water.step(dt, this.line);
    this.render();
  }

  private readFall(): Fall | null {
    const foot = readFallFoot();
    if (!foot) return null;
    const x = foot.x - this.left;
    return x >= 0 && x <= this.W ? { x, w: foot.width } : null;
  }

  // -------------------------------------------------------------------- the story

  private waitAway(dt: number) {
    if (this.inView) this.awayLeft -= dt;
    if (this.awayLeft <= 0) this.planVisit();
  }

  private advance(dt: number) {
    if (this.glare) {
      if (this.time < this.glare.until) return; // the clip holds while it glares at you
      this.glare = null;
    }
    this.tau += dt;
    while (this.clip && this.tau >= this.clip.dur) {
      this.tau -= this.clip.dur;
      this.finish(this.clip);
      if (this.pendingTouch) {
        this.pendingTouch = false;
        this.queue = this.knockSteps();
      }
      this.clip = this.next();
    }
  }

  private finish(clip: Clip) {
    if (clip.kind === 'anim') {
      this.x = clip.x;
      this.facing = clip.facingAfter;
    } else if (clip.kind === 'walk') {
      this.x = clip.walk.x1;
      this.facing = clip.facing;
    } else if (!clip.flight.out) {
      this.x = clip.flight.to;
    }
  }

  private next(): Clip | null {
    while (this.queue.length) {
      const clip = this.queue.shift()!();
      if (clip) return clip;
    }
    this.leave();
    return null;
  }

  /** Off the screen by `exitEdge`: it comes back by the same edge. */
  private leave() {
    this.lastEdge = this.exitEdge ?? (this.x < this.W / 2 ? 'left' : 'right');
    this.awayLeft = rand(...AWAY_S);
    this.clip = null;
    this.queue = [];
    this.pendingTouch = false;
    this.glare = null;
    this.bank = new Bank();
  }

  /** Gone at once: off screen too long, a resize, reduced motion. */
  private sendAway() {
    if (this.clip) this.exitEdge = this.x < this.W / 2 ? 'left' : 'right';
    this.leave();
    this.view = null;
    this.viewBox = null;
    this.water.clear();
    this.fade = null;
    this.prevLayer = null;
    this.prevKey = null;
    this.landing = null;
    setFallBlock(null);
    this.clearMain();
  }

  private clip_<T extends Clip>(clip: Omit<T, 'id' | 'fired'>): T {
    this.ids += 1;
    return { ...clip, id: this.ids, fired: new Set<string>() } as T;
  }

  private anim(
    phase: Phase,
    anim: Sheet,
    flip: Dir,
    x: number,
    o: { order?: number[]; fps?: number; facingAfter?: Dir; water?: boolean; first?: boolean; knock?: boolean } = {},
  ): Clip {
    const a = this.sheets!.atlas.animations[anim];
    const order = o.order ?? a.order;
    const fps = o.fps ?? a.fps;
    return this.clip_<AnimClip>({ kind: 'anim', phase, anim, order, fps, flip, x, dur: order.length / fps, facingAfter: o.facingAfter ?? flip, water: o.water, first: o.first, knock: o.knock });
  }

  /** Never backwards: a walk that would not go forwards is skipped. */
  private walkTo(x1: number, facing: Dir, phase: 'walk' | 'dash' = 'walk'): Clip | null {
    if ((x1 - this.x) * facing < 0.05 * this.H) return null;
    const dash = phase === 'dash';
    const walk = new Walk(this.sheets!.atlas, this.scale, this.x, x1, dash, dash);
    return this.clip_<WalkClip>({ kind: 'walk', phase, walk, facing, dur: walk.T });
  }

  private takeoff(d: Dir) {
    return this.anim('takeoff', 'takeoff', d, this.x, { order: [1, 2, 3, 4] });
  }

  /** To `to` on the line, or out past the edge it faces when `to` is null. */
  private fly(to: number | null, d: Dir): Clip {
    const flight = planFlight(this.sheets!.atlas, this.scale, this.line, this.x, d, to, d > 0 ? this.W : 0);
    if (flight.out) this.exitEdge = d > 0 ? 'right' : 'left';
    return this.clip_<FlyClip>({ kind: 'fly', phase: 'fly', flight, dur: flight.T });
  }

  private fallNow() {
    return this.fall ?? this.plannedFall;
  }

  private planVisit() {
    const { W, H } = this;
    const fall = this.fall;
    let edge: Edge;
    if (fall) {
      // The very first time, from the edge with the longer walk to the fall.
      const room = (e: Edge) => (e === 'left' ? fall.x : W - fall.x) - fall.w / 2;
      edge = this.lastEdge ?? (room('left') >= room('right') ? 'left' : 'right');
      // From the peek it needs a step or two before its head is in the water.
      if (room(edge) < MIN_ROOM_H * H && room(other(edge)) > room(edge)) edge = other(edge);
    } else {
      edge = this.lastEdge ?? 'left';
    }
    const d: Dir = edge === 'left' ? 1 : -1;
    this.visitEdge = edge;
    this.exitEdge = null;
    this.screeched = false;
    this.plannedFall = fall;
    this.x = (edge === 'left' ? 0 : W) - d * 0.15 * H; // only the head and chest show
    this.facing = d;
    this.queue = [() => this.anim('peek', 'peek', d, this.x), ...(fall ? this.toTheFall(d) : this.dryVisit(d))];
    this.tau = 0;
    this.clip = this.next();
  }

  /** Walk in to the water: it stops with its head just inside the fall's column. */
  private toTheFall(d: Dir): Step[] {
    // It stops with its head under the middle of the fall, so the water comes down on it.
    const stop = () => {
      const f = this.fallNow()!;
      const head = this.soakHead === null ? f.w / 2 + 0.2 * this.H : this.soakHead * this.DS;
      return f.x - d * head;
    };
    return [
      () => {
        const target = stop();
        const D = (target - this.x) * d;
        if (D > 5 * this.H && Math.random() < 0.6) {
          this.queue.unshift(
            () => this.anim('look', 'look-around', d, this.x),
            () => this.walkTo(stop(), d),
          );
          return this.walkTo(this.x + d * 0.4 * D, d);
        }
        return this.walkTo(target, d);
      },
      ...this.soak(d),
    ];
  }

  /** The soak, the dash out, the shake, the screech at the water, and on to the far side. */
  private soak(d: Dir): Step[] {
    const back = (-d) as Dir;
    return [
      () => this.anim('soak', 'soaked', d, this.x, { order: SOAK_ORDER, fps: 9, water: true }),
      () => {
        const f = this.fallNow()!;
        return this.walkTo(f.x + d * (f.w / 2 + 0.5 * this.H), d, 'dash'); // its tail clears the water
      },
      () => this.anim('drip', 'soaked', d, this.x, { order: [8, 8, 8], fps: 9 }),
      () => this.anim('shake', 'shake', d, this.x),
      () => this.anim('turn', 'turn', d, this.x, { facingAfter: back }), // faces the fall
      () => this.anim('screech', 'screech', back, this.x, { first: true }),
      () => this.anim('turn', 'turn', d, this.x, { order: [8, 7, 6, 5, 4, 3, 2, 1], facingAfter: d }), // its back to it
      () => this.flyOn(d),
    ];
  }

  /** On to the far side, never back over the fall; straight out when there is no room to land. */
  private flyOn(d: Dir): Clip {
    const { W, H } = this;
    const f = this.fallNow()!;
    const room = d > 0 ? W - f.x : f.x;
    const out = () => this.fly(null, d);
    let land = f.x + d * 0.62 * room;
    land = d > 0 ? Math.min(land, W - 1.4 * H) : Math.max(land, 1.4 * H);
    if (room < 3 * H || (land - this.x) * d < H) {
      this.queue.unshift(out);
      return this.takeoff(d);
    }
    this.queue.unshift(
      () => this.fly(land, d),
      () => this.anim('landing', 'landing', d, land, { order: [5, 6, 7, 8] }),
      () => this.anim('look', 'look-around', d, this.x),
      () => this.takeoff(d),
      out,
    );
    return this.takeoff(d);
  }

  /** No water on the line: in, a look round, and off by the far edge. */
  private dryVisit(d: Dir): Step[] {
    return [
      () => this.walkTo(this.W * rand(0.35, 0.65), d),
      () => this.anim('look', 'look-around', d, this.x),
      () => this.takeoff(d),
      () => this.fly(null, d),
    ];
  }

  /** Turns to face you, knocks twice, turns its back on the fall and walks off the way it came. */
  private knockSteps(): Step[] {
    const f0 = this.facing;
    const fall = this.fallNow();
    const away: Dir = fall ? (this.x < fall.x ? -1 : 1) : this.visitEdge === 'left' ? -1 : 1;
    return [
      () => this.anim('face', 'turn', 1, this.x, { order: f0 > 0 ? [1, 2, 3, 4] : [8, 7, 6, 5, 4], fps: 12, facingAfter: f0 }),
      () => this.anim('knock', 'knock', 1, this.x, { knock: true, facingAfter: f0 }),
      () => this.anim('turn', 'turn', 1, this.x, { order: away > 0 ? [4, 3, 2, 1] : [4, 5, 6, 7, 8], fps: 12, facingAfter: away }),
      () => this.anim('screech', 'screech', away, this.x),
      () => {
        this.exitEdge = away > 0 ? 'right' : 'left';
        return this.walkTo(away > 0 ? this.W + 0.9 * this.H : -0.9 * this.H, away);
      },
    ];
  }

  // -------------------------------------------------------------------- touch

  private onPointer(event: PointerEvent) {
    if (event.type === 'pointermove' && event.pointerType !== 'mouse') return;
    const { viewBox: box, view } = this;
    if (this.reduced || !this.running || !view || !box) return;
    const rect = this.canvas.getBoundingClientRect();
    const X = event.clientX - rect.left;
    const Y = event.clientY - rect.top;
    const near = this.H;
    if (X < box.l - near || X > box.r + near || Y < box.t - near || Y > box.b + near) return;
    void this.glass.load();
    const reach = event.pointerType === 'touch' ? FINGER_REACH : 0;
    const at = (dx: number, dy: number) => covers(this.sheets!, view.cmds, X + dx, Y + dy);
    let hit = at(0, 0);
    for (let i = 0; !hit && reach && i < 8; i += 1) hit = at(Math.cos((i * Math.PI) / 4) * reach, Math.sin((i * Math.PI) / 4) * reach);
    if (hit) this.touched(event.clientX);
  }

  private touched(viewportX: number) {
    const { clip } = this;
    if (!clip) return;
    const cooling = this.time < this.cooldownUntil;
    const allowed = !cooling && TOUCHABLE.includes(clip.phase);
    if (!allowed) {
      if (this.time - this.lastKek >= KEK_GAP_S) {
        this.lastKek = this.time;
        const box = this.viewBox;
        this.cue('falcon-kek', box ? (box.l + box.r) / 2 : this.x);
      }
      if (cooling && clip.kind === 'anim' && STANDING.includes(clip.phase) && !this.glare) {
        this.glare = { until: this.time + GLARE_S, facing: clip.flip };
      }
      return;
    }
    this.sounds?.touched(viewportX);
    this.cooldownUntil = this.time + COOLDOWN_S;
    this.lastKek = this.time;
    void this.glass.load();
    // A turn finishes first: halfway round, it has no side to turn from.
    if (clip.kind === 'anim' && clip.phase === 'turn') {
      this.pendingTouch = true;
      return;
    }
    this.knockNow();
  }

  private knockNow() {
    const { clip } = this;
    if (!clip || clip.kind === 'fly') return;
    if (clip.kind === 'anim') {
      this.x = clip.x;
      this.facing = clip.phase === 'turn' ? clip.facingAfter : clip.flip;
    } else {
      this.facing = clip.facing; // x follows the walk every tick
    }
    this.glare = null;
    this.queue = this.knockSteps();
    this.tau = 0;
    this.clip = this.next();
  }

  // -------------------------------------------------------------------- one tick of the falcon

  private compose(dt: number): View {
    const atlas = this.sheets!.atlas;
    const { DS, line } = this;
    const clip = this.clip!;

    if (this.glare) {
      this.bank.relax(dt);
      const cmd = frameCmd(atlas, 'look-around', 3, this.glare.facing, this.x, line, DS);
      return { cmds: [cmd], key: `look-around|3|${this.glare.facing}`, anim: 'look-around', n: 3, anchor: [this.x, line] };
    }

    if (clip.kind === 'walk') {
      this.bank.relax(dt);
      const { walk } = clip;
      const pose = walk.pose(this.tau, line, (foot, x) => this.cue('falcon-step', x, walk.dash ? -3 : foot === 0 ? -2 : -3));
      this.x = pose.bx;
      this.feet = pose.feet;
      return { cmds: walkerCmds(atlas, DS, pose, clip.facing, walk.wet), key: `walk|${walk.wet}`, anim: 'walk', n: 0, anchor: [pose.bx, line] };
    }

    if (clip.kind === 'fly') {
      const f = clip.flight.facing;
      const frame = flightFrame(atlas, clip.flight, this.tau);
      this.bank.fly(frame, f, dt);
      const cmd = frameCmd(atlas, frame.anim, frame.n, f, frame.eye[0], frame.eye[1], DS, 'eye', (-this.bank.angle * Math.PI) / 180);
      this.flightSounds(clip, frame.anim, frame.n, frame.loop, frame.eye[0]);
      return { cmds: [cmd], key: `${frame.anim}|${frame.n}|${f}`, anim: frame.anim, n: frame.n, anchor: frame.eye, eye: frame.eye };
    }

    this.bank.relax(dt);
    const len = clip.order.length;
    const pos = this.tau * clip.fps;
    const k = Math.min(Math.floor(pos), len - 1);
    const n = clip.order[k];
    let scale = 1;
    if (clip.knock) {
      // The lunge: eased from one key size to the next across each frame's time, never stepped.
      const k1 = Math.min(k + 1, len - 1);
      const s0 = LUNGE[clip.order[k]];
      const s1 = LUNGE[clip.order[k1]];
      scale = s0 + (s1 - s0) * smooth(pos - k);
    }
    const a = atlas.animations[clip.anim];
    const cmd = frameCmd(atlas, clip.anim, n, clip.flip, clip.x, line, DS * scale);
    const view: View = { cmds: [cmd], key: `${clip.anim}|${n}|${clip.flip}`, anim: clip.anim, n, anchor: [clip.x, line] };
    const info = a.frameInfo[n - 1];
    if (info?.eye) view.eye = [clip.x + clip.flip * (info.eye[0] - a.anchor[0]) * DS * scale, line + (info.eye[1] - a.anchor[1]) * DS * scale];
    if (info?.beak) view.beak = [clip.x + clip.flip * (info.beak[0] - a.anchor[0]) * DS * scale, line + (info.beak[1] - a.anchor[1]) * DS * scale];
    const fall = this.fallNow();
    if (clip.water && fall && SOAK_HEAD[n]) view.mist = { x: fall.x, y: line - this.H * SOAK_HEAD[n] };
    this.frameSounds(clip, n, scale);
    return view;
  }

  /** The cues of the brief's sound table that hang on a frame of a clip on the line. */
  private frameSounds(clip: AnimClip, n: number, scale: number) {
    if (clip.anim === 'takeoff' && !clip.fired.has('wings')) {
      const left = clip.dur - this.tau; // its wings are heard just before take-off frame 5 shows
      if (left <= TAKEOFF_EARLY_S) {
        clip.fired.add('wings');
        this.cue('falcon-wing-takeoff', clip.x, 0, left);
      }
    }
    const key = String(n);
    if (clip.fired.has(key)) return;
    clip.fired.add(key);
    const fall = this.fallNow();
    switch (`${clip.anim} ${n}`) {
      case 'soaked 2':
        if (clip.water) this.cue('water-on-falcon', fall?.x ?? clip.x);
        break;
      case 'soaked 4':
        if (clip.water) this.cue('water-on-falcon', fall?.x ?? clip.x, -5);
        break;
      case 'shake 2':
        this.cue('falcon-shake', clip.x);
        break;
      case 'turn 3':
      case 'turn 6':
        this.cue('falcon-step', clip.x, -5);
        break;
      case 'screech 3':
        if (clip.first && !this.screeched) {
          this.screeched = true;
          this.cue('falcon-screech', clip.x);
        } else {
          this.cue('falcon-kek', clip.x);
        }
        break;
      case 'landing 5':
        this.cue('falcon-step', clip.x);
        break;
      default:
    }
    if (clip.knock) {
      const hit = this.sheets!.atlas.animations.knock.hits?.find((h) => h.frame === n);
      if (hit) this.knockHit(hit, clip.x, scale);
    }
  }

  private flightSounds(clip: FlyClip, anim: string, n: number, loop: number, x: number) {
    const { fired } = clip;
    if (anim === 'flap' && n === 1 && !fired.has(`flap ${loop}`)) {
      fired.add(`flap ${loop}`);
      this.cue('falcon-wing-flap', x, -1);
    }
    if (anim === 'glide' && !fired.has('glide')) {
      fired.add('glide');
      this.cue('falcon-wing-swoop', x, -2);
    }
    if (anim === 'landing' && n === 1 && !fired.has('landing')) {
      fired.add('landing');
      this.cue('falcon-wing-landing', x);
    }
  }

  /** A beak hit: the crack centred on the beak, through the anchor and the lunge. */
  private knockHit(hit: { crack: 1 | 2; beak: Pt }, x: number, scale: number) {
    const a = this.sheets!.atlas.animations.knock;
    const bx = x + (hit.beak[0] - a.anchor[0]) * this.DS * scale;
    const by = this.line + (hit.beak[1] - a.anchor[1]) * this.DS * scale;
    const rect = this.canvas.getBoundingClientRect();
    const vx = rect.left + bx;
    this.glass.hit(hit.crack, vx, rect.top + by);
    this.cueAt('glass-knock', vx);
    this.cueAt('glass-crack', vx, hit.crack === 1 ? -1 : 0, 0.03);
    this.cueAt('glass-tinkle', vx, 0, 0.1);
  }

  private cue(name: string, canvasX: number, gainDb = 0, delay = 0) {
    this.cueAt(name, canvasX + this.left, gainDb, delay);
  }

  private cueAt(name: string, x: number, gainDb = 0, delay = 0) {
    this.sounds?.cue(name, { x, gainDb, delay });
    if (this.checks) this.events.push({ t: +this.time.toFixed(3), name, x: Math.round(x), gainDb });
  }

  /** The water's particles, at the film's 24 ticks a second. */
  private spawnFx() {
    const { view, clip, water, line, H } = this;
    if (!view || !clip) return;
    const k = water.k;
    const t = this.fxTicks;
    const fall = this.fallNow();
    const landing = this.landing;
    if (landing && fall) {
      const hits = landing.tops.flatMap((top, i) => (top === null ? [] : [[landing.x0 + (i + Math.random()) * landing.step, top] as const]));
      if (hits.length) {
        // The splash, thrown up and out from where the fall hits it.
        for (let i = 0; i < 2; i += 1) {
          const [x, y] = hits[Math.floor(Math.random() * hits.length)];
          const out = Math.sign(x - fall.x) || (Math.random() < 0.5 ? -1 : 1);
          water.spawn(x, y + rand(-2, 3) * k, out * rand(40, 170) + rand(-30, 30), rand(-230, -60), rand(4, 9));
        }
        // And water running off its sides.
        if (t % 3 === 0) {
          const [x, y] = hits[Math.floor(Math.random() * hits.length)];
          const out = Math.sign(x - fall.x) || 1;
          water.spawn(x + out * rand(2, 8) * k, y + H * rand(0.08, 0.3), out * rand(10, 50), rand(30, 90), rand(3, 6));
        }
      }
    }
    if (view.mist) {
      for (let i = 0; i < 3; i += 1) water.spawn(view.mist.x + rand(-12, 12) * k, view.mist.y + rand(-4, 6) * k, rand(-160, 160), rand(-200, -40));
    }
    const drip = (x: number) => water.spawn(x, line - H * rand(0.2, 0.75), 0, rand(10, 60), rand(4, 7));
    if (clip.kind === 'walk' && clip.walk.wet && t % 2 === 0) drip(this.x + rand(-25, 30) * k);
    if (clip.kind !== 'anim' || this.glare) return;
    const { anim } = clip;
    const n = view.n;
    if ((anim === 'soaked' && n === 8 && t % 3 === 0) || (anim === 'shake' && n <= 2 && t % 4 === 0)) drip(clip.x + clip.flip * rand(-30, 45) * k);
    if (anim === 'shake' && n >= 3 && n <= 5) {
      for (let i = 0; i < 5; i += 1) {
        const a = rand(0, Math.PI * 2);
        const v = rand(140, 330);
        water.spawn(clip.x + Math.cos(a) * 30 * k, line - H * 0.55 + Math.sin(a) * 40 * k, Math.cos(a) * v, Math.sin(a) * v - 60);
      }
    }
  }

  // -------------------------------------------------------------------- drawing

  private clearMain() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private freeLayer() {
    return this.layers.find((layer) => layer !== this.prevLayer && layer !== this.fade?.layer)!;
  }

  private render() {
    const { ctx, dpr, view } = this;
    const sheets = this.sheets!;
    this.clearMain();
    this.waterTop = null;
    this.viewBox = null;

    if (view) {
      const layer = this.freeLayer();
      const box = bounds(view.cmds)!;
      this.viewBox = box;
      const lw = layer.canvas.width / dpr;
      layer.ox = Math.round(((box.l + box.r) / 2 - lw / 2) * dpr) / dpr;
      const lc = layer.ctx;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      lc.setTransform(dpr, 0, 0, dpr, -layer.ox * dpr, 0);
      for (const cmd of view.cmds) drawCmd(lc, sheets, cmd);

      // The fall comes down on whatever part of the falcon is in it: it stops there (the waterfall
      // is told, slice by slice), runs down its feathers, and foams and splashes on top of it.
      const fall = this.fall;
      this.landing = fall ? this.landingOn(view.cmds, fall) : null;
      if (this.landing && fall) {
        const { tops, x0, step } = this.landing;
        this.water.drawPour(lc, dpr, this.landing, fall.w, this.time, this.H);
        let top = Infinity;
        let lo = Infinity;
        let hi = -Infinity;
        tops.forEach((y, i) => {
          if (y === null) return;
          top = Math.min(top, y);
          lo = Math.min(lo, x0 + i * step);
          hi = Math.max(hi, x0 + (i + 1) * step);
        });
        this.waterTop = top;
        if (view.mist) this.water.drawMist(lc, (lo + hi) / 2, top, 0.75 * this.H, 0.55);
        this.water.drawFoam(lc, (lo + hi) / 2, top, Math.min(2.2 * fall.w, hi - lo + fall.w), this.time);
      } else if (view.mist) {
        this.water.drawMist(lc, view.mist.x, view.mist.y, 0.75 * this.H, 0.55);
      }
      setFallBlock(
        this.landing
          ? { x0: this.landing.x0, step: this.landing.step, rise: Float32Array.from(this.landing.tops, (y) => (y === null ? 0 : this.line - y)) }
          : null,
      );

      this.chooseFade(view);
      const jitter = this.glass.jitter(this.ticks);
      ctx.drawImage(layer.canvas, Math.round((layer.ox + jitter) * dpr), 0);
      if (this.fade) {
        const step = Math.floor((this.time - this.fade.start) / FX_TICK);
        if (step >= this.fade.steps.length) this.fade = null;
        else {
          ctx.globalAlpha = this.fade.steps[step];
          ctx.drawImage(this.fade.layer.canvas, Math.round(this.fade.layer.ox * dpr), 0);
          ctx.globalAlpha = 1;
        }
      }
      this.prevLayer = layer;
      this.prevKey = view.key;
      this.prevCmds = view.cmds;
    } else {
      this.prevLayer = null;
      this.prevKey = null;
      this.fade = null;
      if (this.landing) setFallBlock(null);
      this.landing = null;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.water.drawDrops(ctx);
    if (this.debug) this.drawDebug();
  }

  /** In slices about 2 px wide across the fall: the falcon's highest pixel in each, if any. */
  private landingOn(cmds: DrawCmd[], fall: Fall): Landing | null {
    const n = Math.max(2, Math.round(fall.w / 2));
    const step = fall.w / n;
    const x0 = fall.x - fall.w / 2;
    let any = false;
    const tops: (number | null)[] = [];
    for (let i = 0; i < n; i += 1) {
      const X = x0 + (i + 0.5) * step;
      const top = topBetween(this.sheets!, cmds, X, X);
      const lands = top !== null && top < this.line - 1;
      tops.push(lands ? top : null);
      any ||= lands;
    }
    return any ? { x0, step, tops } : null;
  }

  /**
   * A new animation fades in over the old one when their silhouettes overlap; inside an animation the
   * first moment of each new frame shows the previous one at half.
   */
  private chooseFade(view: View) {
    const { prevKey, prevLayer } = this;
    if (!prevKey || !prevLayer || view.key === prevKey) return;
    const sheets = this.sheets!;
    const before = prevKey.split('|')[0];
    if (before !== view.anim) {
      const threshold = before === 'walk' || view.anim === 'walk' ? 0.55 : 0.4;
      const iou = silhouetteIoU(sheets, this.prevCmds, view.cmds);
      if (iou >= threshold) this.fade = { layer: prevLayer, start: this.time, steps: CROSS_FADE };
      if (this.checks) this.changes.push(`${before}>${view.anim} ${iou.toFixed(2)} ${iou >= threshold ? 'fade' : 'cut'}`);
      return;
    }
    if (view.anim === 'walk') return;
    const still = view.cmds.every((cmd) => !cmd.rot) && this.prevCmds.every((cmd) => !cmd.rot) && view.anim !== 'knock';
    const pair = `${prevKey}>${view.key}`;
    let iou = still ? this.tweenIoU.get(pair) : undefined;
    if (iou === undefined) {
      iou = silhouetteIoU(sheets, this.prevCmds, view.cmds);
      if (still) this.tweenIoU.set(pair, iou);
    }
    if (iou >= 0.72) this.fade = { layer: prevLayer, start: this.time, steps: IN_BETWEEN };
  }

  /** Reduced motion: standing still, looking round, 18 % in from the edge farther from the fall. */
  private drawStill() {
    const sheets = this.sheets;
    this.clearMain();
    if (!sheets?.has('look-around') || !this.W) return;
    const ends = readWaterfall();
    const fallX = ends ? (ends.bl.x + ends.br.x) / 2 - this.left : null;
    const fromLeft = fallX === null || fallX > this.W / 2;
    const facing: Dir = fromLeft ? 1 : -1;
    const x = fromLeft ? 0.18 * this.W : 0.82 * this.W;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawCmd(this.ctx, sheets, frameCmd(sheets.atlas, 'look-around', 1, facing, x, this.line, this.DS));
  }

  // -------------------------------------------------------------------- debug (?falcon=debug)

  private drawDebug() {
    const { ctx, view, line, W } = this;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgb(255 40 40 / 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, line + 0.5);
    ctx.lineTo(W, line + 0.5);
    ctx.stroke();
    const fall = this.fall;
    if (fall) {
      ctx.strokeStyle = 'rgb(0 200 255 / 0.9)';
      ctx.strokeRect(fall.x - fall.w / 2, 0, fall.w, line);
    }
    if (view && this.prevLayer) {
      // The hit mask: the falcon's own opaque pixels, tinted.
      const src = this.prevLayer.canvas;
      this.tint ??= document.createElement('canvas');
      const tint = this.tint;
      tint.width = src.width;
      tint.height = src.height;
      const tc = tint.getContext('2d')!;
      tc.drawImage(src, 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = 'rgb(255 0 120 / 0.35)';
      tc.fillRect(0, 0, tint.width, tint.height);
      ctx.drawImage(tint, this.prevLayer.ox, 0, tint.width / this.dpr, tint.height / this.dpr);
      const dot = ([x, y]: Pt, colour: string) => {
        ctx.fillStyle = colour;
        ctx.fillRect(x - 3, y - 3, 6, 6);
      };
      dot(view.anchor, '#ff2828');
      if (view.eye) dot(view.eye, '#00e676');
      if (view.beak) dot(view.beak, '#ffd400');
      const box = this.viewBox!;
      const clip = this.clip;
      const cooling = this.time < this.cooldownUntil ? ` cool ${(this.cooldownUntil - this.time).toFixed(1)}` : '';
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = '#111';
      ctx.fillText(`${this.glare ? 'glare' : clip?.phase} ${view.anim} ${view.n || ''}${cooling}`, box.l, Math.max(12, box.t - 6));
    } else {
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = '#111';
      ctx.fillText(`away ${Math.max(0, this.awayLeft).toFixed(1)} s${this.inView ? '' : ' (line not in view)'} next from ${this.lastEdge ?? 'first'}`, 8, line - 8);
    }
    ctx.restore();
  }

  private debugKey(key: string) {
    if (!this.ready || this.reduced) return;
    const { clip } = this;
    if (key === 'k' && clip && clip.kind !== 'fly') {
      this.cooldownUntil = -Infinity;
      this.sounds?.touched(this.x + this.left);
      this.cooldownUntil = this.time + COOLDOWN_S;
      void this.glass.load();
      this.knockNow();
    } else if (key === 's') {
      const fall = this.fall;
      if (!fall) return;
      const d: Dir = clip ? (this.x < fall.x ? 1 : -1) : 1;
      this.visitEdge = d > 0 ? 'left' : 'right';
      this.plannedFall = fall;
      this.screeched = false;
      this.glare = null;
      this.x = fall.x - d * (fall.w / 2 + 0.2 * this.H);
      this.facing = d;
      this.queue = this.soak(d);
      this.tau = 0;
      this.clip = this.next();
    } else if (key === 'f' && clip && clip.kind !== 'fly') {
      if (clip.kind === 'walk') this.facing = clip.facing;
      else this.x = clip.x;
      const fall = this.fall;
      const d: Dir = fall ? (this.x < fall.x ? -1 : 1) : this.facing; // never over the fall
      const steps: Step[] = [() => this.takeoff(d), () => this.fly(null, d)];
      if (d !== this.facing) steps.unshift(() => this.anim('turn', 'turn', this.facing, this.x, { facingAfter: d }));
      this.glare = null;
      this.queue = steps;
      this.tau = 0;
      this.clip = this.next();
    } else if (key === 'n') {
      if (clip) this.tau = clip.dur;
      else this.awayLeft = 0;
    }
  }

  /** `window.__falcon` in debug: what the checks read. */
  private exposeForChecks() {
    const engine = this;
    (window as unknown as { __falcon: unknown }).__falcon = {
      get state() {
        const { clip } = engine;
        return {
          phase: engine.glare ? 'glare' : (clip?.phase ?? 'away'),
          anim: engine.view?.anim ?? null,
          n: engine.view?.n ?? 0,
          x: engine.x,
          facing: engine.facing,
          line: engine.line,
          H: engine.H,
          W: engine.W,
          fall: engine.fall,
          running: engine.running,
          ready: engine.ready,
          awayLeft: engine.awayLeft,
          cooling: engine.time < engine.cooldownUntil,
          box: engine.viewBox,
          feet: clip?.kind === 'walk' ? engine.feet : null,
          waterTop: engine.waterTop,
          time: engine.time,
        };
      },
      events: this.events,
      changes: this.changes,
      key: (k: string) => this.debugKey(k),
    };
  }
}
