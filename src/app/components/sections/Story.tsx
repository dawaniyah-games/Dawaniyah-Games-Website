import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Clock,
  Code,
  Gamepad2,
  Layers,
  MonitorSmartphone,
  Palette,
  Rocket,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CARD_BACK, PROJECT_CARDS } from './cards/projectCards';
import { StoryFace } from './cards/StoryFace';
import { readDeckCard, type DeckCardPlace } from './island/deckCard';

/**
 * One card for the whole page. It starts as the top card of the deck on the island, flies into the
 * story, shows one face per service and reason, then flies on to each project.
 *
 * In the story it is an ordinary sticky child of the page, so the browser moves it and it cannot lag.
 * The fixed layer only carries it during a flight, and everything about a flight is worked out from
 * the scroll position alone. Each frame reads every rect first, then writes every style, and the
 * only rects read are of elements that are never transformed.
 */

const PER_GROUP = 6;
const ITEMS = PER_GROUP * 2;
const LAST_ITEM = ITEMS - 1;

// The flight from the deck starts once the page has moved and the deck is well on screen, and ends
// when the story's top has risen to DECK_RISE_END of the screen.
const DECK_START_SCROLL = 40;
const DECK_ON_SCREEN = 0.6;
const DECK_RISE_END = 0.25;
// Every later move runs while the target section's top rises between these.
const RISE_START = 0.9;
const RISE_END = 0.35;

const FLYER_WIDTH = 375;
const FLYER_HEIGHT = 504;

const STAGE_YAW = 12;
const STAGE_PITCH = 6;
const STAGE_PITCH_SWING = 2;
const STAGE_ROLL = -6;
const STAGE_TURNS = 2;

const FLIP_MS = 620;
// However fast the page scrolls, a face stays this long from the start of its flip, so it can be
// read. A faster scroll skips straight to the latest item rather than queueing flips.
const FACE_MIN_MS = 1200;
// The item on the reading line must beat the current one by this much to take over, so stopping
// between two items does not flick back and forth.
const ITEM_HOLD_PX = 28;
const FLIP_ROLL = 6;
const FLIP_LIFT_PX = 12;
const FLOAT_PX = 6;
const FLOAT_SPEED = 1.1;
// Near the end of the story the reading line slides down to the last row, over a long enough
// stretch of scrolling that the last items do not rush past.
const FOCUS_LATE = 0.78;
const FOCUS_LATE_FROM = 1.7;
const FOCUS_LATE_SPAN = 0.75;

const ARC_PX = 120;
const LANDING_START = 0.85;
const LANDING_SQUASH = 0.04;
const TUMBLE_DEG = 25;
// Between two places: face down by this point of the hop, and face up again from the second.
const FLIP_DOWN_END = 0.3;
const FLIP_UP_START = 0.55;
const FLIP_UP_SPAN = 0.3;
// Card flight v2, off the deck: deal → peel → sweep → land. f is the progress of this flight, 0 → 1.
const DEAL_END = 0.14; // slides out of the deck along the table
const PEEL_END = 0.34; // the leading edge lifts and it climbs off the island
const SWEEP_END = 0.88; // the S-curve towards the viewer and over to the story; then it lands
const DEAL_CARDS = 1.2; // how far it slides out, in widths of the card lying on the deck
const DEAL_GROW = 0.12;
const PEEL_RISE = 0.14; // of the screen height
const PEEL_DRIFT = 0.06; // of the screen width, towards the story side
const PEEL_SIZE = 0.42; // of its size in the story (at least PEEL_MIN_CARDS deck-widths)
const PEEL_MIN_CARDS = 2.4;
const SWEEP_PEAK = 1.16; // of its size in the story, where it passes closest
const SWEEP_PEAK_AT = 0.55; // of the sweep
const SWEEP_LAND_SIZE = 1.04;
const SWEEP_OUT_X = 0.3; // first control point: out towards the story side, of the screen width
const SWEEP_OUT_Y = 0.16; // ... and down, of the screen height
const SWEEP_SWING_X = 0.1; // second control point: past the slot, of the screen width
const SWEEP_SWING_Y = 0.2; // ... and above it, of the screen height
const APPROACH_X = 0.04; // where the landing starts, short of the slot (screen width)
const APPROACH_Y = 0.07; // ... and above it (screen height)
const SPIN_DEG = 38; // in-plane spin while it peels
const SWEEP_KEYS = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
const SWING_DEG = 14; // past its resting roll, taken back on the landing
const BANK_DEG = 32; // rotateY bank across the sweep
const LIFT_TILT = 28; // rotateX when the leading edge is up
const OVER_TILT = -12; // rotateX it passes through on the sweep
const OVER_AT = 0.6; // of the sweep
const SETTLE_DEG = 3; // last wobble on the landing
const FLIP_FROM = 0.58; // back → face, through edge-on
const FLIP_SPAN = 0.3;
const MAX_COVER = 0.7; // the overshoot never makes the card wider than this share of the screen
const ON_SCREEN_SHARE = 0.6; // at least this much of the card's width stays on screen
const NAV_CLEARANCE_PX = 96;
const CARD_TALL = 504 / 375;
// The scroll position this flight reads, softened twice over: a wheel notch becomes a move, not a step.
const FLIGHT_SOFT_MS = 45;
const FLIGHT_SOFT_DT_MS = 34;
const FLAT_PERSPECTIVE = 9000;
const CARD_PERSPECTIVE = 1000;
// Between places it swells as it comes through the air, and banks into the turn.
const HOP_SWELL = 0.22;
const HOP_SWELL_PHONE = 0.1;
const HOP_BANK = 9;
// A start above the screen is held just out of sight, so the card visibly drops in.
const PARK_ABOVE = 0.65;
const PARK_GAP_PX = 30;

