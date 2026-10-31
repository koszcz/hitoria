// Trees, rocks and small plants, each built once and drawn many times.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Plant } from '../world';
import { WIND_DIR } from '../wind';
import { hash, paint, piece, seeded, skyShade } from './kit';

// A fir: a bare trunk under four drooping tiers that narrow to a point.
export const conifer = () => seeded(11, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.03, 0.05, 0.28, 6), '#5a3a1e', 0, 0.14, 0),
  piece(new THREE.ConeGeometry(0.29, 0.34, 9), '#2a6a3a', 0, 0.36, 0, 0.1),
  piece(new THREE.ConeGeometry(0.24, 0.32, 9), '#2f7740', 0.01, 0.55, 0, 0.1),
  piece(new THREE.ConeGeometry(0.18, 0.3, 8), '#368546', -0.01, 0.73, 0.01, 0.1),
  piece(new THREE.ConeGeometry(0.11, 0.26, 7), '#3f9150', 0, 0.9, 0, 0.1),
]), 0.6, 1.2));

// A round, leafy tree: a forked trunk under a cluster of soft blobs.
export const broadleaf = () => seeded(23, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.06, 0.4, 6), '#6a4524', 0, 0.2, 0),
  piece(new THREE.CylinderGeometry(0.015, 0.025, 0.2, 5).rotateZ(0.6), '#6a4524', 0.06, 0.42, 0),
  piece(new THREE.IcosahedronGeometry(0.25, 1), '#4a8f34', 0, 0.56, 0, 0.18),
  piece(new THREE.IcosahedronGeometry(0.2, 1), '#559c3a', 0.15, 0.62, 0.07, 0.18),
  piece(new THREE.IcosahedronGeometry(0.19, 1), '#4f9636', -0.14, 0.6, -0.07, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#5aa43e', 0.03, 0.62, 0.15, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#66b046', 0.02, 0.8, -0.02, 0.18),
]), 0.55, 1.25));

// A birch: a thin white trunk with dark marks under a light, open crown.
export const birch = () => seeded(31, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.025, 0.04, 0.55, 6), '#e8e4d8', 0, 0.275, 0),
  ...[0.12, 0.22, 0.34, 0.45].map((y, i) => piece(new THREE.BoxGeometry(0.05, 0.015, 0.05).rotateY(i), '#3a3430', 0, y, 0)),
  piece(new THREE.IcosahedronGeometry(0.17, 1).scale(1, 1.4, 1), '#8ab848', 0, 0.68, 0, 0.2),
  piece(new THREE.IcosahedronGeometry(0.13, 1).scale(1, 1.3, 1), '#9cc452', 0.12, 0.58, 0.04, 0.2),
  piece(new THREE.IcosahedronGeometry(0.12, 1).scale(1, 1.3, 1), '#82b042', -0.1, 0.55, -0.06, 0.2),
]), 0.6, 1.2));

// A tree in blossom: a short dark trunk under a soft pink and white crown.
export const blossom = () => seeded(37, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.055, 0.32, 6), '#5a3a28', 0, 0.16, 0),
  piece(new THREE.CylinderGeometry(0.015, 0.025, 0.18, 5).rotateZ(-0.7), '#5a3a28', -0.06, 0.34, 0),
  piece(new THREE.IcosahedronGeometry(0.22, 1), '#e07a98', 0, 0.5, 0, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#ec9ab0', 0.14, 0.55, 0.06, 0.18),
  piece(new THREE.IcosahedronGeometry(0.16, 1), '#d87090', -0.13, 0.52, -0.06, 0.18),
  piece(new THREE.IcosahedronGeometry(0.14, 1), '#f4c0cc', 0.02, 0.68, 0.02, 0.18),
]), 0.6, 1.2));

// The small plants and stones that dress up the ground. Each model fills about a tile.
// Parts whose colour comes from each copy, such as petals and pebbles, are drawn white.
export const spot = (i: number, r = 0.32) => [(hash(i, 7) - 0.5) * 2 * r, (hash(7, i) - 0.5) * 2 * r] as const;

export const grassTufts = () => seeded(41, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let t = 0; t < 6; t++) {
    const [tx, tz] = spot(t, 0.36);
    for (let b = 0; b < 9; b++) {
      const a = (b / 9) * Math.PI * 2 + t, h = 0.15 + hash(t, b) * 0.14;
      const blade = new THREE.ConeGeometry(0.018, h, 3).translate(0, h / 2, 0).rotateZ(0.3 + hash(b, t) * 0.25).rotateY(a);
      parts.push(piece(blade, b % 3 === 0 ? '#9ab850' : b % 2 ? '#88aa44' : '#7a9e3e', tx, 0, tz));
    }
  }
  return skyShade(mergeGeometries(parts), 0.6, 1.25);
});

// Stems and leaves, or the flower heads on top of them. The two are drawn in the same place.
export const flowerParts = (heads: boolean) => seeded(43, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const [x, z] = spot(i + 20, 0.38), h = 0.1 + hash(i, 2) * 0.1;
    if (heads) parts.push(piece(new THREE.IcosahedronGeometry(0.04, 0).scale(1, 0.55, 1), '#ffffff', x, h, z));
    else parts.push(piece(new THREE.CylinderGeometry(0.005, 0.008, h, 3), '#5a8a34', x, h / 2, z),
      piece(new THREE.ConeGeometry(0.02, 0.07, 3).rotateZ(0.9), '#6a9a3a', x + 0.012, h * 0.4, z));
  }
  return mergeGeometries(parts);
});

