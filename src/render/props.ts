// Pieces that building models are made of: a timber-framed house, and props such as logs,
// crates, barrels and saplings.
import * as THREE from 'three';
import { add, shadeOf } from './kit';
import type { Model } from './buildings';

export type Roof = 'tile' | 'thatch' | 'slate';

export interface House {
  w: number;
  d: number;
  h: number;
  rh: number;
  wall: string;
  roof: string;
  style?: Roof;
  x?: number;
  z?: number;
  chimney?: boolean;
  door?: number; // across the front wall, from -1 (left) to 1 (right)
  win?: number | null; // the same for the front window; null for none
  bigDoor?: boolean;
  shutter?: string;
}

// A timber-framed house on a stone footing. The roof ridge runs along X and the door faces +Z.
// `w` and `d` are half the width (X) and half the depth (Z) of the walls.
export function house(g: THREE.Group, model: Model, o: House) {
  const { w, d, h, rh, wall, roof, style = 'tile', chimney = true, door = -0.35, win = 0.45 } = o;
  const e = style === 'thatch' ? 0.09 : 0.07, beam = '#4e3420', top = h + 0.05;
  const at = new THREE.Group();
  at.position.set(o.x ?? 0, 0, o.z ?? 0);
  g.add(at);
  add(at, new THREE.BoxGeometry(2 * w + 0.08, 0.3, 2 * d + 0.08), '#9d958a', 0, -0.1, 0);
  add(at, new THREE.BoxGeometry(2 * w, h, 2 * d), wall, 0, h / 2 + 0.05, 0);
  // A stone ground floor with lighter corner stones; the timber frame sits on top.
  const sh = h * 0.5;
  add(at, new THREE.BoxGeometry(2 * w + 0.03, sh, 2 * d + 0.03), '#a59d8e', 0, 0.05 + sh / 2, 0);
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]])
    for (let i = 0; i < 3; i++) add(at, new THREE.BoxGeometry(0.07, sh / 3 - 0.01, 0.07), i % 2 ? '#bdb5a6' : '#c8c0b0', x, 0.05 + (i + 0.5) * (sh / 3), z);

  // Timber frame: corner posts, a sill, a middle rail and a top beam.
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) add(at, new THREE.BoxGeometry(0.045, h, 0.045), beam, x, h / 2 + 0.05, z);
  for (const y of [0.07, 0.05 + h * 0.55, top - 0.02]) add(at, new THREE.BoxGeometry(2 * w + 0.03, 0.035, 2 * d + 0.03), beam, 0, y, 0);
  // A cross of braces in the upper half of the side wall.
  const span = h * 0.45 - 0.03, len = Math.hypot(span, 2 * d);
  for (const s of [1, -1]) {
    const b = add(at, new THREE.BoxGeometry(0.02, len, 0.025), beam, w + 0.012, 0.05 + h * 0.775, 0);
    b.rotation.x = s * Math.atan2(2 * d, span);
  }

  // Gable walls and the two roof slopes.
  const shape = new THREE.Shape([new THREE.Vector2(-d, 0), new THREE.Vector2(d, 0), new THREE.Vector2(0, rh)]);
  add(at, new THREE.ExtrudeGeometry(shape, { depth: 2 * w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-w, top, 0), wall, 0, 0, 0);
  const t = style === 'thatch' ? 0.1 : 0.05;
  const L = Math.hypot(d + e, rh) + 0.03, a = Math.atan2(rh, d + e);
  for (const side of [1, -1]) {
    const slab = add(at, new THREE.BoxGeometry(2 * w + 2 * e, t, L), roof, 0, top + rh / 2 + t / 2 - 0.005, (side * (d + e)) / 2);
    slab.rotation.x = side * a;
    if (style === 'thatch') {
      // A thick, shaggy lower edge.
      add(slab, new THREE.BoxGeometry(2 * w + 2 * e + 0.02, t * 1.3, 0.06), shadeOf(roof, 0.78), 0, -0.01, side * (L / 2 - 0.02));
    } else {
      // Rows of tiles or slates, each a little darker at its lower lip.
      const n = Math.max(3, Math.round(L / (style === 'slate' ? 0.07 : 0.09)));
      for (let i = 0; i < n; i++)
        add(slab, new THREE.BoxGeometry(2 * w + 2 * e + 0.005, 0.022, 0.03), shadeOf(roof, 0.8), 0, t / 2, -L / 2 + ((i + 0.6) * L) / n);
    }
  }
  if (style === 'thatch') add(at, new THREE.CylinderGeometry(0.06, 0.06, 2 * w + 2 * e, 8).rotateZ(Math.PI / 2), shadeOf(roof, 0.72), 0, top + rh + 0.03, 0);
  else add(at, new THREE.BoxGeometry(2 * w + 2 * e + 0.02, 0.06, 0.07), shadeOf(roof, 0.65), 0, top + rh + 0.04, 0);

  if (chimney) {
    const cx = w * 0.55, cz = -d * 0.4, ch = rh + 0.24, cy = top + rh * 0.45 + ch / 2 - 0.1;
    add(at, new THREE.BoxGeometry(0.1, ch, 0.1), '#8c8278', cx, cy, cz);
    add(at, new THREE.BoxGeometry(0.13, 0.035, 0.13), '#6e665e', cx, cy + ch / 2, cz);
    model.chimney = new THREE.Vector3((o.x ?? 0) + cx, cy + ch / 2 + 0.05, (o.z ?? 0) + cz);
  }

  // Door with a frame and a stone step; a shuttered window beside it and one on the side.
  if (o.bigDoor) {
    add(at, new THREE.BoxGeometry(0.34, 0.34, 0.02), beam, 0, 0.22, d + 0.008);
    for (const s of [-1, 1]) add(at, new THREE.BoxGeometry(0.14, 0.3, 0.025), '#6a4628', s * 0.075, 0.2, d + 0.014);
    add(at, new THREE.BoxGeometry(0.28, 0.025, 0.03), beam, 0, 0.2, d + 0.03);
  } else {
    const dx = door * w;
    add(at, new THREE.BoxGeometry(0.17, 0.27, 0.02), beam, dx, 0.185, d + 0.008);
    add(at, new THREE.BoxGeometry(0.12, 0.23, 0.025), '#6a4628', dx, 0.165, d + 0.014);
    add(at, new THREE.BoxGeometry(0.2, 0.04, 0.08), '#a39b8f', dx, 0.03, d + 0.06);
  }
  const glass = { emissive: '#ffa040', emissiveIntensity: 0.35 };
  const shutter = shadeOf(o.shutter ?? roof, 0.85);
  if (win !== null) {
    const wx = win * w, wy = 0.05 + h * 0.62;
    add(at, new THREE.BoxGeometry(0.1, 0.1, 0.02), '#ffd88a', wx, wy, d + 0.012, glass);
    for (const s of [-1, 1]) add(at, new THREE.BoxGeometry(0.045, 0.11, 0.015), shutter, wx + s * 0.075, wy, d + 0.016);
    add(at, new THREE.BoxGeometry(0.13, 0.02, 0.04), beam, wx, wy - 0.06, d + 0.02);
  }
  add(at, new THREE.BoxGeometry(0.02, 0.09, 0.09), '#ffd88a', w + 0.012, 0.05 + h * 0.3, d * 0.35, glass);
  return at;
}

