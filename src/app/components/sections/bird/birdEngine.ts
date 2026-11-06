/**
 * The bird's loop: reads the live page, runs the brain, moves the world under it and draws. It runs on
 * its own canvas above the hero and costs nothing while the hero is off screen.
 */
import { prefersReducedMotion } from '../../../hooks/useReducedMotion';
import { isTouchScreen } from '../../../utils/motionViewport';
import { ISLAND_BIRD_HEIGHT, ISLAND_PERCHES, leanBirdPalm, readBirdPerches, whenBirdPerchesReady, type IslandPerchId, type PalmCrownId } from '../island/birdPerches';
import { BirdBrain, type BirdSurface, type BirdWorld, type Circuit, type Perch, type Reaction, type Sky } from './behaviour';
import { CORE_SHEETS, laterSheets, loadBirdAtlas, type BirdAnim, type BirdSheets } from './birdAtlas';
import { DEBUG_KEYS, debugOn, drawDebug, overlayOn } from './debug';
import { FeatherBurst } from './feathers';
import { CRUISE, TICK_S, type Point, type Rect } from './flight';
import { headlinePerches, restoreKerning, type RejectedRun } from './perches';
import { setBirdOnPrompt, watchPrompt } from './birdPrompt';
import { Bounce, clamp, lowPass } from './springs';
import { drawSprite, worldOf } from './sprite';
import type { BirdPose } from './behaviour';

/** Below this width the headline and the island are never on screen together. */
const DESKTOP_WIDTH = 1024;
/** Lets the headline code path be tried on phones later. */
const BIRD_HEADLINE_ON_TOUCH = false;

const IDLE_FRAME_MS = 30; // at most about 30 fps
const REMEASURE_MS = 120;
const CURSOR_NEAR_PX = 120;
const FLICK_RADIUS_PX = 80;
const FLICK_SPEED = 3000; // px/s: a flick, not a quick reach for the bird
const FLICK_MIN_MS = 8; // shorter gaps between events are timer noise, not speed
const CLICK_STARTLE_PX = 150;
const FINGER_REACH_PX = 24;
const TAP_SLOP_PX = 10;
const TAP_MS = 350;
const CLEAR_OF_UI_PX = 60;
// A small bird on a small island: at the desktop's pace it would cross the screen in a blink.
const ISLAND_CRUISE_HEIGHTS = 7; // a second's flight, in bird heights
const ISLAND_CRUISE_MIN = 260; // what it leaves the perch at: slower than this it would stall
const CIRCUIT_MIN_HEIGHTS = 4;
const HIT_INSET = 0.9;

const FADES_BETWEEN = [0.6, 0.35, 0.15];
const FADE_WITHIN = [0.45];
const FADE_MIN_OVERLAP = 0.7;
const SLOW_FADE_S = 0.6;
const STRIPS_THAT_MOVE = ['hop', 'takeoff', 'landing'];

const DIP_KICK = 61; // px/s, for a dip of about 3 px
const POP_KICK = -41; // about 2 px
const FLINCH_KICK = 30;
const NOTE_KICK = 28;
const WOBBLE_KICK = 61; // deg/s, for about 3 degrees
const PALM_KICK = 19; // deg/s
const PALM_POP = -11;

const headlineHeight = () => clamp(window.innerWidth * 0.0472, 40, 68);
const promptHeight = () => clamp(window.innerWidth * 0.08, 72, 96);
/** Above the popup's dimmed page, for as long as the bird is part of it. */
const OVER_PROMPT_Z = '61';

interface Ghost {
  pose: BirdPose;
  alphas: number[];
  started: number; // clock tick
  since: number; // seconds, for slow fades
  pinned: 'anchor' | 'eye';
}

interface LetterSpring {
  dip: Bounce;
  wobble: Bounce;
}

const toRect = (r: DOMRect | Rect, origin: { left: number; top: number }): Rect => ({
  left: r.left - origin.left,
  top: r.top - origin.top,
  right: r.right - origin.left,
  bottom: r.bottom - origin.top,
});

export type { BirdSurface };

/** What the bird tells the sound. It knows nothing about audio. */
export interface BirdSoundSink {
  touched(x: number): void; // x in viewport pixels
  frame(anim: BirdAnim, frame: number, info: { surface: BirdSurface; x: number; firstInClip: boolean }): void;
}

