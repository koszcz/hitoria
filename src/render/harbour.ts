// The harbour: a harbour master's house with cargo on the quay, and the pier that runs out to its dock.
import * as THREE from 'three';
import type { P } from '../path';
import type { Model } from './buildings';
import { add } from './kit';
import { mergeModel } from './merge';
import { barrel, crate, house } from './props';

const WOOD = '#8a6a44', POST = '#4e3420', ROPE = '#c8b48a';

// The house and the cargo around it. The pier is added later, once the renderer knows where the dock is.
export function harbourHouse(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.26, d: 0.22, h: 0.42, rh: 0.28, wall, roof, style: 'slate', walls: 'planks', x: -0.1, z: -0.12, door: 0.3, win: -0.4 });
  crate(g, 0.3, 0, 0.3);
  crate(g, 0.3, 0.13, 0.3, 0.1);
  crate(g, 0.42, 0, 0.18, 0.11);
  barrel(g, -0.34, 0.34);
  barrel(g, -0.22, 0.4);
  // A coil of rope and a lantern post by the door.
  add(g, new THREE.TorusGeometry(0.05, 0.018, 6, 12).rotateX(Math.PI / 2), ROPE, 0.12, 0.02, 0.36);
  add(g, new THREE.BoxGeometry(0.025, 0.42, 0.025), POST, 0.4, 0.21, -0.3);
  add(g, new THREE.BoxGeometry(0.06, 0.07, 0.06), '#ffd88a', 0.4, 0.44, -0.3, { emissive: '#ffa040', emissiveIntensity: 0.5 });
}

// A plank pier from the house out to the dock, `len` tiles long, pointing along (dx, dz).
// `ground(t)` is the height of the ground, or the sea where it is higher, `t` tiles along the pier,
// relative to the house's base.
export function pier(dx: number, dz: number, len: number, ground: (t: number) => number) {
  const g = new THREE.Group();
  g.rotation.y = Math.atan2(dx, dz);
  const step = 0.25, deck = (t: number) => Math.max(0.05, ground(t) + 0.12);
  for (let t = 0.3; t < len + 0.25; t += step) {
    const y = Math.min(deck(t), deck(0.3));
    add(g, new THREE.BoxGeometry(0.34, 0.04, step - 0.02), WOOD, 0, y, t);
    // Posts down into the water every other plank, on both sides.
    if (Math.round(t / step) % 2 === 0)
      for (const s of [-1, 1]) {
        const h = y - ground(t) + 0.35;
        add(g, new THREE.BoxGeometry(0.04, h, 0.04), POST, s * 0.17, y - h / 2 + 0.06, t);
      }
  }
  // Mooring posts at the end, with rope around them.
  const end = len + 0.2, top = Math.min(deck(end), deck(0.3));
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8), POST, s * 0.14, top + 0.1, end);
    add(g, new THREE.TorusGeometry(0.04, 0.01, 4, 10).rotateX(Math.PI / 2), ROPE, s * 0.14, top + 0.12, end);
  }
  mergeModel(g, []);
  return g;
}

// The pier for a harbour at tile `at`, out to its dock. `height` is the ground height at a point in
// tile coordinates, and `sea` the height of the water.
export function pierTo(at: P, dock: P, height: (x: number, z: number) => number, sea: number) {
  const dx = dock.x - at.x, dz = dock.y - at.y, len = Math.hypot(dx, dz);
  const cx = at.x + 0.5, cz = at.y + 0.5, base = height(cx, cz);
  return pier(dx, dz, len, (t) => Math.max(sea, height(cx + (dx / len) * t, cz + (dz / len) * t)) - base);
}
