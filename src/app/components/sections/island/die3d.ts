/**
 * The ivory die with walnut pips, as an object in the island's scene: a rounded box, the pip and bump
 * textures, a warm sun from the left, cool fill and a saffron rim. It lives in its own tilted frame so
 * that its "up" is the way the island's art looks down at the sand.
 */
import {
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DIE_LAND_MS, throwPosition, throwSpin, throwSquash } from './dieThrow';

export interface IslandDie {
  group: Group;
  /** Throw it from the given direction, to land showing n on top. */
  rollTo(n: number, angle: number): void;
  /** Snap to n on top, turned yaw radians from the resting turn. */
  place(n: number, yaw?: number): void;
  /** Advances a throw. Returns true while the die is moving. */
  update(dtMs: number): boolean;
  setOpacity(opacity: number): void;
  dispose(): void;
}

export const DIE_UNITS_PER_EDGE = 1.6;
const EDGE = DIE_UNITS_PER_EDGE;
const HALF = EDGE / 2;
const CORNER = 0.24;
const DIE_ELEVATION = (33 * Math.PI) / 180; // how far the art looks down at the sand
const REST_YAW = (-38 * Math.PI) / 180; // 5 on the left, 3 on the right, as in the island art
const LAND_GLOW = 0.22;
const CONTACT_OPACITY = 0.6;
const SHADOW_OPACITY = 0.38;

const PIPS: Record<number, number[][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

/** Box order is +X, -X, +Y, -Y, +Z, -Z. Opposite faces add up to 7. */
const FACE_OF_SIDE = [3, 4, 2, 5, 1, 6];
const SIDE_NORMALS = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
];

const UP = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** How far the die's centre sits above the sand when its lowest corner just touches it. */
function restingHeight(quaternion: Quaternion) {
  const reach =
    Math.abs(new Vector3(1, 0, 0).applyQuaternion(quaternion).y) +
    Math.abs(new Vector3(0, 1, 0).applyQuaternion(quaternion).y) +
    Math.abs(new Vector3(0, 0, 1).applyQuaternion(quaternion).y);
  return (HALF - CORNER) * reach + CORNER;
}

function poseFor(n: number, yaw = REST_YAW) {
  const normal = SIDE_NORMALS[FACE_OF_SIDE.indexOf(n)];
  const up = new Quaternion().setFromUnitVectors(normal, UP);
  return new Quaternion().setFromAxisAngle(UP, yaw).multiply(up);
}