export class BirdEngine implements BirdWorld {
  sheets!: BirdSheets;
  private brain: BirdBrain | null = null;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private clock = 0; // seconds of bird time
  private disposed = false;
  private onHero = true;
  private tabVisible = !document.hidden;

  private readonly hero: HTMLElement;
  private readonly composition: HTMLElement;
  private readonly debug = debugOn();
  private readonly overlay = this.debug && overlayOn();
  private readonly compactAtLoad = window.innerWidth < DESKTOP_WIDTH;
  private readonly touchScreen = isTouchScreen();
  private readonly cleanups: (() => void)[] = [];

  private origin: DOMRect;
  private headline: Perch[] = [];
  private island: Perch[];
  private rejected: RejectedRun[] = [];
  private letters = new Map<HTMLElement, LetterSpring>();
  private palms: Partial<Record<PalmCrownId, Bounce>> = {};
  private islandBox: Rect | null = null;
  private feathers = new FeatherBurst();

  private cursorAt: Point | null = null;
  private cursorTime = 0;
  private lastNear = 0;
  private press: { x: number; y: number; time: number } | null = null;

  private heard: { anim: BirdAnim | null; frame: number; clip: number } = { anim: null, frame: 0, clip: 0 };
  private heardFrames = new Set<string>();
  private ghosts: Ghost[] = [];
  private shown: BirdPose | null = null;
  private breath = 0;
  private fps = 60;
  /** Filled in debug only: a frame-by-frame record for checking the motion. */
  private trace: Record<string, unknown>[] | null = null;
  private watchIslandOnScreen: IntersectionObserver | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private sounds?: BirdSoundSink,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas');
    this.ctx = ctx;
    this.composition = canvas.parentElement as HTMLElement;
    this.hero = canvas.closest('section') as HTMLElement;
    this.origin = this.composition.getBoundingClientRect();
    this.island = ISLAND_PERCHES.map(({ id, group, palm }) => ({ id, home: 'island', x: 0, y: 0, facing: 'any', width: 0, group, palm }));
  }

  async start() {
    this.sheets = await loadBirdAtlas(this.compactAtLoad);
    await Promise.all([this.sheets.load(CORE_SHEETS), this.sheets.loadFeathers(), new Promise<void>((resolve) => this.cleanups.push(whenBirdPerchesReady(resolve)))]);
    if (this.disposed || !this.sheets.has('sleep') || !this.sheets.has('look-around')) return;
    this.measureCanvas();
    this.readOrigin();
    if (!this.readIsland()) return;

    const reduced = prefersReducedMotion();
    const home = this.island.find((perch) => perch.id === 'sand-by-bridge')!;
    this.brain = new BirdBrain(this, home, reduced);
    this.listen();
    // With reduced motion it stays on the sand, and the popup keeps its still picture.
    if (!reduced) this.cleanups.push(watchPrompt({ arrive: (card) => this.standOnPrompt(card), leave: () => this.leavePrompt() }));
    await this.measureHeadline();
    if (this.disposed) return;
    this.watchIsland();

    const later = () => {
      void this.sheets.load(laterSheets(this.compactAtLoad));
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(later, { timeout: 4000 });
    else setTimeout(later, 1500);
    if (this.debug) this.exposeForChecks();
    this.sync();
  }

  dispose() {
    this.disposed = true;
    this.halt();
    this.cleanups.forEach((cleanup) => cleanup());
    this.watchIslandOnScreen?.disconnect();
    this.letters.forEach((_, el) => (el.style.transform = ''));
    (Object.keys(this.palms) as PalmCrownId[]).forEach((palm) => leanBirdPalm(palm, 0));
    this.sheets?.dispose();
  }

  /** Fonts loaded, the window changed or the language switched. */
  remeasure() {
    if (!this.brain) return;
    void this.measureHeadline();
  }

  // -------------------------------------------------------------------- measuring the page

  private get compact() {
    return window.innerWidth < DESKTOP_WIDTH;
  }

  private headlineOn() {
    return !this.compact || BIRD_HEADLINE_ON_TOUCH;
  }

  private measureCanvas() {
    const box = this.canvas.getBoundingClientRect();
    this.cssWidth = box.width;
    this.cssHeight = box.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.touchScreen ? 1.5 : 2);
    this.canvas.width = Math.round(box.width * this.dpr);
    this.canvas.height = Math.round(box.height * this.dpr);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private readOrigin() {
    this.origin = this.composition.getBoundingClientRect();
  }

  private readIsland() {
    const view = readBirdPerches(this.origin);
    if (!view) return false;
    this.islandBox = view.box;
    for (const perch of this.island) {
      const spot = view.perches[perch.id as IslandPerchId];
      perch.x = spot.x;
      perch.y = spot.y;
      this.islandScale = spot.scale;
    }
    return true;
  }

  private islandScale = 0;
  private promptCard: HTMLElement | null = null;
  private promptPerch: Perch | null = null;

  private async measureHeadline() {
    void this.composition.offsetHeight; // lays the page out, so any font it needs has started loading
    if (document.fonts?.ready) await document.fonts.ready;
    if (this.disposed) return;
    this.readOrigin();
    const birdHeight = headlineHeight();
    const allPieces = [...this.composition.querySelectorAll<HTMLElement>('[data-bird-piece]')];
    restoreKerning(allPieces);
    const pieces = this.headlineOn() ? allPieces : [];
    // Measure letters at rest.
    this.letters.forEach((_, el) => (el.style.transform = ''));
    this.rejected = [];
    const found = pieces.length ? headlinePerches(pieces, { birdHeight, origin: this.origin, rejected: this.debug ? this.rejected : undefined }) : [];
    const next: Perch[] = found.map((spot, i) => {
      const known = this.headline.find((perch) => perch.el === spot.el && !perch.gone);
      const perch: Perch = known ?? { id: `headline-${i}`, home: 'headline', x: 0, y: 0, facing: 'any', width: 0, el: spot.el };
      return Object.assign(perch, { x: spot.x, y: spot.y, width: spot.width, facing: spot.facing, id: known?.id ?? `${spot.el.textContent}-${i}` });
    });
    for (const perch of this.headline) if (!next.includes(perch)) perch.gone = true;
    this.headline = next;
    this.brain?.layoutChanged();
  }

  private standOnPrompt(card: HTMLElement) {
    const sand = this.island.find((perch) => perch.id === 'sand-by-bridge')!;
    this.promptCard = card;
    this.promptPerch = { id: 'prompt', home: 'prompt', x: 0, y: 0, facing: 'any', width: 0 };
    this.readPrompt();
    this.ghosts = [];
    this.shown = null;
    this.brain?.sitOnCard(this.promptPerch, sand.x >= this.promptPerch.x ? 1 : -1);
    this.canvas.style.zIndex = OVER_PROMPT_Z;
    setBirdOnPrompt(true);
  }

  private leavePrompt() {
    const { brain } = this;
    const sand = this.island.find((perch) => perch.id === 'sand-by-bridge')!;
    this.promptCard = null;
    if (!brain || !this.promptPerch) return;
    if (this.running) brain.leaveCard(sand);
    else brain.placeOn(sand);
  }

  private readPrompt() {
    const { promptCard, promptPerch } = this;
    if (!promptCard || !promptPerch) return;
    const box = promptCard.getBoundingClientRect();
    promptPerch.x = box.left - this.origin.left;
    promptPerch.y = box.top - this.origin.top;
  }

  /** Back under the page once it has landed. */
  private settleAfterPrompt(pose: BirdPose) {
    if (!this.promptPerch || this.promptCard || this.brain?.flying || !pose.fixed || pose.perch === 'prompt') return;
    this.promptPerch = null;
    this.canvas.style.zIndex = '';
    setBirdOnPrompt(false);
  }

  /** Wakes it the first time at least 40 % of the island is on screen. */
  private watchIsland() {
    const island = this.composition.querySelector('[data-bird-island]');
    if (!island) {
      this.brain?.wakeSoon();
      return;
    }
    this.watchIslandOnScreen = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.4) return;
        this.brain?.wakeSoon();
        this.watchIslandOnScreen?.disconnect();
      },
      { threshold: 0.4 },
    );
    this.watchIslandOnScreen.observe(island);
  }

  // -------------------------------------------------------------------- the world, as the brain sees it

  perches() {
    return [...this.headline, ...this.island];
  }

  at(perch: Perch): Point {
    const spring = perch.el ? this.letters.get(perch.el) : undefined;
    return { x: perch.x, y: perch.y + 1 + (spring?.dip.value ?? 0) };
  }

  heightOn(perch: Perch) {
    if (perch.home === 'prompt') return promptHeight();
    return perch.home === 'headline' ? headlineHeight() : ISLAND_BIRD_HEIGHT * this.islandScale;
  }

  middleX() {
    return this.cssWidth / 2;
  }

  twoHomes() {
    return this.headlineOn();
  }

  cursor() {
    if (!this.cursorAt || !this.brain) return null;
    const { pose } = this.brain;
    const center = this.birdCentre(pose);
    return Math.hypot(this.cursorAt.x - center.x, this.cursorAt.y - center.y) < CURSOR_NEAR_PX ? this.cursorAt : null;
  }

  sinceCursorNear() {
    return this.clock - this.lastNear;
  }

  private birdCentre(pose: BirdPose) {
    const box = this.brain?.hitBox();
    return box ? { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 } : { x: pose.x, y: pose.y };
  }

  private fixedUi() {
    const nav = document.querySelector('nav');
    const avoid = [...document.querySelectorAll('[data-bird-avoid]')].map((el) => el.getBoundingClientRect());
    return { navBottom: nav?.getBoundingClientRect().bottom ?? 0, avoid };
  }

  crowded(perch: Perch) {
    const { avoid } = this.fixedUi();
    const x = perch.x + this.origin.left;
    const y = perch.y + this.origin.top;
    return avoid.some((r) => x > r.left - CLEAR_OF_UI_PX && x < r.right + CLEAR_OF_UI_PX && y > r.top - CLEAR_OF_UI_PX && y < r.bottom + CLEAR_OF_UI_PX);
  }

  /** What the bird must never cover, relative to the composition. */
  private textRects() {
    const origin = this.composition.getBoundingClientRect();
    const blocks = [...this.composition.querySelectorAll<HTMLElement>('[data-bird-nofly]')];
    // With the island right under them, only the buttons count: the row is far wider than they are.
    const parts = this.twoHomes() ? blocks : blocks.flatMap((el) => (el.dataset.birdNofly === 'row' ? [...el.children] : [el]));
    return parts.map((el) => toRect(el.getBoundingClientRect(), origin));
  }

  usable(perch: Perch) {
    const height = this.heightOn(perch);
    const halfWidth = 0.35 * height;
    const onText = this.textRects().some((r) => perch.x + halfWidth > r.left && perch.x - halfWidth < r.right && perch.y > r.top && perch.y - height < r.bottom);
    if (onText) return false;
    const hero = this.hero.getBoundingClientRect();
    const { navBottom } = this.fixedUi();
    const x = perch.x + this.origin.left;
    const y = perch.y + this.origin.top;
    const top = y - height;
    const inView = x >= Math.max(hero.left, 0) && x <= Math.min(hero.right, window.innerWidth) && y <= Math.min(hero.bottom, window.innerHeight);
    return inView && top >= Math.max(hero.top, navBottom) && !this.crowded(perch);
  }

  sky(): Sky {
    this.readOrigin();
    const { origin } = this;
    const { navBottom } = this.fixedUi();
    const noFly = this.textRects();
    const avoid = [...document.querySelectorAll('[data-bird-avoid]')].map((el) => {
      const r = toRect(el.getBoundingClientRect(), origin);
      return { left: r.left - CLEAR_OF_UI_PX, top: r.top - CLEAR_OF_UI_PX, right: r.right + CLEAR_OF_UI_PX, bottom: r.bottom + CLEAR_OF_UI_PX };
    });
    const island = this.islandBox;
    const headline = this.composition.querySelector('h1')?.getBoundingClientRect();
    const firstLine = headline ? this.firstLine(headline) : null;
    const textRight = noFly.reduce((edge, r) => Math.max(edge, r.right), 0);
    const textLeft = noFly.reduce((edge, r) => Math.min(edge, r.left), this.cssWidth);
    const side: 1 | -1 = island && (island.left + island.right) / 2 < (textLeft + textRight) / 2 ? -1 : 1;
    const twoHomes = this.twoHomes();
    const height = headlineHeight();
    const islandBird = ISLAND_BIRD_HEIGHT * this.islandScale;
    return {
      left: twoHomes || !island ? 24 : Math.max(24, island.left),
      right: this.cssWidth - 24,
      top: twoHomes ? Math.max(navBottom - origin.top + 0.55 * height, 0) : navBottom - origin.top,
      noFly: [...noFly, ...avoid],
      // On a phone the island lies under the text, and its palm crowns stand up beside the buttons.
      under: twoHomes ? [] : noFly,
      circuit: twoHomes ? null : this.circuit(islandBird, avoid),
      cruise: twoHomes ? CRUISE : clamp(ISLAND_CRUISE_HEIGHTS * islandBird, ISLAND_CRUISE_MIN, CRUISE),
      corridorX: twoHomes ? (side > 0 ? textRight + 0.8 * height : textLeft - 0.8 * height) : null,
      side,
      lineTop: firstLine?.top ?? null,
      lineMiddle: firstLine?.middle ?? null,
    };
  }

  /** The way round the island: over the palms and back past its foot, on screen and clear of the fixed buttons. */
  private circuit(bird: number, avoid: Rect[]): Circuit | null {
    const island = this.islandBox;
    if (!island) return null;
    const crowns = this.island.filter((perch) => perch.palm).map((perch) => perch.y);
    const top = Math.min(...crowns) - 0.9 * bird;
    const middle = (island.top + island.bottom) / 2;
    const belowUi = avoid.filter((r) => r.top > middle).map((r) => r.top - 0.5 * bird);
    const bottom = Math.min(island.bottom, window.innerHeight - this.origin.top - bird, ...belowUi);
    return bottom - top < CIRCUIT_MIN_HEIGHTS * bird ? null : { top, bottom };
  }

  private firstLine(headline: DOMRect) {
    const pieces = this.composition.querySelectorAll<HTMLElement>('[data-bird-piece]');
    if (!pieces.length) return { top: headline.top - this.origin.top, middle: (headline.left + headline.right) / 2 - this.origin.left };
    const top = Math.min(...[...pieces].map((el) => el.getBoundingClientRect().top));
    const line = [...pieces].map((el) => el.getBoundingClientRect()).filter((r) => r.top - top < 4);
    const left = Math.min(...line.map((r) => r.left));
    const right = Math.max(...line.map((r) => r.right));
    return { top: top - this.origin.top, middle: (left + right) / 2 - this.origin.left };
  }

  react(perch: Perch, what: Reaction) {
    if (perch.el) {
      const spring = this.letterSpring(perch.el);
      if (what === 'land') spring.dip.kick(DIP_KICK);
      else if (what === 'leave') spring.dip.kick(POP_KICK);
      else if (what === 'flinch') spring.dip.kick(FLINCH_KICK);
      else if (what === 'note') spring.dip.kick(NOTE_KICK);
      else spring.wobble.kick(WOBBLE_KICK);
    } else if (perch.palm && (what === 'land' || what === 'leave')) {
      const palm = (this.palms[perch.palm] ??= new Bounce(1.3, 0.22));
      const side = perch.palm === 'palm-left-crown' ? -1 : 1;
      palm.kick((what === 'land' ? PALM_KICK : PALM_POP) * side);
    }
  }

  private letterSpring(el: HTMLElement) {
    let spring = this.letters.get(el);
    if (!spring) {
      spring = { dip: new Bounce(), wobble: new Bounce() };
      this.letters.set(el, spring);
    }
    return spring;
  }

  burst(at: Point, facing: 1 | -1, height: number) {
    if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches && prefersReducedMotion()) return;
    this.feathers.spawn(at.x, at.y, facing, height);
  }

  // -------------------------------------------------------------------- pointers

  private listen() {
    const { hero } = this;
    const add = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void) => {
      target.addEventListener(type, handler, { passive: true });
      this.cleanups.push(() => target.removeEventListener(type, handler));
    };
    add(hero, 'pointermove', (event) => this.onPointerMove(event));
    add(hero, 'pointerdown', (event) => this.onPointerDown(event));
    add(hero, 'pointerup', (event) => this.onPointerUp(event));
    add(hero, 'pointercancel', () => (this.press = null));
    add(hero, 'pointerleave', () => (this.cursorAt = null));

    let remeasuring = 0;
    const later = () => {
      window.clearTimeout(remeasuring);
      remeasuring = window.setTimeout(() => this.remeasure(), REMEASURE_MS);
    };
    const resize = new ResizeObserver(() => {
      this.measureCanvas();
      this.readOrigin();
      later();
    });
    resize.observe(this.composition);
    this.cleanups.push(() => {
      resize.disconnect();
      window.clearTimeout(remeasuring);
    });
    // A language switch can bring a font that arrives after the first measure.
    document.fonts?.addEventListener('loadingdone', later);
    this.cleanups.push(() => document.fonts?.removeEventListener('loadingdone', later));

    const onScreen = new IntersectionObserver(([entry]) => {
      this.onHero = entry.isIntersecting;
      this.sync();
    });
    onScreen.observe(hero);
    this.cleanups.push(() => onScreen.disconnect());

    const onVisibility = () => {
      this.tabVisible = !document.hidden;
      this.sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

    if (this.debug) {
      const onKey = (event: KeyboardEvent) => {
        const what = DEBUG_KEYS[event.key as keyof typeof DEBUG_KEYS];
        if (what) this.brain?.force(what, this.cursorAt ?? { x: 0, y: 0 });
      };
      window.addEventListener('keydown', onKey);
      this.cleanups.push(() => window.removeEventListener('keydown', onKey));
    }
  }

  private local(event: PointerEvent): Point {
    return { x: event.clientX - this.origin.left, y: event.clientY - this.origin.top };
  }

  /** The bird's body: an ellipse in its frame's bounds, drawn in a little. */
  private hit(reach = 0) {
    const box = this.brain?.hitBox();
    if (!box) return null;
    return {
      x: (box.left + box.right) / 2,
      y: (box.top + box.bottom) / 2,
      rx: ((box.right - box.left) / 2) * HIT_INSET + reach,
      ry: ((box.bottom - box.top) / 2) * HIT_INSET + reach,
    };
  }

  private inBody(point: Point, reach = 0) {
    const ellipse = this.hit(reach);
    if (!ellipse) return false;
    return ((point.x - ellipse.x) / ellipse.rx) ** 2 + ((point.y - ellipse.y) / ellipse.ry) ** 2 <= 1;
  }

  private onPointerMove(event: PointerEvent) {
    const { brain } = this;
    if (event.pointerType === 'touch' || !brain) return;
    this.readOrigin();
    const point = this.local(event);
    const previous = this.cursorAt;
    const now = event.timeStamp;
    const elapsed = now - this.cursorTime;
    this.cursorAt = point;
    this.cursorTime = now;
    if (this.inBody(point)) {
      this.touch(point);
      return;
    }
    if (!previous || elapsed < FLICK_MIN_MS) return;
    const speed = (Math.hypot(point.x - previous.x, point.y - previous.y) / elapsed) * 1000;
    if (speed < FLICK_SPEED) return;
    const centre = this.birdCentre(brain.pose);
    if (segmentDistance(centre, previous, point) < FLICK_RADIUS_PX) brain.startled(point);
  }

  private onPointerDown(event: PointerEvent) {
    const { brain } = this;
    if (!brain) return;
    this.readOrigin();
    const point = this.local(event);
    if (event.pointerType === 'touch') {
      this.press = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      return;
    }
    if (this.inBody(point)) {
      this.touch(point);
      return;
    }
    const centre = this.birdCentre(brain.pose);
    if (Math.hypot(point.x - centre.x, point.y - centre.y) < CLICK_STARTLE_PX) brain.startled(point);
  }

  /** A finger that scrolls gets a pointercancel instead, so this only ever sees taps. */
  private onPointerUp(event: PointerEvent) {
    const { press, brain } = this;
    this.press = null;
    if (event.pointerType !== 'touch' || !press || !brain) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > TAP_SLOP_PX || event.timeStamp - press.time > TAP_MS) return;
    this.readOrigin();
    const point = this.local(event);
    if (this.inBody(point, FINGER_REACH_PX)) this.touch(point);
  }

  private touch(point: Point) {
    if (this.brain?.touched(point)) this.sounds?.touched(point.x + this.origin.left);
  }

  // -------------------------------------------------------------------- the loop

  private sync() {
    if (this.brain && this.onHero && this.tabVisible) this.resume();
    else this.halt();
  }

  private resume() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private halt() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const { brain } = this;
    if (!brain) return;
    const elapsed = now - this.lastTime;
    // Phones update 30 times a second while the bird is standing, 60 while it flies.
    if (this.touchScreen && !brain.flying && elapsed < IDLE_FRAME_MS) return;
    this.lastTime = now;
    const dt = Math.min(elapsed, 50) / 1000;
    this.fps = lowPass(this.fps, 1 / Math.max(dt, 0.001), 0.5, dt);
    this.tick(dt);
  };

  private tick(dt: number) {
    const brain = this.brain!;
    this.clock += dt;
    this.readOrigin();
    this.readIsland();
    this.readPrompt();
    if (this.cursor()) this.lastNear = this.clock;
    this.stepSprings(dt);
    brain.step(dt);
    this.feathers.step(dt);
    const pose = brain.pose;
    this.announce(pose);
    this.settleAfterPrompt(pose);
    this.updateFades(pose, dt);
    this.breath = lowPass(this.breath, pose.breathe ? 1 : 0, 0.25, dt);
    this.draw(pose);
    this.record(pose);
  }

  /** Tells the sound each time the drawn frame changes. */
  private announce(pose: BirdPose) {
    if (!this.sounds || (pose.anim === this.heard.anim && pose.frame === this.heard.frame)) return;
    if (pose.clip !== this.heard.clip) this.heardFrames.clear();
    const key = `${pose.anim} ${pose.frame}`;
    const firstInClip = !this.heardFrames.has(key);
    this.heardFrames.add(key);
    this.heard = { anim: pose.anim, frame: pose.frame, clip: pose.clip };
    this.sounds.frame(pose.anim, pose.frame, { surface: pose.surface, x: pose.x + this.origin.left, firstInClip });
  }

  private stepSprings(dt: number) {
    for (const [el, spring] of this.letters) {
      spring.dip.step(dt);
      spring.wobble.step(dt);
      if (spring.dip.resting && spring.wobble.resting) {
        el.style.transform = '';
        this.letters.delete(el);
      } else {
        el.style.transform = `translateY(${spring.dip.value.toFixed(2)}px) rotate(${spring.wobble.value.toFixed(2)}deg)`;
      }
    }
    for (const palm of Object.keys(this.palms) as PalmCrownId[]) {
      const lean = this.palms[palm]!;
      lean.step(dt);
      leanBirdPalm(palm, (lean.value * Math.PI) / 180);
      if (lean.resting) {
        leanBirdPalm(palm, 0);
        delete this.palms[palm];
      }
    }
  }

  private updateFades(pose: BirdPose, dt: number) {
    const tick = Math.floor(this.clock / TICK_S);
    const shown = this.shown;
    this.shown = pose;
    if (shown && (shown.anim !== pose.anim || shown.frame !== pose.frame || shown.flip !== pose.flip)) {
      // Two frames on the feet in one spot stay on the feet. Anything else lines up by the eye.
      const onFeet = this.onFeet(shown) && this.onFeet(pose) && Math.hypot(shown.x - pose.x, shown.y - pose.y) < 3;
      const pinned = onFeet ? 'anchor' : 'eye';
      const overlap = this.sheets.overlap(shown, pose, pinned);
      const changed = shown.anim !== pose.anim;
      let alphas: number[] | null = null;
      if (changed) alphas = FADES_BETWEEN;
      else if (pose.fixed && !STRIPS_THAT_MOVE.includes(pose.anim)) alphas = FADE_WITHIN;
      if (alphas && overlap >= FADE_MIN_OVERLAP) {
        this.ghosts.push({ pose: shown, alphas, started: tick, since: 0, pinned });
        if (this.ghosts.length > 2) this.ghosts.shift();
      } else if (pose.slow && alphas) {
        this.ghosts.push({ pose: shown, alphas, started: tick, since: 0, pinned });
      }
    }
    this.ghosts = this.ghosts.filter((ghost) => {
      ghost.since += dt;
      return ghost.pose.slow ? ghost.since < SLOW_FADE_S : tick - ghost.started < ghost.alphas.length;
    });
  }

  private onFeet(pose: BirdPose) {
    const { anchor } = this.sheets.atlas.animations[pose.anim];
    return anchor.kind === 'feet' && pose.pin.x === anchor.x && pose.pin.y === anchor.y;
  }

  private ghostAlpha(ghost: Ghost) {
    if (ghost.pose.slow) return 0.7 * (1 - ghost.since / SLOW_FADE_S);
    return ghost.alphas[Math.floor(this.clock / TICK_S) - ghost.started] ?? 0;
  }

  private draw(pose: BirdPose) {
    const { ctx, dpr, sheets } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const b = Math.sin((this.clock * Math.PI * 2) / 1.1) * this.breath;
    const sx = pose.sx * (1 - 0.004 * b);
    const sy = 1 + 0.008 * b;
    drawSprite(ctx, sheets, { ...pose, sx, sy, alpha: 1 });
    for (const ghost of this.ghosts) {
      const old = ghost.pose;
      // On the same spot the old frame stays where the new one stands. Otherwise it shifts by how far
      // the eye moved, so the two heads stay together.
      const byEye = ghost.pinned === 'eye';
      const at = byEye ? worldOf(this.sheets.eyeOr(pose.anim, pose.frame), pose.pin, pose, pose.flip, pose.k) : pose;
      const pin = byEye ? this.sheets.eyeOr(old.anim, old.frame) : old.pin;
      drawSprite(ctx, sheets, { ...old, x: at.x, y: at.y, pin, rot: pose.rot, sx: old.sx, sy: 1, k: pose.k, alpha: this.ghostAlpha(ghost) });
    }
    const feathers = sheets.feathers;
    if (feathers && this.feathers.active) this.feathers.draw(ctx, feathers, sheets.atlas.particles.feathers.cell);

    if (this.overlay && this.brain) {
      drawDebug(ctx, {
        brain: this.brain,
        perches: this.perches(),
        rejected: this.rejected,
        usable: (perch) => this.usable(perch),
        feet: (perch) => this.at(perch),
        hit: this.hit(),
        fps: this.fps,
        noFly: this.sky().noFly,
      });
    }
  }

  // -------------------------------------------------------------------- checks

  private record(pose: BirdPose) {
    if (!this.trace) return;
    const brain = this.brain!;
    const eye = worldOf(this.sheets.eyeOr(pose.anim, pose.frame), pose.pin, pose, pose.flip, pose.k);
    this.trace.push({
      t: +this.clock.toFixed(4),
      state: brain.state,
      anim: pose.anim,
      frame: pose.frame,
      x: +pose.x.toFixed(2),
      y: +pose.y.toFixed(2),
      ex: +eye.x.toFixed(2),
      ey: +eye.y.toFixed(2),
      rot: +((pose.rot * 180) / Math.PI).toFixed(2),
      sx: +pose.sx.toFixed(3),
      flip: pose.flip,
      h: +(brain.scale * this.sheets.atlas.referenceHeight).toFixed(2),
      perch: pose.perch,
      fixed: pose.fixed,
      ghosts: this.ghosts.length,
    });
    if (this.trace.length > 20000) this.trace.shift();
  }

  private exposeForChecks() {
    const brain = this.brain!;
    (window as unknown as { __bird: unknown }).__bird = {
      brain,
      engine: this,
      perches: () => this.perches().map((p) => ({ id: p.id, home: p.home, x: p.x, y: p.y, width: p.width, facing: p.facing, usable: this.usable(p), screenX: p.x + this.origin.left, screenY: p.y + this.origin.top })),
      rejected: () => this.rejected,
      sky: () => this.sky(),
      startTrace: () => (this.trace = []),
      stopTrace: () => {
        const out = this.trace;
        this.trace = null;
        return out;
      },
      forget: () => {
        this.headline.forEach((perch) => (perch.gone = true));
        this.headline = [];
      },
    };
  }
}

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1);
  return Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u));
}
