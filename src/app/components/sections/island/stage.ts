/**
 * The island as one three.js scene seen by one camera.
 *
 * The art is a painting cut into layers, so each layer is a textured plane that keeps its painted
 * light. A point at depth z is moved towards the camera axis by (D - z) / D, which puts it exactly
 * on its art pixel at the rest pose: the picture only comes apart into depth once the camera moves.
 * The ground layers are meshes whose vertices sample one depth map, so two layers that meet at a
 * pixel stay together. Standing things are flat planes at the depth of their foot, so they stay
 * pinned to the sand.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NoColorSpace,
  NormalBlending,
  PerspectiveCamera,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from 'three';
import { createDie, DIE_UNITS_PER_EDGE, type IslandDie } from './die3d';
import { LAYERS, VIEW, byId, type IslandFrame, type IslandImages, type Layer, type Particle, type Token } from './engine';
import scene from './scene.json';

const CAMERA_FOV = 24;
const ART_HEIGHT = scene.artboard.h;
export const D = ART_HEIGHT / 2 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
const CENTER_X = 1204;
const CENTER_Y = 980;
// The orbit turns about a point back in the island, not on the z = 0 plane. Around z = 0 the far
// layers would move most; from here the cliff and near rocks swing and the tent and palms barely do.
const ORBIT_Z = -300;
const NEAR = D * 0.2;
const FAR = D * 2.5;
const MAX_DPR = 1.75;
const GRID_CELL = 25; // art pixels: about 96 x 72 segments over the plateau
const ATLAS_PADDING = 6;
const MAX_ATLAS = 4096;
const FX_ATLAS = 1024;
const FX_CAPACITY = 110;
const SQUARE_DEPTH = 420;
const STONE_GLOW_SCALE = 1.1;
// Spray around water that keeps falling, not the place where the water ends. The fall carries on
// past here to the hero's edge (WaterfallEdge), so the mist at the old foot stays faint and white.
const STANDING_MIST = 0.25;
const SHADOW_SIZE = 110;

const GROUND_LAYERS = new Set(['island-cliff-base', 'island-sand-plateau', 'island-stream-waterfall', 'island-rug', 'island-rope-bridge']);
const isGround = (layer: Layer) => GROUND_LAYERS.has(layer.id) || layer.group === 'island-board';
const WATER = byId('island-stream-waterfall');
const BENT_LAYER = 'tent-and-back-strip'; // sand and rocks at its foot, tent above: see depthOfLayer

type Rect = { x: number; y: number; w: number; h: number };
type AtlasItem = { id: string; w: number; h: number; draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Older browsers have no roundRect, and a plain square is a fine fallback for a tiny sparkle. */
function roundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, radius);
  else ctx.rect(x, y, size, size);
}

/** Where a point of the art goes in the world so that it still lands on its pixel at rest. */
function toWorld(x: number, y: number, z: number): [number, number, number] {
  const s = (D - z) / D;
  return [CENTER_X + (x - CENTER_X) * s, -CENTER_Y + (CENTER_Y - y) * s, z];
}

/** Shelf packer. Returns null if the items do not fit. */
function pack(items: AtlasItem[], size: number, padding: number) {
  const rects = new Map<string, Rect>();
  let x = padding;
  let y = padding;
  let shelf = 0;
  for (const item of [...items].sort((a, b) => b.h - a.h)) {
    if (x + item.w + padding > size) {
      x = padding;
      y += shelf + padding;
      shelf = 0;
    }
    if (item.w + padding * 2 > size || y + item.h + padding > size) return null;
    rects.set(item.id, { x, y, w: item.w, h: item.h });
    x += item.w + padding;
    shelf = Math.max(shelf, item.h);
  }
  return rects;
}

function buildAtlas(items: AtlasItem[], size: number, rects: Map<string, Rect>) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  for (const item of items) {
    const rect = rects.get(item.id)!;
    item.draw(ctx, rect.x, rect.y, rect.w, rect.h);
  }
  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = NoColorSpace; // the painted colours go straight to the screen
  texture.premultiplyAlpha = true;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