export const bush = () => seeded(47, () => skyShade(mergeGeometries([
  piece(new THREE.IcosahedronGeometry(0.13, 1), '#4f7f32', 0, 0.1, 0, 0.25),
  piece(new THREE.IcosahedronGeometry(0.1, 1), '#5a8c38', 0.11, 0.08, 0.04, 0.25),
  piece(new THREE.IcosahedronGeometry(0.09, 1), '#47762e', -0.09, 0.07, -0.05, 0.25),
  piece(new THREE.IcosahedronGeometry(0.08, 1), '#5a8c38', 0.02, 0.07, 0.11, 0.25),
  ...[0, 1, 2, 3, 4].map((i) => piece(new THREE.IcosahedronGeometry(0.016, 0), '#b03a3a', Math.cos(i * 1.3) * 0.12, 0.1 + hash(i, 5) * 0.08, Math.sin(i * 1.3) * 0.12)),
]), 0.6, 1.2));

export const fern = () => seeded(53, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.ConeGeometry(0.03, 0.24, 3).scale(1, 1, 0.3).translate(0, 0.12, 0).rotateZ(-1.0 - hash(i, 9) * 0.3).rotateY((i / 7) * Math.PI * 2);
    parts.push(piece(frond, i % 2 ? '#4a8436' : '#3f7a30', 0, 0, 0));
  }
  return skyShade(mergeGeometries(parts), 0.55, 1.2);
});

export const mushrooms = () => seeded(59, () => mergeGeometries(([[0.06, 0.04, '#b8342a'], [-0.08, -0.03, '#8a5a32'], [0, -0.1, '#9a6a3a']] as const).flatMap(([x, z, cap], i) => {
  const s = 1 - i * 0.2;
  return [
    piece(new THREE.CylinderGeometry(0.012 * s, 0.016 * s, 0.06 * s, 6), '#efe6d2', x, 0.03 * s, z),
    piece(new THREE.SphereGeometry(0.04 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, 0.055 * s, z),
  ];
})));

// A fallen log, with moss on top and pale cut ends.
export const mossyLog = () => seeded(61, () => mergeGeometries([
  piece(new THREE.CylinderGeometry(0.05, 0.055, 0.5, 8).rotateZ(Math.PI / 2), '#6a4a2a', 0, 0.05, 0),
  piece(new THREE.CylinderGeometry(0.045, 0.045, 0.505, 8).rotateZ(Math.PI / 2), '#d8b888', 0, 0.05, 0),
  piece(new THREE.SphereGeometry(0.05, 7, 4).scale(3.5, 0.5, 0.9), '#5a8a34', -0.03, 0.095, 0, 0.2),
]));

export const reeds = () => seeded(67, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 18; i++) {
    const [x, z] = spot(i + 40, 0.34), h = 0.24 + hash(i, 4) * 0.2;
    parts.push(piece(new THREE.CylinderGeometry(0.007, 0.012, h, 3), i % 2 ? '#7a9a40' : '#9aa850', x, h / 2, z));
    if (i % 3 === 0) parts.push(piece(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 5), '#5a3a20', x, h - 0.03, z));
  }
  return mergeGeometries(parts);
});

export const pebbles = () => seeded(71, () => mergeGeometries([0, 1, 2, 3, 4].map((i) => {
  const [x, z] = spot(i + 60, 0.28), s = 0.025 + hash(i, 6) * 0.03;
  return piece(new THREE.DodecahedronGeometry(s, 0).scale(1, 0.6, 1), '#ffffff', x, s * 0.3, z, 0.3);
})));

export type Kind = Exclude<Plant, ''>;
// `bend` is how far a plant bends in a full gust, in radians. 0 for ones that never move.
export const PLANTS: Record<Kind, { geo: () => THREE.BufferGeometry; bend: number; shadow?: boolean }> = {
  grass: { geo: grassTufts, bend: 0.32 },
  flowers: { geo: () => flowerParts(false), bend: 0.25 },
  bush: { geo: bush, bend: 0.05, shadow: true },
  fern: { geo: fern, bend: 0.12 },
  mushrooms: { geo: mushrooms, bend: 0 },
  log: { geo: mossyLog, bend: 0, shadow: true },
  reeds: { geo: reeds, bend: 0.3 },
  pebbles: { geo: pebbles, bend: 0 },
};
export const KINDS = Object.keys(PLANTS) as Kind[];
export const UP = new THREE.Vector3(0, 1, 0);
// Turning around this axis tips a model's top along the wind.
export const LEAN_AXIS = new THREE.Vector3(WIND_DIR.y, 0, -WIND_DIR.x);
export const PETALS = ['#f4f0e0', '#f0d040', '#b080d0', '#e05040', '#f0a0c0'];

export const boulder = () => seeded(5, () => skyShade(paint(new THREE.DodecahedronGeometry(0.16, 1), '#ffffff', 0.35), 0.75, 1.15));
