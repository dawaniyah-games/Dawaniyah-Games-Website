/** A phone or tablet, where the finger scrolls the page on another thread and the address bar slides. */
export function isTouchScreen() {
  return window.matchMedia('(pointer: coarse)').matches;
}

let width = 0;
let height = 0;

/**
 * The screen height that scroll-driven motion is worked out against. On a phone window.innerHeight
 * changes whenever the address bar slides, which would move everything measured against it with no
 * scrolling at all, so there it only changes with the width: when the phone is turned.
 */
export function motionViewportHeight() {
  const nextWidth = window.innerWidth;
  if (nextWidth !== width || !isTouchScreen()) {
    width = nextWidth;
    height = window.innerHeight;
  }
  return height;
}
