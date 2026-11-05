/** Drawn when the URL has ?bird=debug: what the bird can see, and keys to make it do things. */
import type { BirdBrain, Perch } from './behaviour';
import type { Point, Stretch } from './flight';
import type { RejectedRun } from './perches';

const KIND_COLOURS: Record<Stretch['kind'], string> = { flap: '#e6398b', glide: '#2b8cff', swoop: '#ff9800', hover: '#17b169' };

export interface DebugView {
  brain: BirdBrain;
  perches: Perch[];
  rejected: RejectedRun[];
  usable: (perch: Perch) => boolean;
  feet: (perch: Perch) => Point;
  hit: { x: number; y: number; rx: number; ry: number } | null;
  fps: number;
  noFly: { left: number; top: number; right: number; bottom: number }[];
}

export const debugOn = () => new URLSearchParams(window.location.search).get('bird') === 'debug';
/** `&overlay=0` keeps the keys and hooks but draws nothing over the bird. */
export const overlayOn = () => new URLSearchParams(window.location.search).get('overlay') !== '0';

export const DEBUG_KEYS = {
  '1': 'look-around',
  '2': 'chirp',
  '3': 'hop',
  '4': 'home',
  '5': 'other',
  '6': 'annoyed',
  '7': 'sleep',
  '8': 'startled',
} as const;

export function drawDebug(ctx: CanvasRenderingContext2D, view: DebugView) {
  const { brain } = view;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.font = '600 10px ui-monospace, monospace';

  ctx.strokeStyle = 'rgb(220 0 0 / 0.35)';
  for (const r of view.noFly) ctx.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);

  for (const run of view.rejected) {
    ctx.fillStyle = '#d32020';
    ctx.fillRect(run.x - run.width / 2, run.y, run.width, 2);
    ctx.fillText(`${Math.round(run.width)} ${run.why}`, run.x - run.width / 2, run.y - 3);
  }
  for (const perch of view.perches) {
    const { x, y } = view.feet(perch);
    const ok = view.usable(perch) && !perch.gone;
    ctx.fillStyle = ok ? '#0a9f4b' : '#d32020';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (perch.width) ctx.fillRect(x - perch.width / 2, y, perch.width, 2);
    ctx.fillText(`${perch.id} ${perch.width ? Math.round(perch.width) : ''} ${perch.facing === 'any' ? '' : perch.facing}`, x + 5, y + 12);
  }

  const route = brain.lastRoute;
  if (route) {
    let from = 0;
    for (const stretch of route.plan) {
      const end = Math.min(stretch.end, route.path.length);
      ctx.strokeStyle = KIND_COLOURS[stretch.kind];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = from; s <= end; s += 6) {
        const p = route.path.at(s);
        if (s === from) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      from = end;
    }
    ctx.lineWidth = 1;
  }

  const { pose } = brain;
  if (view.hit) {
    ctx.strokeStyle = '#7a1fd1';
    ctx.beginPath();
    ctx.ellipse(view.hit.x, view.hit.y, view.hit.rx, view.hit.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a1fd1';
  ctx.fillRect(pose.x - 2, pose.y - 2, 4, 4);

  const text = `${brain.state}  ${pose.anim} ${pose.frame}  k ${brain.scale.toFixed(3)}  h ${brain.currentHeight.toFixed(1)}  ${Math.round(view.fps)} fps`;
  const x = 8;
  const y = 8;
  ctx.font = '600 12px ui-monospace, monospace';
  ctx.fillStyle = 'rgb(20 10 40 / 0.8)';
  ctx.fillRect(x, y, ctx.measureText(text).width + 12, 20);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + 6, y + 14);
  ctx.restore();
}
