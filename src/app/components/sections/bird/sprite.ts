/** Draws one frame of a sheet, pinned on a point of the frame, at sub-pixel positions. */
import type { BirdAnim, BirdSheets } from './birdAtlas';

export interface Sprite {
  anim: BirdAnim;
  frame: number;
  x: number; // where `pin` goes, CSS pixels
  y: number;
  pin: { x: number; y: number }; // sheet pixels
  flip: boolean;
  rot: number; // radians
  sx: number;
  sy: number;
  k: number; // CSS pixels per sheet pixel
  alpha: number;
}

export function drawSprite(ctx: CanvasRenderingContext2D, sheets: BirdSheets, sprite: Sprite) {
  const sheet = sheets.sheet(sprite.anim);
  if (!sheet) return;
  const { frameWidth, frameHeight } = sheets.atlas.animations[sprite.anim];
  ctx.save();
  ctx.globalAlpha = sprite.alpha;
  ctx.translate(sprite.x, sprite.y);
  if (sprite.rot) ctx.rotate(sprite.rot);
  ctx.scale((sprite.flip ? -1 : 1) * sprite.sx * sprite.k, sprite.sy * sprite.k);
  ctx.drawImage(sheet, (sprite.frame - 1) * frameWidth, 0, frameWidth, frameHeight, -sprite.pin.x, -sprite.pin.y, frameWidth, frameHeight);
  ctx.restore();
}

/** Where a point of a frame ends up in the page, for a frame pinned at `at` on `pin`, level. */
export function worldOf(point: { x: number; y: number }, pin: { x: number; y: number }, at: { x: number; y: number }, flip: boolean, k: number) {
  return { x: at.x + (flip ? -1 : 1) * (point.x - pin.x) * k, y: at.y + (point.y - pin.y) * k };
}