function rawTexture(image: HTMLImageElement | undefined, repeat = false) {
  const texture = image ? new Texture(image) : new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  texture.flipY = false;
  texture.colorSpace = NoColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Reads the baked depth map. Near is positive. */
function depthSampler(image: HTMLImageElement | undefined) {
  const { near, far } = scene.depth;
  if (!image) return () => 0;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const value = (col: number, row: number) => data[(row * width + col) * 4];
  const toColumn = width / scene.artboard.w;
  const toRow = height / scene.artboard.h;
  return (x: number, y: number) => {
    const u = Math.max(0, Math.min(width - 1.001, x * toColumn));
    const v = Math.max(0, Math.min(height - 1.001, y * toRow));
    const col = Math.floor(u);
    const row = Math.floor(v);
    const a = u - col;
    const b = v - row;
    const top = value(col, row) * (1 - a) + value(col + 1, row) * a;
    const bottom = value(col, row + 1) * (1 - a) + value(col + 1, row + 1) * a;
    return far + ((top * (1 - b) + bottom * b) / 255) * (near - far);
  };
}

const LAYER_VERTEX = /* glsl */ `
  attribute vec4 aSway; // pivot x, pivot y, amplitude in radians, period
  attribute vec2 aSwayShape; // phase, share of the faster second wave
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    if (aSway.z != 0.0) {
      float w = 6.2831853 * uTime / aSway.w;
      float angle = aSway.z * sin(w + aSwayShape.x);
      if (aSwayShape.y > 0.0) angle += aSwayShape.y * aSway.z * sin(w / 0.37 + aSwayShape.x);
      float c = cos(-angle);
      float s = sin(-angle);
      vec2 d = p.xy - aSway.xy;
      p.xy = aSway.xy + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const LAYER_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uTintOn;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(uMap, vUv);
    color.rgb = mix(color.rgb, uTint * color.a, uTintOn);
    gl_FragColor = color * uOpacity;
  }
`;

const WATER_VERTEX = /* glsl */ `
  varying vec2 vArt;
  void main() {
    vArt = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WATER_FRAGMENT = /* glsl */ `
  uniform sampler2D uStreak;
  uniform sampler2D uRipple;
  uniform sampler2D uMaskFall;
  uniform sampler2D uMaskStream;
  uniform float uTime;
  uniform vec4 uLayer; // x, y, w, h of the water layer
  uniform vec4 uFall; // lip y, band left, band right, fade start
  varying vec2 vArt;

  float maskAt(sampler2D mask, vec2 uv) {
    vec4 m = texture2D(mask, uv);
    return min(m.a, m.r);
  }

  void main() {
    vec2 a = vArt;
    vec2 uv = (a - uLayer.xy) / uLayer.zw;
    float lip = uFall.x;

    // Fall: two streak layers running down at different speeds, with a sideways wobble.
    float wobble = sin(a.y * 0.022 + uTime * 2.4) * 4.0 * clamp((a.y - lip) / 80.0, 0.0, 1.0);
    vec2 fa = vec2(a.x + wobble, a.y);
    vec4 s1 = texture2D(uStreak, vec2(fa.x, fa.y - uTime * 260.0) / vec2(256.0, 512.0));
    vec4 s2 = texture2D(uStreak, vec2(fa.x - 90.0, fa.y - uTime * 380.0) / vec2(256.0 * 0.7, 512.0 * 0.7));
    float end = uLayer.y + uLayer.w;
    float fade = 1.0 - smoothstep(uFall.w, end, a.y);
    float fallMask = maskAt(uMaskFall, uv) * fade * step(lip, a.y);
    vec3 color = s1.rgb * s1.a * 0.55;
    float alpha = s1.a * 0.55;
    color = s2.rgb * s2.a * 0.35 + color * (1.0 - s2.a * 0.35);
    alpha = s2.a * 0.35 + alpha * (1.0 - s2.a * 0.35);

    // The bright band where the water tips over the edge.
    float band = (0.4 + 0.3 * (0.5 + 0.5 * sin(6.2831853 * uTime / 1.6)))
      * step(lip, a.y) * step(a.y, lip + 12.0) * step(uFall.y, a.x) * step(a.x, uFall.z);
    color = vec3(band) + color * (1.0 - band);
    alpha = band + alpha * (1.0 - band);
    color *= fallMask;
    alpha *= fallMask;

    // Stream: the ripple tile drifting down along the path.
    vec4 ripple = texture2D(uRipple, vec2(a.x + uTime * 25.0, a.y - uTime * 65.0) / 256.0);
    float streamMask = maskAt(uMaskStream, uv) * 0.9;
    vec3 streamColor = ripple.rgb * ripple.a * streamMask;
    float streamAlpha = ripple.a * streamMask;
    gl_FragColor = vec4(color + streamColor * (1.0 - alpha), alpha + streamAlpha * (1.0 - alpha));
  }
`;

const FX_VERTEX = /* glsl */ `
  attribute vec2 corner;
  attribute vec3 iPos;
  attribute vec2 iSize;
  attribute float iRot;
  attribute float iAlpha;
  attribute vec4 iUv;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vUv = mix(iUv.xy, iUv.zw, corner + 0.5);
    vAlpha = iAlpha;
    float c = cos(iRot);
    float s = sin(iRot);
    vec2 d = (corner * vec2(1.0, -1.0)) * iSize;
    vec4 view = modelViewMatrix * vec4(iPos, 1.0);
    view.xy += vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    gl_Position = projectionMatrix * view;
  }