export function logPile(g: THREE.Group, x: number, z: number, n: number) {
  for (let i = 0; i < n; i++) {
    const row = i >= 3 ? 1 : 0;
    const m = add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.26, 7), '#7a4a24', x + (i % 3) * 0.075 - 0.075 + row * 0.037, 0.04 + row * 0.06, z);
    m.rotation.x = Math.PI / 2;
    // Pale cut ends.
    for (const s of [-1, 1]) {
      const end = add(m, new THREE.CylinderGeometry(0.03, 0.03, 0.005, 7), '#e0bf8a', 0, s * 0.13, 0);
      end.castShadow = false;
    }
  }
}

// A small leafy sapling, used by the forester and as decoration.
export function sapling(g: THREE.Object3D, x: number, z: number, s = 1) {
  add(g, new THREE.CylinderGeometry(0.008 * s, 0.012 * s, 0.1 * s, 4), '#6a4524', x, 0.05 * s, z);
  add(g, new THREE.IcosahedronGeometry(0.05 * s, 0), '#6cb648', x, 0.12 * s, z, { flatShading: true });
}

export function crate(g: THREE.Object3D, x: number, y: number, z: number, s = 0.13) {
  add(g, new THREE.BoxGeometry(s, s, s), '#b4844e', x, y + s / 2, z);
  add(g, new THREE.BoxGeometry(s + 0.006, 0.02, s + 0.006), '#7a5530', x, y + s * 0.8, z);
  add(g, new THREE.BoxGeometry(s + 0.006, 0.02, s + 0.006), '#7a5530', x, y + s * 0.2, z);
}

export function barrel(g: THREE.Object3D, x: number, z: number) {
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), '#8a5a32', x, 0.08, z);
  for (const y of [0.03, 0.13]) add(g, new THREE.CylinderGeometry(0.064, 0.064, 0.015, 10), '#4a4440', x, y, z);
}