const SHEEN_SLIDE = 1.5; // % of the gradient per degree of turn
const SHEEN_FULL_DEG = 22;
const SHADOW_X = 18;
const SHADOW_Y = 26;
const SHADOW_SHIFT = 0.7; // px per degree of turn, opposite to it
const SHADOW_FLIGHT_DROP_PX = 34;
const SHADOW_FLIGHT_GROWTH = 0.2;

const SERVICES: [string, LucideIcon][] = [
  ['fullCycle', Gamepad2],
  ['mobile', Smartphone],
  ['art', Palette],
  ['uiux', Code],
  ['liveops', Activity],
  ['perf', Rocket],
];
const REASONS: [string, LucideIcon][] = [
  ['experience', Clock],
  ['cross', MonitorSmartphone],
  ['scalable', Layers],
  ['player', Users],
  ['qa', ShieldCheck],
  ['reach', Trophy],
];
// Layers between the two faces. Together they read as the thickness of the card when it turns.
const EDGE_LAYERS = [-1.5, -0.5, 0.5, 1.5];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 2;

type Spot = { x: number; y: number; width: number };
type Pose = { yaw: number; pitch: number; roll: number };

interface FlyerPlace extends Spot {
  roll: number;
  tilt: number;
  twist: number;
  yaw: number;
  perspective: number;
}

const seat = (rect: DOMRect): Spot => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width });

type Key = readonly [at: number, value: number];

/**
 * Through every key without a change of speed at any of them, resting only at the two ends and
 * staying between each pair of values: a monotone cubic. Easing each phase on its own would stop the
 * card at every join, however well the poses line up. `free` lets it run on through a turning point.
 */
const track = (keys: readonly Key[], at: number, free = false) => {
  const last = keys.length - 1;
  if (at <= keys[0][0]) return keys[0][1];
  if (at >= keys[last][0]) return keys[last][1];
  let i = 0;
  while (at >= keys[i + 1][0]) i += 1;
  const slope = (k: number) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
  const tangent = (k: number) => {
    if (k === 0 || k === last) return 0;
    const before = slope(k - 1);
    const after = slope(k);
    if (free) return (before + after) / 2;
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  };
  const span = keys[i + 1][0] - keys[i][0];
  const t = (at - keys[i][0]) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * keys[i][1] +
    (t3 - 2 * t2 + t) * span * tangent(i) +
    (3 * t2 - 2 * t3) * keys[i + 1][1] +
    (t3 - t2) * span * tangent(i + 1)
  );
};

const bezier = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/**
 * From the deck to the story, like a card flicked off a table: it is dealt out of the deck,
 * peels up, sweeps towards the viewer on an S-curve, turns over edge-on and lands in its slot.
 * It only grows while it travels, never in place. A card is stiff: no bend, only rigid turns.
 */
