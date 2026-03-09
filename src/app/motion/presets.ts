export const EASE_SMOOTH: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const VIEWPORT_ONCE = {
  once: true,
  // Use 0 threshold so the animation fires as soon as *any* part of the
  // element enters the viewport — this reliably handles the case where a
  // section mounts while already in view (e.g. after a navbar navigation).
  amount: 0,
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_SMOOTH },
  },
} as const;

export const fadeLeft = {
  hidden: { opacity: 0, x: -18 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: EASE_SMOOTH },
  },
} as const;

export const fadeRight = {
  hidden: { opacity: 0, x: 18 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: EASE_SMOOTH },
  },
} as const;

export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.6, ease: EASE_SMOOTH },
  },
} as const;

export const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_SMOOTH },
  },
} as const;

export const stagger = (staggerChildren = 0.08, delayChildren = 0.05) =>
  ({
    hidden: {},
    show: {
      transition: { staggerChildren, delayChildren },
    },
  }) as const;
