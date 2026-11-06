/**
 * How the phone is held, as the island's orbit reads a pointer: -1 to 1 on each axis. It behaves like
 * a tray, so what is on it leans the way the phone tips. The orbit's spring smooths the result, which
 * is also what keeps a steady hand's tremor out of it.
 */
const RANGE_DEG = 12; // a tip this far takes the orbit most of the way
const REACH = 1.7; // of the orbit a mouse gets: a phone is small, so it has to turn further to show
const RECENTRE_S = 8; // held at a new angle for this long, that angle becomes the rest
const SENSOR_FLIP_DEG = 30; // a bigger step between two readings is the sensor flipping near upright

type Reading = { side: number; front: number };

const DECLINED_KEY = 'island-tilt-declined';

function reading(event: DeviceOrientationEvent): Reading | null {
  const { beta, gamma } = event;
  if (beta === null || gamma === null) return null;
  // Sideways on a phone is the sensor's other axis.
  const angle = window.screen.orientation?.angle ?? 0;
  if (angle === 90) return { side: beta, front: -gamma };
  if (angle === 270) return { side: -beta, front: gamma };
  if (angle === 180) return { side: -gamma, front: -beta };
  return { side: gamma, front: beta };
}

type AskingOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

function declined() {
  try {
    return window.localStorage.getItem(DECLINED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Whether the sensor can be used now, or needs a tap first. Asking without a tap never shows a prompt:
 * most phones just say yes, and an iPhone refuses unless it was already told yes this session.
 */
export async function tiltAccess(): Promise<'granted' | 'denied' | 'needs-tap'> {
  if (typeof DeviceOrientationEvent === 'undefined') return 'denied';
  const { requestPermission } = DeviceOrientationEvent as AskingOrientation;
  if (!requestPermission) return 'granted';
  try {
    return await requestPermission.call(DeviceOrientationEvent);
  } catch {
    return declined() ? 'denied' : 'needs-tap';
  }
}

/** Has to run inside the tap. */
export async function askForTilt() {
  const granted = (await tiltAccess()) === 'granted';
  if (!granted) {
    try {
      window.localStorage.setItem(DECLINED_KEY, '1');
    } catch {
      // Without storage the offer simply comes back on the next visit.
    }
  }
  return granted;
}

export function watchTilt(onTilt: (x: number, y: number) => void) {
  let rest: Reading | null = null;
  let last: Reading | null = null;
  let lastTime = 0;

  const onOrientation = (event: DeviceOrientationEvent) => {
    const now = reading(event);
    if (!now) return;
    const flipped = last !== null && (Math.abs(now.side - last.side) > SENSOR_FLIP_DEG || Math.abs(now.front - last.front) > SENSOR_FLIP_DEG);
    if (rest === null || flipped) {
      rest = { ...now };
    } else {
      const share = 1 - Math.exp(-Math.min(event.timeStamp - lastTime, 100) / 1000 / RECENTRE_S);
      rest.side += (now.side - rest.side) * share;
      rest.front += (now.front - rest.front) * share;
    }
    last = now;
    lastTime = event.timeStamp;
    onTilt(REACH * Math.tanh((now.side - rest.side) / RANGE_DEG), REACH * Math.tanh((now.front - rest.front) / RANGE_DEG));
  };

  window.addEventListener('deviceorientation', onOrientation);
  return () => window.removeEventListener('deviceorientation', onOrientation);
}