function flightFromDeck(f: number, deck: DeckCardPlace, to: Spot, end: Pose, vh: number, vw: number): FlyerPlace {
  const side = to.x < deck.x ? -1 : 1;
  const dealLen = deck.width * DEAL_CARDS;
  const p1 = { x: deck.x + side * 0.75 * dealLen, y: deck.y + 0.66 * dealLen };
  const p2 = { x: p1.x + side * PEEL_DRIFT * vw, y: p1.y - PEEL_RISE * vh };
  const p3 = { x: to.x - side * APPROACH_X * vw, y: to.y - APPROACH_Y * vh };
  const c1 = { x: p2.x + side * SWEEP_OUT_X * vw, y: p2.y + SWEEP_OUT_Y * vh };
  const c2 = { x: p3.x + side * SWEEP_SWING_X * vw, y: p3.y - SWEEP_SWING_Y * vh };
  const dealWidth = deck.width * (1 + DEAL_GROW);
  const peelWidth = Math.max(deck.width * PEEL_MIN_CARDS, to.width * PEEL_SIZE);
  const peak = Math.min(to.width * SWEEP_PEAK, Math.max(to.width, MAX_COVER * vw));
  const spun = deck.roll - side * SPIN_DEG;
  const swung = end.roll + side * SWING_DEG;

  const sweepAt = (t: number) => lerp(PEEL_END, SWEEP_END, t);

  // Its size changes by a steady ratio, not a steady number of pixels: doubling is what the eye sees.
  const sizes: Key[] = (
    [
      [0, deck.width],
      [DEAL_END, dealWidth],
      [PEEL_END, peelWidth],
      [sweepAt(SWEEP_PEAK_AT), peak],
      [SWEEP_END, to.width * SWEEP_LAND_SIZE],
      [1, to.width],
    ] as Key[]
  ).map(([at, size]) => [at, Math.log(size)]);
  const widthAt = (at: number) => Math.exp(track(sizes, at));
  const rolls: Key[] = [
    [0, deck.roll],
    [DEAL_END, deck.roll],
    [PEEL_END, spun],
    [SWEEP_END, swung],
    [1, end.roll],
  ];

  // The whole card stays below the nav, corners included: it flies towards the viewer, so it never
  // tucks under anything. Half the height of the card as it is turned in its own plane:
  const lowest = (at: number) => {
    const rad = (track(rolls, at) * Math.PI) / 180;
    const size = widthAt(at);
    return NAV_CLEARANCE_PX + ((size * CARD_TALL) / 2) * Math.abs(Math.cos(rad)) + (size / 2) * Math.abs(Math.sin(rad));
  };
  const onScreen = (value: number, at: number) => {
    const inset = widthAt(at) * (ON_SCREEN_SHARE - 0.5);
    return Math.min(Math.max(value, inset), vw - inset);
  };
  // Timed by distance along the curve: its control points would otherwise bunch the speed at one end.
  const sweep = [p2, ...SWEEP_KEYS.map((t) => ({ x: bezier(p2.x, c1.x, c2.x, p3.x, t), y: bezier(p2.y, c1.y, c2.y, p3.y, t) })), p3];
  const along = [0];
  sweep.slice(1).forEach((place, i) => along.push(along[i] + Math.hypot(place.x - sweep[i].x, place.y - sweep[i].y)));
  // Both limits go on the keys: applied to the finished path they would put a corner in it.
  const route: [number, { x: number; y: number }][] = [
    [0, deck],
    [DEAL_END, p1],
    ...sweep.map((place, i): [number, { x: number; y: number }] => [sweepAt(along[i] / along[along.length - 1]), place]),
    [1, to],
  ];
  const width = widthAt(f);
  const swept = clamp01((f - PEEL_END) / (SWEEP_END - PEEL_END));
  const landed = clamp01((f - SWEEP_END) / (1 - SWEEP_END));
  const x = track(route.map(([at, place]): Key => [at, onScreen(place.x, at)]), f, true);
  const y = track(route.map(([at, place]): Key => [at, Math.max(place.y, lowest(at))]), f);
  const roll = track(rolls, f) - side * SETTLE_DEG * 4 * landed * (1 - landed) * Math.sin(2 * Math.PI * landed);
  const tilt = track(
    [
      [0, deck.tilt],
      [DEAL_END, deck.tilt],
      [PEEL_END, LIFT_TILT],
      [sweepAt(OVER_AT), OVER_TILT],
      [SWEEP_END, end.pitch],
      [1, end.pitch],
    ],
    f,
  );
  const twist = track(
    [
      [0, deck.twist],
      [DEAL_END, deck.twist],
      [PEEL_END, 0],
      [1, 0],
    ],
    f,
  );
  const bank = side * BANK_DEG * Math.sin(Math.PI * swept) ** 2;
  const flip = 180 * (1 - easeInOut(clamp01((f - FLIP_FROM) / FLIP_SPAN)));
  return {
    x,
    y,
    width,
    roll,
    tilt,
    twist,
    yaw: lerp(0, end.yaw, easeInOut(clamp01((f - PEEL_END) / (1 - PEEL_END)))) + bank + flip,
    perspective: lerp(FLAT_PERSPECTIVE, CARD_PERSPECTIVE, easeInOut(clamp01(f / PEEL_END))),
  };
}

