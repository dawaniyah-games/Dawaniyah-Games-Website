/**
 * Whether the visitor wants sound. On unless they have turned it off, which is remembered between
 * visits. "On" still waits for their first real gesture: browsers allow nothing to play before one.
 */
import { soundEngine } from './soundEngine';

const KEY = 'dg-sound';

function remembered() {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

function remember(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Without storage the choice just lasts for this visit.
  }
}

/** `?sound=ask` shows the popup whatever is saved and whatever the browser allows, to preview it. */
const previewingPrompt = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sound') === 'ask';

let on = previewingPrompt || remembered();
let pulsed = false;
const listeners = new Set<() => void>();
const pulseListeners = new Set<() => void>();

export const isSoundOn = () => on;

export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeSoundPulse(listener: () => void) {
  pulseListeners.add(listener);
  return () => {
    pulseListeners.delete(listener);
  };
}

function set(next: boolean) {
  on = next;
  remember(next);
  listeners.forEach((listener) => listener());
}

/** Inside the click: this is the gesture the browser wants before it will play anything. */
export function toggleSound() {
  disarm();
  // On, but the browser is still holding it back: pressing the speaker is asking to hear it.
  if (on && !soundEngine.running) {
    set(true);
    soundEngine.turnOn({ announce: true });
  } else if (on) {
    soundEngine.turnOff();
    set(false);
  } else {
    set(true);
    soundEngine.turnOn({ announce: true });
  }
}

/** The sound popup, inside its gesture. Some keys do not count as one, so this can still wait for the next. */
export function acceptSound() {
  set(true);
  startSoundFromGesture(true);
}

let promptOpen = false;
const promptListeners = new Set<() => void>();

export const isSoundPromptOpen = () => promptOpen;

export function subscribeSoundPrompt(listener: () => void) {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

function setPrompt(open: boolean) {
  promptOpen = open;
  promptListeners.forEach((listener) => listener());
}

export const openSoundPrompt = () => setPrompt(true);
export const closeSoundPrompt = () => setPrompt(false);

/** Whenever the browser holds the sound back, on every visit. Only search engines are spared. */
export const shouldAskForSound = () => previewingPrompt || !isCrawler();

/** One soft pulse of the toggle, once a visit: there is sound here, if you want it. */
export function hintAtSound() {
  if (on || pulsed) return;
  pulsed = true;
  pulseListeners.forEach((listener) => listener());
}

// Sound is on, and the browser may need a gesture before it will play. A touch that scrolls may not
// be one, so nothing is created or downloaded for it unless the browser says it counted, and this
// keeps waiting until the context really runs.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/** Whether the browser took the end of this touch as a gesture. Without the API, click covers a tap. */
const touchCounted = () => (navigator as unknown as { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;

function onGesture(event: Event) {
  if (!on) {
    disarm();
    return;
  }
  // The toggle and the popup start it themselves.
  if (event.target instanceof Element && event.target.closest('.sound-toggle, .sound-prompt')) return;
  // Every scroll on a phone begins with one of these. A tap goes on to pointerup and click.
  if (event.type === 'pointerdown' && (event as PointerEvent).pointerType === 'touch') return;
  if (event.type === 'touchend' && !touchCounted()) return;
  startSoundFromGesture();
}

/** Inside a gesture. Without the pop, the music fading in is the answer to it. */
function startSoundFromGesture(announce = false) {
  if (!on) return;
  soundEngine.turnOn({ announce });
  soundEngine.nudge();
  // resume() settles a moment later.
  window.setTimeout(() => {
    if (soundEngine.running) disarm();
  }, 100);
}

function disarm() {
  GESTURES.forEach((gesture) => window.removeEventListener(gesture, onGesture, true));
}

/** Search engines and page-speed tools must get the page, not a step in front of it. */
export const isCrawler = () => /bot|crawl|spider|slurp|lighthouse|pagespeed/i.test(navigator.userAgent);

/**
 * Called as the loading screen ends. Plays there and then wherever the browser allows it: after a click
 * on another page of the site, for a site the visitor uses a lot, or one they have allowed in its settings.
 * Elsewhere the browser refuses, whatever the page does, and it takes a gesture.
 */
export async function startSoundIfAllowed(): Promise<'playing' | 'needs-gesture' | 'off'> {
  if (previewingPrompt) return 'needs-gesture';
  if (!on) return 'off';
  if (soundEngine.running) return 'playing';
  if (document.hidden || !(await soundEngine.allowedWithoutGesture())) return 'needs-gesture';
  if (!on) return 'off';
  soundEngine.turnOn({ announce: false });
  disarm();
  return 'playing';
}

if (typeof window !== 'undefined' && on) {
  GESTURES.forEach((gesture) => window.addEventListener(gesture, onGesture, { capture: true, passive: true }));
}

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sound') === 'debug') {
  void import('./soundDebug').then(({ showSoundDebug }) => showSoundDebug());
}
