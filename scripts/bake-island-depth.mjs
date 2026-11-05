// Bakes public/island/depth.png from the island's layer masks: white is near, black is far.
// Run with: node scripts/bake-island-depth.mjs
//
// The ground is one sloping plane, so its depth follows the art's y. The cliff under it starts at
// the depth of the lip above it and recedes towards the bottom rock tip. Every ground layer samples
// this one map, so two layers meeting at a pixel always stay together when the camera moves.
import sharp from 'sharp';
import fs from 'node:fs';

const SCENE = 'src/app/components/sections/island/scene.json';
const OUT = 'public/island/depth.png';
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
const { w: ART_W, h: ART_H } = scene.artboard;
const { near, far, step, ground, cliffRecede } = scene.depth;
const W = Math.round(ART_W / step);
const H = Math.round(ART_H / step);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 2;

/** The ground's depth at an art y: back edge, front lip, then a little more out to the very front. */
function groundDepth(y) {
  if (y <= ground.lipY) return lerp(ground.backZ, ground.lipZ, clamp01((y - ground.backY) / (ground.lipY - ground.backY)));
  return lerp(ground.lipZ, ground.frontZ, clamp01((y - ground.lipY) / (ground.frontY - ground.lipY)));
}

async function alphaMask(id) {
  const layer = scene.layers.find((l) => l.id === id);
  const raw = await sharp(`public/island/${layer.file}`)
    .ensureAlpha()
    .resize(Math.max(1, Math.round(layer.w / step)), Math.max(1, Math.round(layer.h / step)), { fit: 'fill' })
    .extractChannel(3)
    .raw()
    .toBuffer();
  const left = Math.round(layer.x / step);
  const top = Math.round(layer.y / step);
  const width = Math.round(layer.w / step);
  return (x, y) => {
    const col = x - left;
    const row = y - top;
    if (col < 0 || row < 0 || col >= width) return 0;
    return raw[row * width + col] ?? 0;
  };
}

const plateau = await alphaMask('island-sand-plateau');
const cliff = await alphaMask('island-cliff-base');

// For each column, where the sand ends and where the rock below it ends.
const lip = new Float64Array(W);
const bottom = new Float64Array(W);
for (let x = 0; x < W; x += 1) {
  let lipRow = -1;
  let bottomRow = -1;
  for (let y = 0; y < H; y += 1) {
    if (plateau(x, y) > 128) lipRow = y;
    if (cliff(x, y) > 128 || plateau(x, y) > 128) bottomRow = y;
  }
  lip[x] = lipRow;
  bottom[x] = bottomRow;
}

// Fill columns with nothing in them from their neighbours, then smooth: the painted edge is jagged,
// and the mesh must not follow every notch in the rock.
function fillAndSmooth(values, radius) {
  const known = [...values.keys()].filter((i) => values[i] >= 0);
  const filled = Array.from(values, (v, i) => {
    if (v >= 0) return v;
    let best = known[0];
    for (const k of known) if (Math.abs(k - i) < Math.abs(best - i)) best = k;
    return values[best];
  });
  return filled.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - radius); k <= Math.min(filled.length - 1, i + radius); k += 1) {
      sum += filled[k];
      n += 1;
    }
    return sum / n;
  });
}
const smoothLip = fillAndSmooth(lip, Math.round(120 / step));
const smoothBottom = fillAndSmooth(bottom, Math.round(120 / step));

const depth = Buffer.alloc(W * H);
for (let x = 0; x < W; x += 1) {
  const lipY = smoothLip[x] * step;
  const bottomY = Math.max(smoothBottom[x] * step, lipY + 1);
  const lipZ = groundDepth(lipY);
  for (let y = 0; y < H; y += 1) {
    const artY = y * step;
    const z = artY <= lipY ? groundDepth(artY) : lerp(lipZ, lipZ - cliffRecede, easeOut(clamp01((artY - lipY) / (bottomY - lipY))));
    depth[y * W + x] = Math.round(clamp01((z - far) / (near - far)) * 255);
  }
}

await sharp(depth, { raw: { width: W, height: H, channels: 1 } }).blur(2.5).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`${OUT}: ${W}x${H}, ${fs.statSync(OUT).size} bytes`);