function faceTextures(n: number, size = 512) {
  const color = document.createElement('canvas');
  const height = document.createElement('canvas');
  color.width = color.height = height.width = height.height = size;
  const g = color.getContext('2d')!;
  const h = height.getContext('2d')!;

  const ivory = g.createRadialGradient(size * 0.38, size * 0.32, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
  ivory.addColorStop(0, '#FFF8EE');
  ivory.addColorStop(0.65, '#F3E3CC');
  ivory.addColorStop(1, '#E4CCAE');
  g.fillStyle = ivory;
  g.fillRect(0, 0, size, size);
  h.fillStyle = '#fff';
  h.fillRect(0, 0, size, size);

  const r = size * 0.085;
  for (const [x, y] of PIPS[n]) {
    const px = x * size;
    const py = y * size;
    // A pressed pip: a dark walnut bowl with a light catch on the lower-right rim.
    const bowl = g.createRadialGradient(px + r * 0.25, py + r * 0.3, r * 0.1, px, py, r);
    bowl.addColorStop(0, '#5E3826');
    bowl.addColorStop(0.75, '#3A2216');
    bowl.addColorStop(1, '#24140C');
    g.fillStyle = bowl;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = size * 0.006;
    g.beginPath();
    g.arc(px, py, r * 1.02, Math.PI * 0.1, Math.PI * 0.8);
    g.stroke();

    const dent = h.createRadialGradient(px, py, 0, px, py, r * 1.15);
    dent.addColorStop(0, '#000');
    dent.addColorStop(0.8, '#333');
    dent.addColorStop(1, '#fff');
    h.fillStyle = dent;
    h.beginPath();
    h.arc(px, py, r * 1.15, 0, Math.PI * 2);
    h.fill();
  }

  const map = new CanvasTexture(color);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return { map, bump: new CanvasTexture(height) };
}

/** A soft dark patch where the die meets the sand. It fades as the die leaves the ground. */
function contactTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const blob = g.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
  blob.addColorStop(0, 'rgba(58, 26, 12, 1)');
  blob.addColorStop(0.55, 'rgba(58, 26, 12, 0.55)');
  blob.addColorStop(1, 'rgba(58, 26, 12, 0)');
  g.fillStyle = blob;
  g.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface Roll {
  ms: number;
  from: Quaternion;
  to: Quaternion;
  angle: number;
  spinAxis: Vector3;
  rollAxis: Vector3;
}

export function createDie(rollMs: number, unitsToArt: number, textureSize = 512): IslandDie {
  const root = new Group();
  root.rotation.x = DIE_ELEVATION;

  // The handoff lit the die for a night background. On the island the light from below is warm sand.
  root.add(new HemisphereLight(0xffefd8, 0xd7a869, 1.05));
  const sun = new DirectionalLight(0xffd7a0, 2.5);
  sun.position.set(-3.4, 6.5, 3.2);
  sun.castShadow = true;
  // Small and few samples: this map renders every frame. Stopping it while the die rests turns the
  // floor plane into a dark rectangle, so it must keep running.
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.radius = 4.5;
  sun.shadow.blurSamples = 10;
  // Wider than the floor, or the edge of the shadow map shows on the sand as a faint line. Shadow
  // cameras work in world units, which the scale of this group does not reach.
  const reach = 6 * unitsToArt;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5 * unitsToArt, far: 24 * unitsToArt });
  root.add(sun, sun.target);
  const rim = new DirectionalLight(0xf4b740, 1.4);
  rim.position.set(4, 1.5, -3);
  root.add(rim, rim.target);
  const fill = new DirectionalLight(0xb8a6ff, 0.35);
  fill.position.set(3, -1, 4);
  root.add(fill, fill.target);

  const textures = FACE_OF_SIDE.map((n) => faceTextures(n, textureSize));
  // "Transparent" only so that it draws in paint order with the island's layers, after them.
  const materials = textures.map(
    ({ map, bump }) =>
      new MeshPhysicalMaterial({
        map,
        bumpMap: bump,
        bumpScale: 2.2,
        roughness: 0.42,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        sheen: 0.2,
        sheenColor: new Color(0xfff1dd),
        emissive: new Color(0xf4b740),
        emissiveMap: map, // lights the ivory, not the pips
        emissiveIntensity: 0,
        transparent: true,
      }),
  );
  const geometry = new RoundedBoxGeometry(EDGE, EDGE, EDGE, 6, CORNER);
  const die = new Mesh(geometry, materials);
  die.castShadow = true;
  const holder = new Group(); // moves and squashes in world axes while the die turns inside it
  holder.add(die);
  root.add(holder);

  const floorGeometry = new PlaneGeometry(6.5, 6.5);
  const floorMaterial = new ShadowMaterial({ color: 0x46200f, opacity: SHADOW_OPACITY, depthWrite: false, depthTest: false });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -HALF;
  floor.receiveShadow = true;
  root.add(floor);

  const contactGeometry = new PlaneGeometry(EDGE * 1.9, EDGE * 1.9);
  const contactMap = contactTexture();
  const contactMaterial = new MeshBasicMaterial({ map: contactMap, transparent: true, depthWrite: false, depthTest: false, toneMapped: false });
  const contact = new Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -HALF + 0.01;
  root.add(contact);

  floor.renderOrder = 20;
  contact.renderOrder = 21;
  die.renderOrder = 22;
  [floor, contact, die].forEach((mesh) => {
    mesh.frustumCulled = false;
  });

  let roll: Roll | null = null;
  let contactLevel = CONTACT_OPACITY;
  let shadowLevel = SHADOW_OPACITY;
  let opacity = 1;

  const applyOpacity = () => {
    contactMaterial.opacity = contactLevel * opacity;
    floorMaterial.opacity = shadowLevel * opacity;
    materials.forEach((material: Material) => {
      material.opacity = opacity;
    });
  };

  /** The die's centre is `height` above the point where its lowest corner just touches the sand. */
  const setBody = (quaternion: Quaternion, x: number, height: number, z: number, squash: number, glow: number) => {
    die.quaternion.copy(quaternion);
    holder.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);
    const lowest = restingHeight(quaternion) * squash;
    holder.position.set(x, lowest - HALF + height, z);
    contact.position.x = x;
    contact.position.z = z;
    contact.scale.setScalar(1 + height * 0.35);
    contactLevel = CONTACT_OPACITY * clamp01(1 - height / 1.2);
    shadowLevel = SHADOW_OPACITY * (1 - 0.5 * clamp01(height / 1.6)); // thins out as it rises
    materials.forEach((material) => {
      material.emissiveIntensity = glow;
    });
    applyOpacity();
  };

  const place = (n: number, yaw = 0) => {
    roll = null;
    setBody(poseFor(n, REST_YAW + yaw), 0, 0, 0, 1, 0);
  };

  place(1);

  return {
    group: root,

    rollTo(n, angle) {
      // Two spin axes, both across the direction of travel enough to read as tumbling end over end.
      const sign = Math.random() < 0.5 ? -1 : 1;
      roll = {
        ms: 0,
        from: die.quaternion.clone(),
        to: poseFor(n),
        angle,
        spinAxis: new Vector3(Math.sin(angle), 0.25 * sign, -Math.cos(angle)).normalize(),
        rollAxis: Math.random() < 0.5 ? X_AXIS : Z_AXIS,
      };
    },

    place,

    update(dtMs) {
      if (!roll) return false;
      roll.ms = Math.min(roll.ms + dtMs, rollMs);
      const { ms, from, to, angle, spinAxis, rollAxis } = roll;
      const done = throwSpin(ms, rollMs);
      const left = 1 - done;
      // Whole turns, so the die is exactly in its starting pose at the first moment. They run
      // down to nothing, and the pose underneath moves from the old face to the new one.
      const turned = new Quaternion()
        .setFromAxisAngle(spinAxis, -Math.PI * 4 * left)
        .multiply(new Quaternion().setFromAxisAngle(rollAxis, Math.PI * 2 * left))
        .multiply(from.clone().slerp(to, done));
      const { x, z, height } = throwPosition(ms, angle);
      const settled = clamp01((ms - DIE_LAND_MS) / (rollMs - DIE_LAND_MS));
      setBody(turned, x, height, z, throwSquash(ms), ms > DIE_LAND_MS ? LAND_GLOW * Math.sin(Math.PI * settled) : 0);
      if (ms >= rollMs) roll = null;
      return true;
    },

    setOpacity(value) {
      opacity = value;
      applyOpacity();
    },

    dispose() {
      textures.forEach(({ map, bump }) => {
        map.dispose();
        bump.dispose();
      });
      materials.forEach((material) => material.dispose());
      geometry.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      contactGeometry.dispose();
      contactMap.dispose();
      contactMaterial.dispose();
      sun.dispose();
      rim.dispose();
      fill.dispose();
    },
  };
}