`;
const FX_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    gl_FragColor = texture2D(uMap, vUv) * vAlpha;
  }
`;

/** Quads with their own position, size, turn and alpha, all in one draw call. */
function createFx(map: Texture, capacity: number, additive: boolean) {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('corner', new BufferAttribute(new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]), 2));
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const attributes = {
    iPos: new InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
    iSize: new InstancedBufferAttribute(new Float32Array(capacity * 2), 2),
    iRot: new InstancedBufferAttribute(new Float32Array(capacity), 1),
    iAlpha: new InstancedBufferAttribute(new Float32Array(capacity), 1),
    iUv: new InstancedBufferAttribute(new Float32Array(capacity * 4), 4),
  };
  Object.entries(attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
  geometry.instanceCount = 0;

  const material = new ShaderMaterial({
    uniforms: { uMap: { value: map } },
    vertexShader: FX_VERTEX,
    fragmentShader: FX_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    blending: additive ? AdditiveBlending : NormalBlending,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  let count = 0;
  return {
    mesh,
    add(uv: number[], position: [number, number, number], width: number, height: number, rotation: number, alpha: number) {
      if (count >= capacity) return;
      attributes.iPos.setXYZ(count, position[0], position[1], position[2]);
      attributes.iSize.setXY(count, width, height);
      attributes.iRot.setX(count, rotation);
      attributes.iAlpha.setX(count, alpha);
      attributes.iUv.setXYZW(count, uv[0], uv[1], uv[2], uv[3]);
      count += 1;
    },
    commit() {
      geometry.instanceCount = count;
      Object.values(attributes).forEach((attribute) => {
        attribute.needsUpdate = true;
      });
      count = 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface IslandStage {
  die: IslandDie;
  setTokens(tokens: Token[]): void;
  resize(width: number, height: number): void;
  render(frame: IslandFrame): void;
  /** Where a point of the art is on the canvas now, in CSS pixels, and the CSS pixels per art pixel. */
  project(x: number, y: number): { x: number; y: number; scale: number };
  /** The same for a point on a standing layer, which lies in that layer's plane. */
  projectOnLayer(layerId: string, x: number, y: number): { x: number; y: number };
  dispose(): void;
}

export function createStage(canvas: HTMLCanvasElement, images: IslandImages): IslandStage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap; // the only type that blurs, and the sand's shadows are soft

  const world = new Scene();
  const root = new Group();
  world.add(root);

  // The off-centre window is the art rectangle at z = 0, so 1 unit there is 1 art pixel at rest.
  const camera = new PerspectiveCamera(CAMERA_FOV, VIEW.w / VIEW.h, NEAR, FAR);
  const windowScale = NEAR / D;
  camera.projectionMatrix.makePerspective(
    (VIEW.x - CENTER_X) * windowScale,
    (VIEW.x + VIEW.w - CENTER_X) * windowScale,
    (CENTER_Y - VIEW.y) * windowScale,
    (CENTER_Y - VIEW.y - VIEW.h) * windowScale,
    NEAR,
    FAR,
  );
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  const look = new Vector3(CENTER_X, -CENTER_Y, ORBIT_Z);

  const depthAt = depthSampler(images.sprites.get('depth'));
  const groundDepth = (layer: Layer) => (layer.id === BENT_LAYER ? scene.depth.standLine : Infinity);

  /** Ground follows the map. This layer does too, up to the line where its tent stands up from it. */
  const depthOfLayer = (layer: Layer, x: number, y: number) => {
    const line = groundDepth(layer);
    return depthAt(x, Math.max(y, line === Infinity ? y : line));
  };

  // ---- Main atlas: every layer, at the size this screen can actually show.
  const pixels = Math.min(window.devicePixelRatio || 1, MAX_DPR) * (canvas.clientWidth / VIEW.w);
  const maxAtlas = Math.min(renderer.capabilities.maxTextureSize, MAX_ATLAS);
  let atlasScale = Math.max(0.5, Math.min(0.85, pixels * 1.15));
  const layerItems = (): AtlasItem[] =>
    LAYERS.flatMap((layer) => {
      const img = images.layers.get(layer.id);
      if (!img) return [];
      const w = Math.ceil(layer.w * atlasScale);
      const h = Math.ceil(layer.h * atlasScale);
      return [
        {
          id: layer.id,
          w,
          h,
          draw: (ctx, x, y, width, height) => {
            ctx.drawImage(img, x, y, width, height);
            if (layer.id !== WATER.id) return;
            // The painted fall dissolves into the mist instead of stopping dead.
            const fall = scene.water.waterfall;
            const from = y + ((fall.fadeFromY - layer.y) / layer.h) * height;
            const fade = ctx.createLinearGradient(0, from, 0, y + height);
            fade.addColorStop(0, 'rgba(0,0,0,0)');
            fade.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = fade;
            ctx.fillRect(x, from, width, y + height - from);
            ctx.globalCompositeOperation = 'source-over';
          },
        },
      ];
    });
  let items = layerItems();
  let atlasSize = maxAtlas >= 2048 ? 2048 : maxAtlas;
  let rects = pack(items, atlasSize, ATLAS_PADDING);
  while (!rects) {
    if (atlasSize < maxAtlas) {
      atlasSize *= 2;
    } else {
      atlasScale *= 0.92;
      items = layerItems();
    }
    rects = pack(items, atlasSize, ATLAS_PADDING);
  }
  const atlas = buildAtlas(items, atlasSize, rects);
  const atlasRects = rects;

  const layerMaterial = new ShaderMaterial({
    uniforms: {
      uMap: { value: atlas },
      uTime: { value: 0 },
      uTint: { value: new Vector3(1, 1, 1) },
      uTintOn: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: LAYER_VERTEX,
    fragmentShader: LAYER_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });

  type Sway = { pivot: number[]; amplitude: number; period: number; phase: number; second: number };
  const seeded = (i: number) => {
    const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };

  const swayOf = (layer: Layer, index: number, foot: [number, number]): Sway | null => {
    if (layer.id === 'palm-right-crown' || layer.id === 'palm-left-crown') {
      const palm = scene.palms[layer.id];
      return {
        pivot: layer.pivot!,
        amplitude: (palm.amplitudeDeg * Math.PI) / 180,
        period: palm.periodS,
        phase: palm.phase,
        second: 0.35,
      };
    }
    if (layer.anim === 'plant-sway-subtle') {
      return {
        pivot: foot,
        amplitude: (0.6 * Math.PI) / 180,
        period: 3 + seeded(index),
        phase: seeded(index + 40) * Math.PI * 2,
        second: 0,
      };
    }
    return null;
  };

  /** The point that decides how deep a standing layer is. Palms stand well behind their cut-outs. */
  const footOf = (layer: Layer): [number, number] => {
    const palm = layer.id.startsWith('palm-right') ? scene.palms['palm-right-crown'] : layer.id.startsWith('palm-left') ? scene.palms['palm-left-crown'] : null;
    return palm ? (palm.foot as [number, number]) : [layer.x + layer.w / 2, layer.y + layer.h];
  };

  function buildBatch(layers: Layer[]) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const sways: number[] = [];
    const shapes: number[] = [];
    const indices: number[] = [];
    layers.forEach((layer) => {
      const rect = atlasRects.get(layer.id);
      if (!rect) return;
      const curved = isGround(layer) || layer.id === BENT_LAYER;
      const nx = curved ? Math.max(1, Math.ceil(layer.w / GRID_CELL)) : 1;
      const ny = curved ? Math.max(1, Math.ceil(layer.h / GRID_CELL)) : 1;
      const foot = footOf(layer);
      const standing = curved ? 0 : depthAt(foot[0], foot[1]);
      const sway = swayOf(layer, LAYERS.indexOf(layer), foot);
      const pivot = sway ? toWorld(sway.pivot[0], sway.pivot[1], standing) : [0, 0, 0];
      const first = positions.length / 3;
      for (let j = 0; j <= ny; j += 1) {
        for (let i = 0; i <= nx; i += 1) {
          const x = layer.x + (layer.w * i) / nx;
          const y = layer.y + (layer.h * j) / ny;
          const z = curved ? depthOfLayer(layer, x, y) : standing;
          positions.push(...toWorld(x, y, z));
          uvs.push((rect.x + (rect.w * i) / nx) / atlasSize, (rect.y + (rect.h * j) / ny) / atlasSize);
          sways.push(pivot[0], pivot[1], sway?.amplitude ?? 0, sway?.period ?? 1);
          shapes.push(sway?.phase ?? 0, sway?.second ?? 0);
        }
      }
      for (let j = 0; j < ny; j += 1) {
        for (let i = 0; i < nx; i += 1) {
          const a = first + j * (nx + 1) + i;
          const b = a + 1;
          const c = a + nx + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setAttribute('aSway', new BufferAttribute(new Float32Array(sways), 4));
    geometry.setAttribute('aSwayShape', new BufferAttribute(new Float32Array(shapes), 2));
    geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    return geometry;
  }

  const addMesh = (geometry: BufferGeometry, material: ShaderMaterial, renderOrder: number) => {
    const mesh = new Mesh(geometry, material);
    mesh.renderOrder = renderOrder;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  };

  // In paint order. The stage only ever draws back to front; nothing tests depth but the die.
  const behind = LAYERS.filter((layer) => layer.z <= 8);
  const onSand = LAYERS.filter((layer) => layer.z >= 9 && layer.z < 60);
  const props = LAYERS.filter((layer) => layer.group === 'props' && layer.role !== 'token').sort((a, b) => a.y + a.h - (b.y + b.h));
  const batchBehind = buildBatch(behind);
  const batchSand = buildBatch(onSand);
  const batchProps = buildBatch(props);
  addMesh(batchBehind, layerMaterial, 1);
  addMesh(batchSand, layerMaterial, 3);
  addMesh(batchProps, layerMaterial, 5);

  // ---- Water: a scrolling shader on a mesh that follows the same ground.
  const waterGeometry = (() => {
    const nx = Math.ceil(WATER.w / GRID_CELL);
    const ny = Math.ceil(WATER.h / GRID_CELL);
    const positions: number[] = [];
    const arts: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const x = WATER.x + (WATER.w * i) / nx;
        const y = WATER.y + (WATER.h * j) / ny;
        positions.push(...toWorld(x, y, depthAt(x, y)));
        arts.push(x, y);
      }
    }
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const a = j * (nx + 1) + i;
        indices.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(arts), 2));
    geometry.setIndex(indices);
    return geometry;
  })();
  const waterTextures = [
    rawTexture(images.sprites.get('streak'), true),
    rawTexture(images.sprites.get('ripple'), true),
    rawTexture(images.sprites.get('maskFall')),
    rawTexture(images.sprites.get('maskStream')),
  ];
  const fall = scene.water.waterfall;
  const waterMaterial = new ShaderMaterial({
    uniforms: {
      uStreak: { value: waterTextures[0] },
      uRipple: { value: waterTextures[1] },
      uMaskFall: { value: waterTextures[2] },
      uMaskStream: { value: waterTextures[3] },
      uTime: { value: 0 },
      uLayer: { value: [WATER.x, WATER.y, WATER.w, WATER.h] },
      uFall: { value: [fall.lipY, fall.x[0], fall.x[1], fall.fadeFromY] },
    },
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  addMesh(waterGeometry, waterMaterial, 2);

  // ---- One quad per stepping stone, lit when a token lands on it.
  const saffron = new Vector3(0xf4 / 255, 0xb7 / 255, 0x40 / 255);
  const glowMaterial = layerMaterial.clone();
  glowMaterial.uniforms.uMap.value = atlas;
  glowMaterial.uniforms.uTint.value = saffron;
  glowMaterial.uniforms.uTintOn.value = 1;
  const stoneLayers = LAYERS.filter((layer) => layer.role === 'stepping-stone');
  const stoneGlows = scene.board.stones.map((stone) => {
    const layer = stoneLayers.find((candidate) => {
      const cx = candidate.x + candidate.w / 2;
      const cy = candidate.y + candidate.h / 2;
      return Math.abs(cx - stone.center[0]) < candidate.w / 2 && Math.abs(cy - stone.center[1]) < candidate.h / 2;
    });
    if (!layer) return null;
    const grown: Layer = {
      ...layer,
      x: layer.x - layer.w * ((STONE_GLOW_SCALE - 1) / 2),
      y: layer.y - layer.h * ((STONE_GLOW_SCALE - 1) / 2),
      w: layer.w * STONE_GLOW_SCALE,
      h: layer.h * STONE_GLOW_SCALE,
    };
    const rect = atlasRects.get(layer.id);
    if (!rect) return null;
    const geometry = new BufferGeometry();
    const z = depthAt(stone.center[0], stone.center[1]);
    const corners = [
      [grown.x, grown.y, rect.x, rect.y],
      [grown.x + grown.w, grown.y, rect.x + rect.w, rect.y],
      [grown.x, grown.y + grown.h, rect.x, rect.y + rect.h],
      [grown.x + grown.w, grown.y + grown.h, rect.x + rect.w, rect.y + rect.h],
    ];
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(corners.flatMap(([x, y]) => toWorld(x, y, z))), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(corners.flatMap(([, , u, v]) => [u / atlasSize, v / atlasSize])), 2));
    geometry.setAttribute('aSway', new BufferAttribute(new Float32Array(16), 4));
    geometry.setAttribute('aSwayShape', new BufferAttribute(new Float32Array(8), 2));
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    const mesh = addMesh(geometry, glowMaterial, 4);
    mesh.visible = false;
    return mesh;
  });

  // ---- Small things: squares, mist, spray, drops and sparkles share one small atlas.
  const sprite = (name: 'droplet' | 'foam' | 'mist' | 'sparkle') => images.sprites.get(name);
  const tinted = (img: HTMLImageElement | undefined, size: number, color: string) => {
    const tintCanvas = document.createElement('canvas');
    tintCanvas.width = tintCanvas.height = size;
    const ctx = tintCanvas.getContext('2d')!;
    if (img) ctx.drawImage(img, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    return tintCanvas;
  };
  const fxItems: AtlasItem[] = [
    { id: 'droplet', w: 32, h: 32, draw: (ctx, x, y, w, h) => { const img = sprite('droplet'); if (img) ctx.drawImage(img, x, y, w, h); } },
    { id: 'sparkle', w: 64, h: 64, draw: (ctx, x, y, w, h) => { const img = sprite('sparkle'); if (img) ctx.drawImage(img, x, y, w, h); } },
    { id: 'puff', w: 128, h: 128, draw: (ctx, x, y, w, h) => ctx.drawImage(tinted(sprite('foam'), 128, '#E9C48F'), x, y, w, h) },
    { id: 'foam', w: 128, h: 128, draw: (ctx, x, y, w, h) => { const img = sprite('foam'); if (img) ctx.drawImage(img, x, y, w, h); } },
    { id: 'mist', w: 256, h: 256, draw: (ctx, x, y, w, h) => { const img = sprite('mist'); if (img) ctx.drawImage(img, x, y, w, h); } },
    {
      id: 'shadow',
      w: 128,
      h: 128,
      draw: (ctx, x, y, w) => {
        const blob = ctx.createRadialGradient(x + w / 2, y + w / 2, 0, x + w / 2, y + w / 2, w / 2);
        blob.addColorStop(0, 'rgba(58, 26, 12, 0.9)');
        blob.addColorStop(1, 'rgba(58, 26, 12, 0)');
        ctx.fillStyle = blob;
        ctx.fillRect(x, y, w, w);
      },
    },
    {
      id: 'glow',
      w: 256,
      h: 256,
      draw: (ctx, x, y, w) => {
        const glow = ctx.createRadialGradient(x + w / 2, y + w / 2, 0, x + w / 2, y + w / 2, w / 2);
        glow.addColorStop(0, scene.lanternGlow.color);
        glow.addColorStop(1, 'rgba(255, 170, 50, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x, y, w, w);
      },
    },
    ...[
      ['pixelA', 'rgb(255, 255, 255)', 'rgb(207, 241, 245)'],
      ['pixelB', 'rgb(207, 241, 245)', 'rgb(159, 220, 200)'],
    ].map(([id, fill, stroke]): AtlasItem => ({
      id,
      w: 32,
      h: 32,
      draw: (ctx, x, y, w) => {
        ctx.beginPath();
        roundedSquare(ctx, x + 2, y + 2, w - 4, w * 0.18);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      },
    })),
    ...scene.floatingSquares.map((square, i): AtlasItem => ({
      id: `square${i}`,
      w: 64,
      h: 64,
      draw: (ctx, x, y, w) => {
        const inset = 4;
        const size = w - inset * 2;
        ctx.beginPath();
        roundedSquare(ctx, x + inset, y + inset, size, size * 0.18);
        ctx.fillStyle = `rgb(${square.fill.join(',')})`;
        ctx.fill();
        ctx.lineWidth = 3 * (size / square.s);
        ctx.strokeStyle = `rgb(${square.rim.join(',')})`;
        ctx.stroke();
      },
    })),
  ];
  const fxRects = pack(fxItems, FX_ATLAS, 4)!;
  const fxAtlas = buildAtlas(fxItems, FX_ATLAS, fxRects);
  const uvOf = (id: string) => {
    const r = fxRects.get(id)!;
    return [r.x / FX_ATLAS, r.y / FX_ATLAS, (r.x + r.w) / FX_ATLAS, (r.y + r.h) / FX_ATLAS];
  };
  const fxUv = Object.fromEntries(fxItems.map((item) => [item.id, uvOf(item.id)]));

  const squares = createFx(fxAtlas, scene.floatingSquares.length, false);
  squares.mesh.renderOrder = 0;
  root.add(squares.mesh);
  const lanternFx = createFx(fxAtlas, 1, true);
  lanternFx.mesh.renderOrder = 30;
  root.add(lanternFx.mesh);
  const fx = createFx(fxAtlas, FX_CAPACITY, false);
  fx.mesh.renderOrder = 31;
  root.add(fx.mesh);

  // Each square gets its own place in the air, around the depth the spec gives them.
  const squarePlaces = scene.floatingSquares.map((square, i) => {
    const z = SQUARE_DEPTH * (0.4 + 0.8 * seeded(i + 90));
    const period = 5 + seeded(i + 7) * 4;
    const phase = seeded(i + 21) * Math.PI * 2;
    return { square, z, period, phase };
  });

  // ---- Pawns: each a quad with its foot at the origin.
  const tokenMeshes = new Map<Token, { mesh: Mesh; holder: Group }>();
  const tokenGeometries: BufferGeometry[] = [];
  const setTokens = (tokens: Token[]) => {
    tokens.forEach((token) => {
      const rect = atlasRects.get(token.layer.id);
      if (!rect) return;
      const { w, h } = token.layer;
      const [fx0, fy0] = token.footOffset;
      const corners = [
        [-fx0, fy0, rect.x, rect.y],
        [w - fx0, fy0, rect.x + rect.w, rect.y],
        [-fx0, fy0 - h, rect.x, rect.y + rect.h],
        [w - fx0, fy0 - h, rect.x + rect.w, rect.y + rect.h],
      ];
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(corners.flatMap(([x, y]) => [x, y, 0])), 3));
      geometry.setAttribute('uv', new BufferAttribute(new Float32Array(corners.flatMap(([, , u, v]) => [u / atlasSize, v / atlasSize])), 2));
      geometry.setAttribute('aSway', new BufferAttribute(new Float32Array(16), 4));
      geometry.setAttribute('aSwayShape', new BufferAttribute(new Float32Array(8), 2));
      geometry.setIndex([0, 2, 1, 1, 2, 3]);
      tokenGeometries.push(geometry);
      const mesh = new Mesh(geometry, layerMaterial);
      mesh.frustumCulled = false;
      const holder = new Group();
      holder.add(mesh);
      root.add(holder);
      tokenMeshes.set(token, { mesh, holder });
    });
  };

  // ---- The die, in the same scene.
  const { center, edge, foot } = scene.board.die;
  const unitsToArt = edge / DIE_UNITS_PER_EDGE;
  const die = createDie(scene.loop.rollMs, unitsToArt);
  const dieDepth = depthAt(center[0], center[1] + foot);
  const dieScale = ((D - dieDepth) / D) * unitsToArt;
  const [dieX, dieY, dieZ] = toWorld(center[0], center[1], dieDepth);
  die.group.position.set(dieX, dieY, dieZ);
  die.group.scale.setScalar(dieScale);
  root.add(die.group);

  let cssWidth = 0;
  let cssHeight = 0;
  const projected = new Vector3();

  const placeCamera = (yaw: number, pitch: number, dolly: number) => {
    const distance = D * dolly - ORBIT_Z;
    const flat = Math.cos(pitch);
    camera.position.set(CENTER_X + distance * Math.sin(yaw) * flat, -CENTER_Y + distance * Math.sin(pitch), ORBIT_Z + distance * Math.cos(yaw) * flat);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };
  placeCamera(0, 0, 1);

  const toCanvas = (x: number, y: number, z: number) => {
    const [wx, wy, wz] = toWorld(x, y, z);
    projected.set(wx, wy + root.position.y, wz).project(camera);
    return { x: ((projected.x + 1) / 2) * cssWidth, y: ((1 - projected.y) / 2) * cssHeight };
  };

  const addParticle = (p: Particle) => {
    const t = p.age / p.life;
    const place = toWorld(p.x, p.y, depthAt(p.x, Math.min(p.y, scene.artboard.h)));
    switch (p.sprite) {
      case 'pixel':
        fx.add(p.pale ? fxUv.pixelB : fxUv.pixelA, place, p.scale, p.scale, p.spin * p.age, 0.9 * (1 - t));
        break;
      case 'sparkle': {
        const size = 48 * p.scale;
        fx.add(fxUv.sparkle, place, size, size, 0, Math.sin(Math.PI * t));
        break;
      }
      case 'puff': {
        const size = (70 + 90 * t) * p.scale;
        fx.add(fxUv.puff, place, size, size, 0, 0.7 * (1 - t));
        break;
      }
      case 'mist': {
        const size = (150 + 110 * t) * p.scale * 1.1;
        const alpha = 0.4 * Math.sin(Math.PI * t) * 1.3 * STANDING_MIST;
        fx.add(fxUv.mist, place, size, size * 0.72, 0, alpha);
        break;
      }
      case 'drop': {
        const width = 14 * p.scale;
        // Stretches along its fall as it speeds up, up to 1.6 times.
        fx.add(fxUv.droplet, place, width, width * (1 + Math.min(0.6, Math.abs(p.vy) / 1400) + 0.5), 0, 1 - t);
        break;
      }
      default: {
        const size = 14 * p.scale;
        fx.add(fxUv.droplet, place, size, size, 0, 1 - t);
      }
    }
  };

  return {
    die,
    setTokens,

    resize(width, height) {
      cssWidth = width;
      cssHeight = height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      renderer.setSize(width, height, false);
    },

    render(frame) {
      const { time } = frame;
      root.position.y = frame.bob + frame.rise;
      placeCamera(frame.yaw, frame.pitch, frame.dolly);
      layerMaterial.uniforms.uTime.value = time;
      waterMaterial.uniforms.uTime.value = time;

      frame.tokens
        .slice()
        .sort((a, b) => a.pos[1] - b.pos[1])
        .forEach((token, order) => {
          const entry = tokenMeshes.get(token);
          if (!entry) return;
          const x = token.pos[0] + token.offset[0];
          const y = token.pos[1] + token.offset[1];
          const z = depthAt(x, y);
          const [wx, wy, wz] = toWorld(x, y, z);
          const scale = (D - z) / D;
          entry.holder.position.set(wx, wy + token.height * scale, wz);
          entry.holder.scale.set(scale, scale * token.scaleY, scale);
          entry.mesh.rotation.z = (-token.rotation * Math.PI) / 180;
          entry.mesh.renderOrder = 6 + order;
          if (token.height > 4) {
            // The shadow stays on the ground while the pawn is in the air.
            const lift = clamp01(token.height / 36);
            fx.add(fxUv.shadow, [wx, wy, wz], SHADOW_SIZE * (1 - 0.2 * lift), SHADOW_SIZE * 0.42 * (1 - 0.2 * lift), 0, 0.38 * (1 - 0.4 * lift));
          }
        });

      stoneGlows.forEach((mesh, i) => {
        if (mesh) mesh.visible = i === frame.glowStone;
      });
      glowMaterial.uniforms.uOpacity.value = frame.glowAlpha;
      glowMaterial.uniforms.uTime.value = 0;

      // Squares bob and turn in their own places.
      squarePlaces.forEach(({ square, z, period, phase }, i) => {
        const wave = (Math.PI * 2 * time) / period;
        const place = toWorld(square.cx, square.cy + Math.sin(wave + phase) * 8, z);
        const turn = square.phi + Math.sin(wave + phase * 1.3) * 5;
        const size = square.s * (i === frame.popIndex ? frame.popScale : 1) * (64 / (64 - 8));
        squares.add(fxUv[`square${i}`], place, size, size, (turn * Math.PI) / 180, 1);
      });
      squares.commit();

      const { center: lanternAt, radius } = scene.lanternGlow;
      const glowSize = 2 * radius * (0.98 + (frame.lantern - 0.75) * 0.24);
      lanternFx.add(fxUv.glow, toWorld(lanternAt[0], lanternAt[1], depthAt(lanternAt[0], lanternAt[1] + 90)), glowSize, glowSize, 0, frame.lantern);
      lanternFx.commit();

      // Standing water effects, then whatever is in the air.
      if (frame.still) {
        const { end, mistBlobs } = scene.water.waterfall;
        mistBlobs.forEach(([x, y, width]) => {
          fx.add(fxUv.mist, toWorld(x, y, depthAt(x, end[1])), width * 1.3, width * 0.9, 0, 0.42 * STANDING_MIST);
        });
      } else {
        scene.water.cascades.forEach(([x, y], i) => {
          const size = 56 * (1 + 0.1 * Math.sin((Math.PI * 2 * time) / 1.2 + i * 2));
          fx.add(fxUv.foam, toWorld(x, y, depthAt(x, y)), size, size, 0, 0.75);
        });
        const baseY = scene.water.waterfall.bottomY - 150;
        for (let i = 0; i < 3; i += 1) {
          const phase = time / 4 + i / 3;
          const x = 470 + Math.sin(Math.PI * 2 * phase) * 20 + (i - 1) * 60;
          fx.add(fxUv.mist, toWorld(x, baseY, depthAt(x, baseY)), 256, 256, 0, (0.15 + 0.2 * (0.5 + 0.5 * Math.sin(Math.PI * 2 * phase))) * STANDING_MIST);
        }
        frame.particles.forEach(addParticle);
      }
      fx.commit();

      renderer.render(world, camera);
    },

    project(x, y) {
      return { ...toCanvas(x, y, depthAt(x, y)), scale: cssWidth / VIEW.w };
    },

    projectOnLayer(layerId, x, y) {
      const foot = footOf(byId(layerId));
      return toCanvas(x, y, depthAt(foot[0], foot[1]));
    },

    dispose() {
      [batchBehind, batchSand, batchProps, waterGeometry, ...tokenGeometries].forEach((geometry) => geometry.dispose());
      stoneGlows.forEach((mesh) => mesh?.geometry.dispose());
      [layerMaterial, glowMaterial, waterMaterial].forEach((material) => material.dispose());
      [atlas, fxAtlas, ...waterTextures].forEach((texture) => texture.dispose());
      [squares, lanternFx, fx].forEach((batch) => batch.dispose());
      die.dispose();
      renderer.dispose();
    },
  };
}

/** Without WebGL: the island as a still picture. */
export function drawStillIsland(canvas: HTMLCanvasElement, images: IslandImages) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = (canvas.clientWidth * Math.min(window.devicePixelRatio || 1, MAX_DPR)) / VIEW.w;
  canvas.width = Math.round(VIEW.w * scale);
  canvas.height = Math.round(VIEW.h * scale);
  ctx.setTransform(scale, 0, 0, scale, -VIEW.x * scale, -VIEW.y * scale);
  LAYERS.forEach((layer) => {
    const img = images.layers.get(layer.id);
    if (img) ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h);
  });
}