/** From one place to the next: face down through the air, swelling towards the viewer on the way. */
function flightBetween(f: number, from: Spot, to: Spot, start: Pose, end: Pose, vw: number): FlyerPlace {
  // The arc bows out sideways on a flight down the page and upwards on one across it.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy) || 1;
  const side = dx < 0 ? -1 : 1;
  const bow = Math.sin(Math.PI * f);
  const arc = bow * Math.min(ARC_PX, vw * 0.12);
  const eased = easeInOut(f);
  const flip = 180 * (easeInOut(clamp01(f / FLIP_DOWN_END)) + easeInOut(clamp01((f - FLIP_UP_START) / FLIP_UP_SPAN)));
  const swell = vw < 640 ? HOP_SWELL_PHONE : HOP_SWELL;
  return {
    x: lerp(from.x, to.x, eased) + arc * side * (Math.abs(dy) / span),
    y: lerp(from.y, to.y, eased) - arc * (Math.abs(dx) / span),
    width: lerp(from.width, to.width, eased) * (1 + swell * bow),
    roll: lerp(start.roll, end.roll, eased) + HOP_BANK * side * bow,
    tilt: lerp(start.pitch, end.pitch, eased) + TUMBLE_DEG * Math.sin(Math.PI * clamp01(f / 0.7)),
    twist: 0,
    yaw: lerp(start.yaw, end.yaw, eased) + flip,
    perspective: CARD_PERSPECTIVE,
  };
}

interface Item {
  number: string;
  count: string;
  title: string;
  text: string;
  Icon: LucideIcon;
}

interface Group {
  id: string;
  heading: string;
  sub: string;
  items: Item[];
}

function useGroups() {
  const { t } = useTranslation();
  return useMemo<Group[]>(() => {
    const item = (title: string, text: string, Icon: LucideIcon, i: number): Item => {
      const number = String(i + 1).padStart(2, '0');
      return { number, count: `${number} / ${String(PER_GROUP).padStart(2, '0')}`, title, text, Icon };
    };
    return [
      {
        id: 'services',
        heading: t('services.heading'),
        sub: t('services.subheading'),
        items: SERVICES.map(([key, Icon], i) => item(t(`services.items.${key}.title`), t(`services.items.${key}.description`), Icon, i)),
      },
      {
        id: 'about',
        heading: t('why.heading'),
        sub: '',
        items: REASONS.map(([key, Icon], i) => item(t(`why.reasons.${key}.title`), t(`why.reasons.${key}.text`), Icon, i)),
      },
    ];
  }, [t]);
}

function ItemText({ item }: { item: Item }) {
  return (
    <>
      <p className="t-eyebrow text-saffron">
        <bdi dir="ltr">{item.count}</bdi>
      </p>
      <h3 className="t-h3 text-white">{item.title}</h3>
      <p className="t-body text-white/75">{item.text}</p>
    </>
  );
}

interface GroupsProps {
  groups: Group[];
  itemRef?: (index: number, el: HTMLElement | null) => void;
  withFaces?: boolean;
}

