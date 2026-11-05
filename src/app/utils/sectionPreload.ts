export type SectionPreloadFn = () => void | Promise<unknown>;

const preloaders = new Map<string, SectionPreloadFn>();

function normalizeId(idOrHash: string) {
  return idOrHash.startsWith('#') ? idOrHash.slice(1) : idOrHash;
}

export function registerSectionPreloader(id: string, preload: SectionPreloadFn) {
  preloaders.set(normalizeId(id), preload);
}

export function unregisterSectionPreloader(id: string, preload?: SectionPreloadFn) {
  const normalized = normalizeId(id);
  const existing = preloaders.get(normalized);
  if (!existing) return;
  if (preload && existing !== preload) return;
  preloaders.delete(normalized);
}

export function preloadSection(idOrHash: string) {
  const normalized = normalizeId(idOrHash);
  preloaders.get(normalized)?.();
}

/* Scrolling to a section further down. Contact, FAQ and the footer mount lazily, so until they do
   the anchor is an empty box at the very bottom of a page that is still too short to reach it.
   Mount everything first, wait for the layout to settle, then scroll. */

const MOUNT_ALL_EVENT = 'sections:mount-all';
let mountAllRequested = false;

export function mountAllSections() {
  mountAllRequested = true;
  window.dispatchEvent(new Event(MOUNT_ALL_EVENT));
}

/** For DeferredSection: call `mount` now if a mount-all already happened, or later when it does. */
export function onMountAll(mount: () => void) {
  if (mountAllRequested) {
    mount();
    return () => {};
  }
  window.addEventListener(MOUNT_ALL_EVENT, mount);
  return () => window.removeEventListener(MOUNT_ALL_EVENT, mount);
}

const SETTLE_TIMEOUT_MS = 2500;
const STABLE_FRAMES = 3;

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/** Smooth-scrolls to `#id` once it has mounted and the page height has stopped changing. */
export async function scrollToSection(idOrHash: string) {
  const id = normalizeId(idOrHash);
  preloadSection(id);
  mountAllSections();

  const started = performance.now();
  let lastHeight = -1;
  let stable = 0;
  while (performance.now() - started < SETTLE_TIMEOUT_MS) {
    await nextFrame();
    const el = document.getElementById(id);
    const height = document.documentElement.scrollHeight;
    const ready = !!el && el.getBoundingClientRect().height > 0;
    stable = ready && height === lastHeight ? stable + 1 : 0;
    lastHeight = height;
    if (stable >= STABLE_FRAMES) break;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
