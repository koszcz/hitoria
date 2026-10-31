// The outside of a house's walls: a timber frame, stacked logs, rough stone, brick or boards.
import * as THREE from 'three';
import { add, hash, shadeOf } from './kit';

export type Walls = 'frame' | 'logs' | 'stone' | 'brick' | 'planks';

const BEAM = '#4e3420';

// Dresses the wall box of a house. `w` and `d` are half the width and depth, `h` the height,
// and the walls start at y = 0.05.
export function dressWalls(at: THREE.Group, style: Walls, w: number, d: number, h: number, wall: string) {
  if (style === 'frame') frame(at, w, d, h);
  else if (style === 'logs') logs(at, w, d, h, wall);
  else if (style === 'stone') stone(at, w, d, h, wall);
  else if (style === 'brick') brick(at, w, d, h);
  else planks(at, w, d, h, wall);
}

// A stone ground floor with lighter corner stones, and a timber frame on top.
function frame(at: THREE.Group, w: number, d: number, h: number) {
  const sh = h * 0.5, top = h + 0.05;
  add(at, new THREE.BoxGeometry(2 * w + 0.03, sh, 2 * d + 0.03), '#a59d8e', 0, 0.05 + sh / 2, 0);
  for (const [x, z] of corners(w, d))
    for (let i = 0; i < 3; i++) add(at, new THREE.BoxGeometry(0.07, sh / 3 - 0.01, 0.07), i % 2 ? '#bdb5a6' : '#c8c0b0', x, 0.05 + (i + 0.5) * (sh / 3), z);
  for (const [x, z] of corners(w, d)) add(at, new THREE.BoxGeometry(0.045, h, 0.045), BEAM, x, h / 2 + 0.05, z);
  for (const y of [0.07, 0.05 + h * 0.55, top - 0.02]) add(at, new THREE.BoxGeometry(2 * w + 0.03, 0.035, 2 * d + 0.03), BEAM, 0, y, 0);
  // A cross of braces in the upper half of the side wall.
  const span = h * 0.45 - 0.03, len = Math.hypot(span, 2 * d);
  for (const s of [1, -1]) {
    const b = add(at, new THREE.BoxGeometry(0.02, len, 0.025), BEAM, w + 0.012, 0.05 + h * 0.775, 0);
    b.rotation.x = s * Math.atan2(2 * d, span);
  }
}

// Round logs stacked up each wall, crossing over at the corners, with pale cut ends.
function logs(at: THREE.Group, w: number, d: number, h: number, wall: string) {
  const r = 0.032, n = Math.floor(h / (2 * r)), dark = shadeOf(wall, 0.82);
  for (let i = 0; i < n; i++) {
    const y = 0.05 + r + i * 2 * r, c = i % 2 ? wall : dark;
    for (const z of [d, -d]) add(at, new THREE.CylinderGeometry(r, r, 2 * w + 0.12, 7).rotateZ(Math.PI / 2), c, 0, y, z);
    for (const x of [w, -w]) add(at, new THREE.CylinderGeometry(r, r, 2 * d + 0.12, 7).rotateX(Math.PI / 2), c, x, y + r, 0);
  }
  for (const [x, z] of corners(w + 0.06, d)) add(at, new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.005, 7).rotateZ(Math.PI / 2), '#e0bf8a', x, 0.05 + h / 2, z);
}

// Uneven blocks of rough stone sticking out a little from every face.
function stone(at: THREE.Group, w: number, d: number, h: number, wall: string) {
  const rows = Math.round(h / 0.075), rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const y = 0.05 + (i + 0.5) * rh;
    for (const [len, place] of [[2 * w, (u: number) => [u, d + 0.006]], [2 * d, (u: number) => [w + 0.006, u]]] as const) {
      const n = Math.max(2, Math.round(len / 0.11));
      for (let k = 0; k < n; k++) {
        if (hash(i, k + len * 10) < 0.35) continue;
        const u = -len / 2 + ((k + 0.5 + (i % 2) * 0.3) * len) / n;
        if (Math.abs(u) > len / 2 - 0.03) continue;
        const [x, z] = place(u), shade = 0.85 + hash(k, i) * 0.25;
        const along = (len / n) * 0.85, geo = x === w + 0.006 ? new THREE.BoxGeometry(0.02, rh * 0.8, along) : new THREE.BoxGeometry(along, rh * 0.8, 0.02);
        add(at, geo, shadeOf(wall, shade), x, y, z);
        add(at, geo.clone(), shadeOf(wall, shade), x === w + 0.006 ? -x : x, y, x === w + 0.006 ? z : -z);
      }
    }
  }
  for (const [x, z] of corners(w, d)) add(at, new THREE.BoxGeometry(0.06, h, 0.06), shadeOf(wall, 1.08), x, h / 2 + 0.05, z);
}

// Plain brick walls on a stone plinth, with pale stone corners. Mortar lines would read as logs
// from the game's camera, so the walls stay smooth.
function brick(at: THREE.Group, w: number, d: number, h: number) {
  add(at, new THREE.BoxGeometry(2 * w + 0.03, 0.09, 2 * d + 0.03), '#a59d8e', 0, 0.095, 0);
  for (const [x, z] of corners(w, d))
    for (let i = 0; 0.14 + i * 0.1 < h; i++) add(at, new THREE.BoxGeometry(0.065, 0.05, 0.065), i % 2 ? '#c8c0b0' : '#d8d0c0', x, 0.165 + i * 0.1, z);
}

// Upright boards with dark gaps, weathered grey, as by the sea.
function planks(at: THREE.Group, w: number, d: number, h: number, wall: string) {
  const dark = shadeOf(wall, 0.7);
  for (const [len, side] of [[2 * w, 'x'], [2 * d, 'z']] as const) {
    const n = Math.round(len / 0.06);
    for (let k = 1; k < n; k++) {
      const u = -len / 2 + (k * len) / n;
      for (const s of [1, -1]) {
        if (side === 'x') add(at, new THREE.BoxGeometry(0.008, h, 0.006), dark, u, h / 2 + 0.05, s * (d + 0.003));
        else add(at, new THREE.BoxGeometry(0.006, h, 0.008), dark, s * (w + 0.003), h / 2 + 0.05, u);
      }
    }
  }
  for (const [x, z] of corners(w, d)) add(at, new THREE.BoxGeometry(0.04, h, 0.04), BEAM, x, h / 2 + 0.05, z);
  add(at, new THREE.BoxGeometry(2 * w + 0.03, 0.03, 2 * d + 0.03), BEAM, 0, h + 0.035, 0);
}

const corners = (w: number, d: number) => [[-w, -d], [w, -d], [-w, d], [w, d]];