function StoryGroups({ groups, itemRef, withFaces = false }: GroupsProps) {
  return (
    <>
      {groups.map((group, g) => (
        <section key={group.id} id={group.id} className="story-group">
          <h2 className="t-eyebrow t-upper text-saffron">{group.heading}</h2>
          {group.sub && <p className="t-body-l text-white/70 mt-3.5">{group.sub}</p>}
          <div className="story-items">
            {group.items.map((item, i) => (
              <article
                key={item.title}
                ref={(el) => itemRef?.(g * PER_GROUP + i, el)}
                className={withFaces ? 'story-item story-item-with-face' : 'story-item'}
              >
                {withFaces ? (
                  <>
                    <div aria-hidden="true">
                      <StoryFace number={item.number} title={item.title} Icon={item.Icon} />
                    </div>
                    <div className="flex flex-col gap-2.5 min-w-0">
                      <ItemText item={item} />
                    </div>
                  </>
                ) : (
                  <ItemText item={item} />
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function Story() {
  const reduced = useReducedMotion();
  return reduced ? <StoryStatic /> : <StoryWithCard />;
}

/** Reduced motion: no flight and no flips. Each item shows its face as a small card beside it. */
function StoryStatic() {
  const groups = useGroups();
  return (
    <div className="bg-night">
      <div className="page-gutter py-20">
        <StoryGroups groups={groups} withFaces />
      </div>
    </div>
  );
}

function CardThickness() {
  return (
    <>
      {EDGE_LAYERS.map((z) => (
        <span key={z} className="flight-edge" style={{ transform: `translateZ(${z}px)` }} />
      ))}
    </>
  );
}

function CardSheen() {
  return (
    <>
      <span className="flight-sheen flight-sheen-front" />
      <span className="flight-sheen flight-sheen-back" />
    </>
  );
}

/** A write that only touches the page when the value really changes. */
function styleWriter(el: HTMLElement) {
  const last = new Map<string, string>();
  return (name: 'visibility' | 'transform' | 'opacity', value: string) => {
    if (last.get(name) === value) return;
    last.set(name, value);
    el.style[name] = value;
  };
}

/** The turn of a card from square-on, whichever face is showing, for its sheen and shadow. */
const faceTurn = (angle: number) => (((angle + 90) % 180) + 180) % 180 - 90;

function dressCard(inner: HTMLElement, shadow: HTMLElement, turn: number, inFlight: number) {
  inner.style.setProperty('--sheen', `${50 + turn * SHEEN_SLIDE}%`);
  inner.style.setProperty('--sheen-strength', `${clamp01(Math.abs(turn) / SHEEN_FULL_DEG)}`);
  shadow.style.transform =
    `translate(${SHADOW_X - turn * SHADOW_SHIFT}px, ${SHADOW_Y + SHADOW_FLIGHT_DROP_PX * inFlight}px) scale(${1 + SHADOW_FLIGHT_GROWTH * inFlight})`;
  shadow.style.opacity = `${1 - 0.3 * inFlight}`;
}

function StoryWithCard() {
  const { i18n } = useTranslation();
  const groups = useGroups();
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const isRtl = i18n.dir() === 'rtl';

  const storyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageCardRef = useRef<HTMLDivElement>(null);
  const stageInnerRef = useRef<HTMLDivElement>(null);
  const stageShadowRef = useRef<HTMLDivElement>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const flyerRef = useRef<HTMLDivElement>(null);
  const flyerInnerRef = useRef<HTMLDivElement>(null);
  const flyerShadowRef = useRef<HTMLDivElement>(null);
  const flyerFrontRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const story = storyRef.current;
    const slot = slotRef.current;
    const stageCard = stageCardRef.current;
    const stageInner = stageInnerRef.current;
    const stageShadow = stageShadowRef.current;
    const flyer = flyerRef.current;
    const flyerInner = flyerInnerRef.current;
    const flyerShadow = flyerShadowRef.current;
    if (!story || !slot || !stageCard || !stageInner || !stageShadow || !flyer || !flyerInner || !flyerShadow) return;

    const side = isRtl ? -1 : 1;
    const setStage = styleWriter(stageCard);
    const setStageInner = styleWriter(stageInner);
    const setFlyer = styleWriter(flyer);
    const setFlyerInner = styleWriter(flyerInner);

    // Items only move with the page, so their positions inside the story are measured once per layout.
    let itemTops: number[] = [];
    let itemHeights: number[] = [];
    let itemPaired: boolean[] = [];
    const measure = () => {
      const top = story.getBoundingClientRect().top;
      const rects = itemRefs.current.map((el) => el?.getBoundingClientRect());
      itemTops = rects.map((rect) => (rect ? rect.top - top : 0));
      itemPaired = rects.map((rect, i) => rect?.top === rects[i ^ 1]?.top);
      itemHeights = rects.map((rect) => rect?.height ?? 0);
    };

    let raf = 0;
    let litItem = -1;
    let targetItem = 0;
    let faceStart = -Infinity;
    let frontShown = -1;
    let deckPageY: number | null = null;
    let softY: number | null = null;
    let softerY = 0;
    let lastTick = 0;

    // The face on the card, and the flip in progress. Each flip adds half a turn to `resting`.
    let shownItem = 0;
    let resting = 0;
    let flip: { to: number; dir: number; start: number } | null = null;
    faceRefs.current[0]?.classList.add('is-shown');

    const placeFace = (index: number, onFarSide: boolean) => {
      const face = faceRefs.current[index];
      if (!face) return;
      face.style.transform = onFarSide ? 'rotateY(180deg) translateZ(2px)' : 'translateZ(2px)';
      face.classList.add('is-shown');
    };
    const showOnly = (index: number) => {
      faceRefs.current.forEach((face, i) => face?.classList.toggle('is-shown', i === index));
    };
    const farSide = () => Math.round(resting / 180) % 2 !== 0;

    const slots = [...document.querySelectorAll<HTMLElement>('[data-card-slot]')];
    const sections = slots.map((el) => el.closest('section') ?? el);

    const tick = (now: number) => {
      raf = 0;

      // ---- Read.
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const storyRect = story.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const spotRects = slots.map((el) => el.getBoundingClientRect());
      const sectionTops = sections.map((el) => el.getBoundingClientRect().top);
      const scrollY = window.scrollY;
      const deck = readDeckCard(FLYER_WIDTH, FLYER_HEIGHT);

      // Only the flight off the deck uses this: everywhere else the card is held to the page. A jump
      // across the page is not a scroll, and it goes straight there.
      const step = Math.min(now - lastTick, FLIGHT_SOFT_DT_MS);
      lastTick = now;
      if (softY === null || Math.abs(scrollY - softerY) > vh) {
        softY = scrollY;
        softerY = scrollY;
      } else {
        const follow = 1 - Math.exp(-step / FLIGHT_SOFT_MS);
        softY = lerp(softY, scrollY, follow);
        softerY = lerp(softerY, softY, follow);
        if (Math.abs(scrollY - softerY) < 0.2) {
          softY = scrollY;
          softerY = scrollY;
        }
      }

      // ---- Work it all out from the scroll position.
      if (deck && deckPageY === null) deckPageY = deck.y + scrollY;
      const deckStart = Math.max(DECK_START_SCROLL, (deckPageY ?? 0) - DECK_ON_SCREEN * vh);
      const deckEnd = storyRect.top + scrollY - DECK_RISE_END * vh;
      let journey = clamp01((softerY - deckStart) / Math.max(deckEnd - deckStart, 1));
      if (journey >= 1) {
        for (const top of sectionTops) {
          const flight = clamp01((RISE_START * vh - top) / ((RISE_START - RISE_END) * vh));
          journey += flight;
          if (flight < 1) break;
        }
      }
      const leg = Math.floor(journey);
      const f = journey - leg;
      const onStage = journey === 1;
      const flying = f > 0;

      // Worked out here rather than in CSS, so a card leaving or reaching the stage knows about it.
      const float = Math.sin((now / 1000) * FLOAT_SPEED) * FLOAT_PX;
      const progress = clamp01((vh / 2 - storyRect.top) / storyRect.height);
      const swing = Math.sin(progress * Math.PI * 2 * STAGE_TURNS);
      const stage = {
        yaw: STAGE_YAW * swing * side,
        pitch: STAGE_PITCH + STAGE_PITCH_SWING * Math.cos(progress * Math.PI * 2),
        roll: STAGE_ROLL * side,
      };

      // The item on the reading line. Side by side, the row hands over from one to the next. Near
      // the end the line slides down, so the last row gets its turn before the card flies off.
      const baseLine = vw < 1024 ? (slotRect.bottom + vh) / 2 : vh / 2;
      const line = lerp(baseLine, FOCUS_LATE * vh, clamp01((FOCUS_LATE_FROM * vh - storyRect.bottom) / (FOCUS_LATE_SPAN * vh)));
      const gapTo = (i: number) => {
        const share = itemPaired[i] ? (i % 2 ? 0.75 : 0.25) : 0.5;
        return Math.abs(storyRect.top + itemTops[i] + itemHeights[i] * share - line);
      };
      let closest = 0;
      itemTops.forEach((_, i) => {
        if (gapTo(i) < gapTo(closest)) closest = i;
      });
      if (gapTo(closest) + ITEM_HOLD_PX < gapTo(targetItem)) targetItem = closest;
      const item = targetItem;

      // ---- Write.

      slots.forEach((el, i) => el.classList.toggle('is-waiting', journey < i + 2));

      if (onStage) {
        if (!flip && shownItem !== item && now - faceStart >= FACE_MIN_MS) {
          flip = { to: item, dir: item > shownItem ? 1 : -1, start: now };
          faceStart = now;
          placeFace(item, !farSide());
        }
      } else {
        // Off the stage the card has no face to keep: it comes back showing the right one.
        const held = leg < 1 ? 0 : LAST_ITEM;
        if (flip || shownItem !== held) {
          flip = null;
          shownItem = held;
          placeFace(held, farSide());
          showOnly(held);
        }
      }

      // The highlight always names the face on the card.
      const lit = onStage ? (flip?.to ?? shownItem) : item;
      if (lit !== litItem) {
        itemRefs.current[litItem]?.classList.remove('is-active');
        itemRefs.current[lit]?.classList.add('is-active');
        litItem = lit;
      }

      let angle = resting;
      let flipRoll = 0;
      let flipLift = 0;
      if (flip) {
        const t = clamp01((now - flip.start) / FLIP_MS);
        const bump = Math.sin(Math.PI * t);
        angle = resting + flip.dir * 180 * easeInOut(t);
        flipRoll = flip.dir * FLIP_ROLL * bump;
        flipLift = -FLIP_LIFT_PX * bump;
        if (t >= 1) {
          resting += flip.dir * 180;
          angle = resting;
          shownItem = flip.to;
          showOnly(shownItem);
          flip = null;
        }
      }

      setStage('visibility', onStage ? 'visible' : 'hidden');
      if (onStage) {
        const turn = faceTurn(stage.yaw + angle);
        setStageInner(
          'transform',
          `translateY(${flipLift + float}px) rotateZ(${stage.roll + flipRoll}deg) rotateX(${stage.pitch}deg) rotateY(${stage.yaw + angle}deg)`,
        );
        dressCard(stageInner, stageShadow, turn, 0);
      }

      let flyerOnScreen = false;
      if (flying) {
        const flat: Pose = { yaw: 0, pitch: 0, roll: 0 };
        let place: FlyerPlace;
        if (leg === 0) {
          const to = seat(slotRect);
          to.y += float * f;
          if (deck) {
            place = flightFromDeck(f, deck, to, stage, vh, vw);
          } else {
            // Without the island there is no deck to leave from, so it drops in from above.
            const above = { x: to.x, y: (-FLYER_HEIGHT * to.width) / FLYER_WIDTH, width: to.width };
            place = flightBetween(f, above, to, flat, stage, vw);
          }
        } else {
          const from = seat(leg === 1 ? slotRect : spotRects[leg - 2]);
          // Once a move starts the page scrolls on, but the card leaves from where it was on screen.
          from.y += Math.max(0, RISE_START * vh - sectionTops[leg - 1]);
          if (leg === 1) from.y += float * (1 - f);
          from.y = Math.max(from.y, (-FLYER_HEIGHT * from.width) / FLYER_WIDTH * PARK_ABOVE - PARK_GAP_PX);
          place = flightBetween(f, from, seat(spotRects[leg - 1]), leg === 1 ? stage : flat, flat, vw);
        }

        const landing = clamp01((f - LANDING_START) / (1 - LANDING_START));
        const scale = place.width / FLYER_WIDTH;
        const squash = 1 - LANDING_SQUASH * Math.sin(Math.PI * landing);
        const cx = place.x;
        const cy = place.y - Math.sin(Math.PI * landing) * 6;
        const inFlight = Math.sin(Math.PI * f);

        // The picture changes while the card is face down.
        const front = leg === 0 ? 0 : f < 0.5 ? leg : leg + 1;
        if (front !== frontShown) {
          frontShown = front;
          flyerFrontRefs.current.forEach((el, i) => el?.classList.toggle('is-current', i === front));
        }

        const halfW = (FLYER_WIDTH * scale) / 2 + 40;
        const halfH = (FLYER_HEIGHT * scale) / 2 + 40;
        flyerOnScreen = cx + halfW > 0 && cx - halfW < vw && cy + halfH > 0 && cy - halfH < vh;

        setFlyer('transform', `translate3d(${cx - FLYER_WIDTH / 2}px, ${cy - FLYER_HEIGHT / 2}px, 0) scale(${scale}, ${scale * squash})`);
        setFlyerInner(
          'transform',
          // Divided by the scale, or a card scaled down reads as more steeply foreshortened than the
          // same-sized sticky card, and it visibly ticks when they swap.
          `perspective(${place.perspective / scale}px) rotateZ(${place.roll}deg) rotateX(${place.tilt}deg) rotateZ(${place.twist}deg) rotateY(${place.yaw}deg)`,
        );
        flyer.classList.toggle('is-landing', f >= LANDING_START);
        dressCard(flyerInner, flyerShadow, faceTurn(place.yaw), inFlight);
      }
      setFlyer('visibility', flyerOnScreen ? 'visible' : 'hidden');

      if (flip || onStage || softerY !== scrollY) request();
    };

    function request() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    const onLayout = () => {
      deckPageY = null;
      measure();
      request();
    };
    measure();
    request();

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', onLayout);
    const layout = new ResizeObserver(onLayout);
    layout.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', onLayout);
      layout.disconnect();
      slots.forEach((el) => el.classList.remove('is-waiting'));
    };
  }, [isRtl]);

  const firstItem = allItems[0];
  const lastItem = allItems[LAST_ITEM];

  return (
    <>
      <div ref={storyRef} className="bg-night">
        <div className="page-gutter story-layout">
          <div className="story-card-column">
            <div aria-hidden="true" className="story-card-sticky">
              <div ref={slotRef} className="story-card-slot">
                <div ref={stageCardRef} className="story-card" style={{ visibility: 'hidden' }}>
                  <div ref={stageShadowRef} className="flight-shadow" />
                  <div ref={stageInnerRef} className="flight-card-inner">
                    <CardThickness />
                    {allItems.map((item, i) => (
                      <StoryFace
                        key={item.title}
                        number={item.number}
                        title={item.title}
                        Icon={item.Icon}
                        ref={(el) => {
                          faceRefs.current[i] = el;
                        }}
                      />
                    ))}
                    <CardSheen />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <StoryGroups
              groups={groups}
              itemRef={(index, el) => {
                itemRefs.current[index] = el;
              }}
            />
          </div>
        </div>
      </div>

      {/* Only shown during a flight, so the card can leave the story and land in later sections. */}
      <div aria-hidden="true" className="story-flight">
        <div ref={flyerRef} className="flight-card">
          <div ref={flyerShadowRef} className="flight-shadow" />
          <div ref={flyerInnerRef} className="flight-card-inner">
            <CardThickness />
            <img src={CARD_BACK} alt="" className="flight-face flight-back" />
            <StoryFace
              number={firstItem.number}
              title={firstItem.title}
              Icon={firstItem.Icon}
              ref={(el) => {
                flyerFrontRefs.current[0] = el;
              }}
            />
            <StoryFace
              number={lastItem.number}
              title={lastItem.title}
              Icon={lastItem.Icon}
              ref={(el) => {
                flyerFrontRefs.current[1] = el;
              }}
            />
            {PROJECT_CARDS.map((project, i) => (
              <picture key={project.id}>
                <source type="image/webp" srcSet={project.srcSet} sizes="375px" />
                <img
                  ref={(el) => {
                    flyerFrontRefs.current[i + 2] = el;
                  }}
                  src={project.image}
                  alt=""
                  className="flight-face flight-front"
                />
              </picture>
            ))}
            <CardSheen />
          </div>
        </div>
      </div>
    </>
  );
}
