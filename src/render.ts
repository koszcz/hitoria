import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Game, Building, Settler, BDEFS, BType, Good, GOODS, Role, bag } from './game';
import { World, Tile, Plant, W, H } from './world';
import { wind, flutter, WIND_DIR } from './wind';
import { TW, toIso, fromIso } from './iso';
import type { P } from './path';
import { smoothPath } from './curve';
import { ART } from './art';

// Settlers are drawn a third larger than true scale so you can follow them, and a load
// sits on top of their big heads.
const PERSON_SCALE = 1.35;
const CARRY_Y = 0.42 * PERSON_SCALE + 0.07;

// Shifts any model colour toward the game's palette.
const graded = new Map<string, string>();
function grade(hex: string) {
  let out = graded.get(hex);
  if (out) return out;
  const { h, s, l, tint, k } = ART.grade;
  out = '#' + new THREE.Color(hex).offsetHSL(h, s, l).lerp(new THREE.Color(tint), k).getHexString();
  graded.set(hex, out);
  return out;
}

// World tile (x, y) maps to the 3D ground at (X = x, Z = y); Y is up. One tile is one unit.
// The camera keeps the old 2:1 isometric angle (45° around, 30° down), so `cam` still pans in
// the same screen-pixel space as the 2D renderer did.

// Tunic colours, hats and hair, so you can tell a settler's trade at a glance.
const ROLE_COLOR: Record<Role, string> = {
  carrier: '#d8c08a', builder: '#e0883a', woodcutter: '#b0402e', forester: '#5f9a3a',
  stonecutter: '#8a8f96', sawyer: '#a8763e', scout: '#3f6fc0',
  fisher: '#3f7a96', farmer: '#c8a040', miller: '#efe8d6', baker: '#d9894a', miner: '#5a5048',
};
const HAT: Record<Role, string> = {
  carrier: '', builder: '#f2c23a', woodcutter: '#3f6a34', forester: '#4a6a2c', stonecutter: '#6a6e72',
  sawyer: '#6b4a28', scout: '#2c4a8a', fisher: '#e8c84a', farmer: '#ead48a', miller: '#ffffff', baker: '#ffffff', miner: '#4a4440',
};
const HAIR: Record<Role, string> = {
  carrier: '#6a4a2a', builder: '#3a2618', woodcutter: '#8a4a22', forester: '#4a3020', stonecutter: '#2a2420',
  sawyer: '#b0803a', scout: '#d8b060', fisher: '#5a5048', farmer: '#9a6a32', miller: '#c8c0b0', baker: '#4a3020', miner: '#2a2420',
};
const GOOD_LIST = GOODS;
// How high a building's sign floats.
const iconY = (type: BType) => (type === 'lookout' ? 2.45 : type === 'mill' ? 1.95 : 1.3);

export interface View {
  hover: P | null;
  placing: BType | null;
  placeOk: boolean;
  tool: 'road' | 'remove' | null;
  roadFrom: number; // flag a road is being drawn from
  preview: P[] | null; // planned road under the cursor
  selected: number;
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const PX = TW / Math.SQRT2; // screen pixels per world unit at zoom 1
const ELEV = Math.PI / 6;
const VIEW_DIR = new THREE.Vector3(Math.cos(ELEV) / Math.SQRT2, Math.sin(ELEV), Math.cos(ELEV) / Math.SQRT2);
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SEA = -0.04;

// Ground height of one tile, before corners are averaged.
function elev(t: Tile, x: number, y: number) {
  if (t.h < 0.3) return (t.h - 0.3) * 5;
  let e = (t.h - 0.3) * 1.1;
  if (t.t === 'mountain') e += 0.4 + (t.h - 0.7) * 16 + hash(x, y) * 0.7;
  return e;
}

// Tileable value noise, used for the ground grain and the water ripples.
function noiseField(size: number, seed: number) {
  const out = new Float32Array(size * size);
  for (const [cells, amp] of [[8, 0.55], [32, 0.3], [128, 0.15]] as const) {
    const g = Array.from({ length: cells * cells }, (_, i) => hash(i * 1.7 + seed, seed * 3.1));
    const at = (i: number, j: number) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const s = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells, fy = (y / size) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
  }
  return out;
}

function grainTexture() {
  const n = 256, f = noiseField(n, 7);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const k = ART.grain;
    const v = Math.max(0, Math.min(255, 215 - 40 * k + f[i] * 70 * k + (Math.random() - 0.5) * 28 * k));
    img.data.set([v, v, v, 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rippleNormals() {
  const n = 256, f = noiseField(n, 21);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  const at = (x: number, y: number) => f[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 6, dy = (at(x, y + 1) - at(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      img.data.set([(-dx / l) * 127 + 128, (-dy / l) * 127 + 128, (1 / l) * 127 + 128, 255], (y * n + x) * 4);
    }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softDot() {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const cx = cv.getContext('2d')!;
  const g = cx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

// A small wooden shield with the building's symbol on it, hung over finished buildings.
function iconTexture(icon: string) {
  const n = 96, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const shield = () => {
    cx.beginPath();
    cx.moveTo(14, 12);
    cx.lineTo(82, 12);
    cx.lineTo(82, 50);
    cx.quadraticCurveTo(82, 78, 48, 90);
    cx.quadraticCurveTo(14, 78, 14, 50);
    cx.closePath();
  };
  shield();
  const wood = cx.createLinearGradient(0, 12, 0, 90);
  wood.addColorStop(0, '#f6e6c0');
  wood.addColorStop(1, '#e2c792');
  cx.fillStyle = wood;
  cx.fill();
  cx.lineWidth = 6;
  cx.strokeStyle = '#6a4628';
  cx.stroke();
  cx.font = '40px system-ui, "Apple Color Emoji", sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(icon, 48, 48);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A round sign showing a road with a red bar through it, over buildings with no road to the HQ.
function noRoadTexture() {
  const n = 96, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  cx.beginPath();
  cx.arc(48, 48, 42, 0, Math.PI * 2);
  cx.fillStyle = '#fff8ea';
  cx.fill();
  cx.lineWidth = 8;
  cx.strokeStyle = '#d23a2a';
  cx.stroke();
  // A road running off into the distance, with a dashed middle line.
  cx.beginPath();
  cx.moveTo(30, 80);
  cx.lineTo(43, 18);
  cx.lineTo(53, 18);
  cx.lineTo(66, 80);
  cx.closePath();
  cx.fillStyle = '#9a7a52';
  cx.fill();
  cx.strokeStyle = '#fff8ea';
  cx.lineWidth = 3;
  cx.setLineDash([7, 6]);
  cx.beginPath();
  cx.moveTo(48, 78);
  cx.lineTo(48, 20);
  cx.stroke();
  cx.setLineDash([]);
  cx.lineWidth = 9;
  cx.strokeStyle = '#d23a2a';
  cx.beginPath();
  cx.moveTo(19, 77);
  cx.lineTo(77, 19);
  cx.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Paints a whole geometry one colour (as a vertex colour) so pieces can be merged into one mesh.
function paint(g: THREE.BufferGeometry, color: string, jitter = 0) {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(grade(color));
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    if (jitter) pos.setXYZ(i, pos.getX(i) * (1 + (Math.random() - 0.5) * jitter), pos.getY(i) * (1 + (Math.random() - 0.5) * jitter), pos.getZ(i) * (1 + (Math.random() - 0.5) * jitter));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

function piece(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, jitter = 0) {
  g.translate(x, y, z);
  return paint(g, color, jitter);
}

// Keeps a model's vertices identical from load to load: the jitter above uses Math.random.
function seeded<T>(seed: number, f: () => T): T {
  const r = Math.random;
  let s = seed;
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  try {
    return f();
  } finally {
    Math.random = r;
  }
}

// Darkens the bottom of a model and lightens its top, like light falling from the sky.
function skyShade(g: THREE.BufferGeometry, low = 0.7, high = 1.15) {
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  const pos = g.attributes.position, col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const k = low + ((pos.getY(i) - min.y) / (max.y - min.y || 1)) * (high - low);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return g;
}

// A fir: a bare trunk under four drooping tiers that narrow to a point.
const conifer = () => seeded(11, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.03, 0.05, 0.28, 6), '#5a3a1e', 0, 0.14, 0),
  piece(new THREE.ConeGeometry(0.29, 0.34, 9), '#2a6a3a', 0, 0.36, 0, 0.1),
  piece(new THREE.ConeGeometry(0.24, 0.32, 9), '#2f7740', 0.01, 0.55, 0, 0.1),
  piece(new THREE.ConeGeometry(0.18, 0.3, 8), '#368546', -0.01, 0.73, 0.01, 0.1),
  piece(new THREE.ConeGeometry(0.11, 0.26, 7), '#3f9150', 0, 0.9, 0, 0.1),
]), 0.6, 1.2));

// A round, leafy tree: a forked trunk under a cluster of soft blobs.
const broadleaf = () => seeded(23, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.06, 0.4, 6), '#6a4524', 0, 0.2, 0),
  piece(new THREE.CylinderGeometry(0.015, 0.025, 0.2, 5).rotateZ(0.6), '#6a4524', 0.06, 0.42, 0),
  piece(new THREE.IcosahedronGeometry(0.25, 1), '#4a8f34', 0, 0.56, 0, 0.18),
  piece(new THREE.IcosahedronGeometry(0.2, 1), '#559c3a', 0.15, 0.62, 0.07, 0.18),
  piece(new THREE.IcosahedronGeometry(0.19, 1), '#4f9636', -0.14, 0.6, -0.07, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#5aa43e', 0.03, 0.62, 0.15, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#66b046', 0.02, 0.8, -0.02, 0.18),
]), 0.55, 1.25));

// A birch: a thin white trunk with dark marks under a light, open crown.
const birch = () => seeded(31, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.025, 0.04, 0.55, 6), '#e8e4d8', 0, 0.275, 0),
  ...[0.12, 0.22, 0.34, 0.45].map((y, i) => piece(new THREE.BoxGeometry(0.05, 0.015, 0.05).rotateY(i), '#3a3430', 0, y, 0)),
  piece(new THREE.IcosahedronGeometry(0.17, 1).scale(1, 1.4, 1), '#8ab848', 0, 0.68, 0, 0.2),
  piece(new THREE.IcosahedronGeometry(0.13, 1).scale(1, 1.3, 1), '#9cc452', 0.12, 0.58, 0.04, 0.2),
  piece(new THREE.IcosahedronGeometry(0.12, 1).scale(1, 1.3, 1), '#82b042', -0.1, 0.55, -0.06, 0.2),
]), 0.6, 1.2));

// A tree in blossom: a short dark trunk under a soft pink and white crown.
const blossom = () => seeded(37, () => skyShade(mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.055, 0.32, 6), '#5a3a28', 0, 0.16, 0),
  piece(new THREE.CylinderGeometry(0.015, 0.025, 0.18, 5).rotateZ(-0.7), '#5a3a28', -0.06, 0.34, 0),
  piece(new THREE.IcosahedronGeometry(0.22, 1), '#e07a98', 0, 0.5, 0, 0.18),
  piece(new THREE.IcosahedronGeometry(0.17, 1), '#ec9ab0', 0.14, 0.55, 0.06, 0.18),
  piece(new THREE.IcosahedronGeometry(0.16, 1), '#d87090', -0.13, 0.52, -0.06, 0.18),
  piece(new THREE.IcosahedronGeometry(0.14, 1), '#f4c0cc', 0.02, 0.68, 0.02, 0.18),
]), 0.6, 1.2));

// The small plants and stones that dress up the ground. Each model fills about a tile.
// Parts whose colour comes from each copy, such as petals and pebbles, are drawn white.
const spot = (i: number, r = 0.32) => [(hash(i, 7) - 0.5) * 2 * r, (hash(7, i) - 0.5) * 2 * r] as const;

const grassTufts = () => seeded(41, () => {
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
const flowerParts = (heads: boolean) => seeded(43, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const [x, z] = spot(i + 20, 0.38), h = 0.1 + hash(i, 2) * 0.1;
    if (heads) parts.push(piece(new THREE.IcosahedronGeometry(0.04, 0).scale(1, 0.55, 1), '#ffffff', x, h, z));
    else parts.push(piece(new THREE.CylinderGeometry(0.005, 0.008, h, 3), '#5a8a34', x, h / 2, z),
      piece(new THREE.ConeGeometry(0.02, 0.07, 3).rotateZ(0.9), '#6a9a3a', x + 0.012, h * 0.4, z));
  }
  return mergeGeometries(parts);
});

const bush = () => seeded(47, () => skyShade(mergeGeometries([
  piece(new THREE.IcosahedronGeometry(0.13, 1), '#4f7f32', 0, 0.1, 0, 0.25),
  piece(new THREE.IcosahedronGeometry(0.1, 1), '#5a8c38', 0.11, 0.08, 0.04, 0.25),
  piece(new THREE.IcosahedronGeometry(0.09, 1), '#47762e', -0.09, 0.07, -0.05, 0.25),
  piece(new THREE.IcosahedronGeometry(0.08, 1), '#5a8c38', 0.02, 0.07, 0.11, 0.25),
  ...[0, 1, 2, 3, 4].map((i) => piece(new THREE.IcosahedronGeometry(0.016, 0), '#b03a3a', Math.cos(i * 1.3) * 0.12, 0.1 + hash(i, 5) * 0.08, Math.sin(i * 1.3) * 0.12)),
]), 0.6, 1.2));

const fern = () => seeded(53, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.ConeGeometry(0.03, 0.24, 3).scale(1, 1, 0.3).translate(0, 0.12, 0).rotateZ(-1.0 - hash(i, 9) * 0.3).rotateY((i / 7) * Math.PI * 2);
    parts.push(piece(frond, i % 2 ? '#4a8436' : '#3f7a30', 0, 0, 0));
  }
  return skyShade(mergeGeometries(parts), 0.55, 1.2);
});

const mushrooms = () => seeded(59, () => mergeGeometries(([[0.06, 0.04, '#b8342a'], [-0.08, -0.03, '#8a5a32'], [0, -0.1, '#9a6a3a']] as const).flatMap(([x, z, cap], i) => {
  const s = 1 - i * 0.2;
  return [
    piece(new THREE.CylinderGeometry(0.012 * s, 0.016 * s, 0.06 * s, 6), '#efe6d2', x, 0.03 * s, z),
    piece(new THREE.SphereGeometry(0.04 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, 0.055 * s, z),
  ];
})));

// A fallen log, with moss on top and pale cut ends.
const mossyLog = () => seeded(61, () => mergeGeometries([
  piece(new THREE.CylinderGeometry(0.05, 0.055, 0.5, 8).rotateZ(Math.PI / 2), '#6a4a2a', 0, 0.05, 0),
  piece(new THREE.CylinderGeometry(0.045, 0.045, 0.505, 8).rotateZ(Math.PI / 2), '#d8b888', 0, 0.05, 0),
  piece(new THREE.SphereGeometry(0.05, 7, 4).scale(3.5, 0.5, 0.9), '#5a8a34', -0.03, 0.095, 0, 0.2),
]));

const reeds = () => seeded(67, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 18; i++) {
    const [x, z] = spot(i + 40, 0.34), h = 0.24 + hash(i, 4) * 0.2;
    parts.push(piece(new THREE.CylinderGeometry(0.007, 0.012, h, 3), i % 2 ? '#7a9a40' : '#9aa850', x, h / 2, z));
    if (i % 3 === 0) parts.push(piece(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 5), '#5a3a20', x, h - 0.03, z));
  }
  return mergeGeometries(parts);
});

const pebbles = () => seeded(71, () => mergeGeometries([0, 1, 2, 3, 4].map((i) => {
  const [x, z] = spot(i + 60, 0.28), s = 0.025 + hash(i, 6) * 0.03;
  return piece(new THREE.DodecahedronGeometry(s, 0).scale(1, 0.6, 1), '#ffffff', x, s * 0.3, z, 0.3);
})));

type Kind = Exclude<Plant, ''>;
// `bend` is how far a plant bends in a full gust, in radians. 0 for ones that never move.
const PLANTS: Record<Kind, { geo: () => THREE.BufferGeometry; bend: number; shadow?: boolean }> = {
  grass: { geo: grassTufts, bend: 0.32 },
  flowers: { geo: () => flowerParts(false), bend: 0.25 },
  bush: { geo: bush, bend: 0.05, shadow: true },
  fern: { geo: fern, bend: 0.12 },
  mushrooms: { geo: mushrooms, bend: 0 },
  log: { geo: mossyLog, bend: 0, shadow: true },
  reeds: { geo: reeds, bend: 0.3 },
  pebbles: { geo: pebbles, bend: 0 },
};
const KINDS = Object.keys(PLANTS) as Kind[];
const UP = new THREE.Vector3(0, 1, 0);
// Turning around this axis tips a model's top along the wind.
const LEAN_AXIS = new THREE.Vector3(WIND_DIR.y, 0, -WIND_DIR.x);
const PETALS = ['#f4f0e0', '#f0d040', '#b080d0', '#e05040', '#f0a0c0'];

const boulder = () => seeded(5, () => skyShade(paint(new THREE.DodecahedronGeometry(0.16, 1), '#ffffff', 0.35), 0.75, 1.15));

interface Model {
  g: THREE.Group;
  key: string;
  rise?: THREE.Object3D;
  bar?: THREE.Sprite;
  icon?: THREE.Sprite;
  smoke?: THREE.Sprite[];
  cloth?: THREE.Object3D;
  sails?: THREE.Object3D;
  noRoad?: THREE.Sprite;
  chimney?: THREE.Vector3; // where smoke rises from while the building works
  spin?: THREE.Object3D; // a saw blade that turns while the building works
}


type Roof = 'tile' | 'thatch' | 'slate';

interface House {
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

interface Person {
  g: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  tool: THREE.Object3D;
  body: THREE.Group;
  px: number;
  py: number;
  heading: number;
}

export class Renderer {
  cam = { x: 0, y: 0, zoom: 1.3 };
  w = 0;
  h = 0;

  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  private sun = new THREE.DirectionalLight(ART.sun, ART.sunPower);
  private ray = new THREE.Raycaster();
  private mats = new Map<string, THREE.Material>();
  private grain = grainTexture();
  private dot = softDot();
  private icons = new Map<BType, THREE.Texture>();
  private noRoadTex = noRoadTexture();

  private world: World | null = null;
  private corners = new Float32Array((W + 1) * (H + 1));
  private terrain!: THREE.Mesh;
  private water!: THREE.Mesh;
  private terrKey = -1;
  private border = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#ffeaa0', dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 }));

  private trees: THREE.InstancedMesh[];
  private plants = {} as Record<Kind, THREE.InstancedMesh>;
  private petals: THREE.InstancedMesh;
  private q2 = new THREE.Quaternion();
  private rocks: THREE.InstancedMesh;
  private goods: Record<Good, THREE.InstancedMesh>;
  private goodN = bag();
  private crops: THREE.InstancedMesh;
  private fields: THREE.InstancedMesh;

  private roads = new THREE.Group();
  private roadNet = -1;
  private models = new Map<number, Model>();
  private flags = new Map<number, Model>();
  private people = new Map<number, Person>();
  private ghosts = new Map<BType, THREE.Group>();
  private ghostFlag: THREE.Group;

  private hoverFill: THREE.Mesh;
  private hoverRing: THREE.LineLoop;
  private selRing: THREE.LineLoop;
  private fromRing: THREE.LineLoop;
  private selRadius: THREE.LineLoop;
  private placeRadius: THREE.LineLoop;
  private preview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#fff5c8', dashSize: 0.2, gapSize: 0.14 }));
  private previewOf: P[] | null = null;

  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private deep = new THREE.Color(ART.deep); // sea floor colour far from shore

  constructor(public canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.toneMapping = THREE.NeutralToneMapping;
    this.gl.toneMappingExposure = ART.exposure;
    this.resize();
    addEventListener('resize', () => this.resize());

    const { scene, sun } = this;
    scene.background = new THREE.Color(ART.sky);
    scene.add(new THREE.HemisphereLight(ART.hemiSky, ART.hemiGround, ART.hemi));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);

    const tree = (geo: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), W * H);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.trees = [tree(broadleaf()), tree(conifer()), tree(birch()), tree(blossom())];
    const plant = (geo: THREE.BufferGeometry, shadow = false) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), W * H);
      m.castShadow = shadow;
      m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    for (const k of KINDS) this.plants[k] = plant(PLANTS[k].geo(), PLANTS[k].shadow);
    this.petals = plant(flowerParts(true));
    this.rocks = new THREE.InstancedMesh(boulder(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), W * H * 3);
    this.rocks.castShadow = this.rocks.receiveShadow = true;
    this.rocks.frustumCulled = false;
    scene.add(this.rocks);

    const goodGeo: Record<Good, THREE.BufferGeometry> = {
      log: mergeGeometries([
        piece(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 7).rotateZ(Math.PI / 2), '#7a4a24', 0, 0, 0),
        piece(new THREE.CylinderGeometry(0.03, 0.03, 0.205, 7).rotateZ(Math.PI / 2), '#e0bf8a', 0, 0, 0),
      ]),
      plank: mergeGeometries([
        piece(new THREE.BoxGeometry(0.2, 0.025, 0.08), '#e0bb84', 0, 0, 0),
        piece(new THREE.BoxGeometry(0.2, 0.025, 0.08), '#cfa56c', 0.01, 0.026, 0.005),
      ]),
      stone: piece(new THREE.DodecahedronGeometry(0.055, 0), '#a8a69e', 0, 0, 0),
      fish: mergeGeometries([
        piece(new THREE.SphereGeometry(0.045, 8, 6).scale(1.9, 0.6, 0.75), '#8fb6c8', 0, 0, 0),
        piece(new THREE.ConeGeometry(0.035, 0.05, 4).rotateZ(Math.PI / 2), '#6f98ad', -0.1, 0, 0),
      ]),
      grain: mergeGeometries([
        piece(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 7), '#d8b84a', 0, 0.04, 0),
        piece(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 7), '#8a5a2a', 0, 0.03, 0),
        piece(new THREE.SphereGeometry(0.05, 7, 5), '#e8c860', 0, 0.12, 0),
      ]),
      flour: mergeGeometries([
        piece(new THREE.SphereGeometry(0.065, 8, 6).scale(1, 0.9, 1), '#f3eee2', 0, 0.02, 0),
        piece(new THREE.CylinderGeometry(0.02, 0.03, 0.04, 6), '#e2d8c0', 0, 0.09, 0),
        piece(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 6), '#a07a4a', 0, 0.075, 0),
      ]),
      bread: mergeGeometries([
        piece(new THREE.SphereGeometry(0.06, 8, 6).scale(1.5, 0.6, 0.9), '#b8732e', 0, 0, 0),
        piece(new THREE.BoxGeometry(0.012, 0.01, 0.06), '#e8c080', -0.03, 0.035, 0),
        piece(new THREE.BoxGeometry(0.012, 0.01, 0.06), '#e8c080', 0.03, 0.035, 0),
      ]),
    };

    // Grain fields: a patch of tilled soil under a tuft of stalks that grows and turns gold.
    const stalks: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const sx = ((i % 4) - 1.5) * 0.2 + (hash(i, 3) - 0.5) * 0.08, sz = (Math.floor(i / 4) - 1.5) * 0.2 + (hash(3, i) - 0.5) * 0.08;
      stalks.push(new THREE.BoxGeometry(0.025, 0.3, 0.025).translate(sx, 0.15, sz), new THREE.BoxGeometry(0.04, 0.07, 0.04).translate(sx, 0.31, sz));
    }
    this.crops = new THREE.InstancedMesh(mergeGeometries(stalks), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), W * H);
    this.crops.castShadow = this.crops.receiveShadow = true;
    this.fields = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), W * H);
    this.fields.receiveShadow = true;
    for (const m of [this.crops, this.fields]) {
      m.frustumCulled = false;
      scene.add(m);
    }
    this.goods = {} as Record<Good, THREE.InstancedMesh>;
    for (const g of GOOD_LIST) {
      const m = new THREE.InstancedMesh(goodGeo[g], new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), 4000);
      m.castShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      this.goods[g] = m;
    }

    scene.add(this.roads, this.border, this.preview);
    this.border.renderOrder = 2;

    const tileGeo = new THREE.BufferGeometry();
    tileGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    tileGeo.setIndex([0, 2, 1, 0, 3, 2]);
    this.hoverFill = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const loop = (color: string, n: number) => {
      const l = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      l.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    };
    this.hoverRing = loop('#ffffff', 4);
    this.selRing = loop('#ffe27a', 4);
    this.fromRing = loop('#ffe27a', 4);
    this.selRadius = loop('#ffffff', 96);
    this.placeRadius = loop('#ffffff', 96);
    this.hoverFill.frustumCulled = false;
    scene.add(this.hoverFill);

    this.ghostFlag = this.makeFlag().g;
    this.ghostify(this.ghostFlag);
    scene.add(this.ghostFlag);
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.gl.setPixelRatio(devicePixelRatio || 1);
    this.gl.setSize(this.w, this.h, false);
  }

  // Ground point under a screen pixel, in tile coordinates.
  toWorld(px: number, py: number) {
    this.ray.setFromCamera(new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1), this.camera);
    const hit = this.terrain && this.ray.intersectObject(this.terrain, false)[0];
    if (hit) return { x: hit.point.x, y: hit.point.z };
    const p = new THREE.Vector3();
    this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    return { x: p.x, y: p.z };
  }

  screenToTile(px: number, py: number): P {
    const p = this.toWorld(px, py);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
  }

  centerOn(x: number, y: number) {
    const p = toIso(x + 0.5, y + 0.5);
    this.cam.x = p.x;
    this.cam.y = p.y;
  }

  // Height of the ground at a point in tile coordinates.
  heightAt(x: number, y: number) {
    const cx = Math.max(0, Math.min(W - 0.001, x)), cy = Math.max(0, Math.min(H - 0.001, y));
    const i = Math.floor(cx), j = Math.floor(cy), tx = cx - i, ty = cy - j;
    const C = this.corners, k = j * (W + 1) + i;
    const a = C[k], b = C[k + 1], c = C[k + W + 1], d = C[k + W + 2];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  draw(game: Game, view: View, now: number) {
    if (game.world !== this.world) this.setWorld(game.world);
    this.placeCamera();

    let tk = 0;
    const terr = game.world.territory;
    for (let i = 0; i < terr.length; i++) if (terr[i]) tk += i;
    if (tk !== this.terrKey) {
      this.terrKey = tk;
      this.paintGround();
      this.drawBorder();
    }
    if (game.net !== this.roadNet) {
      this.roadNet = game.net;
      this.drawRoads(game);
    }

    this.goodN = bag();
    this.scenery(now);
    this.buildings(game, now);
    this.flagsAndGoods(game, now);
    this.settlers(game, now);
    this.overlays(game, view);
    for (const g of GOOD_LIST) {
      this.goods[g].count = this.goodN[g];
      this.goods[g].instanceMatrix.needsUpdate = true;
    }

    const water = this.water.material as THREE.MeshStandardMaterial;
    water.normalMap!.offset.set(now * 0.012, now * 0.007);
    this.gl.render(this.scene, this.camera);
  }

  // --- camera --------------------------------------------------------------

  private placeCamera() {
    const { camera, cam, sun } = this;
    const s = PX * cam.zoom;
    const hw = this.w / 2 / s, hh = this.h / 2 / s;
    Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    camera.updateProjectionMatrix();
    const t = fromIso(cam.x, cam.y);
    const target = new THREE.Vector3(t.x, 0, t.y);
    camera.position.copy(target).addScaledVector(VIEW_DIR, 150);
    camera.lookAt(target);

    // Sun from the upper left of the screen, so shadows fall to the right as before.
    const reach = Math.min(42, Math.max(hw, hh * 2) + 3);
    sun.position.copy(target).add(new THREE.Vector3(-reach * 0.9, reach * 1.3, reach * 0.35));
    sun.target.position.copy(target);
    const sc = sun.shadow.camera;
    Object.assign(sc, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 4 });
    sc.updateProjectionMatrix();
  }

  // --- terrain -------------------------------------------------------------

  private setWorld(world: World) {
    this.world = world;
    this.terrKey = -1;
    this.roadNet = -1;
    for (const m of [...this.models.values(), ...this.flags.values()]) this.scene.remove(m.g);
    for (const p of this.people.values()) this.scene.remove(p.g);
    this.models.clear();
    this.flags.clear();
    this.people.clear();

    const C = this.corners;
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        let sum = 0, n = 0;
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]])
          if (world.inside(x, y)) {
            sum += elev(world.at(x, y), x, y);
            n++;
          }
        C[j * (W + 1) + i] = n ? sum / n : -1;
      }

    if (this.terrain) {
      this.scene.remove(this.terrain, this.water);
      this.terrain.geometry.dispose();
    }
    const pos = new Float32Array((W + 1) * (H + 1) * 3), uv = new Float32Array((W + 1) * (H + 1) * 2);
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        const k = j * (W + 1) + i;
        pos.set([i, C[k], j], k * 3);
        uv.set([i / 5, j / 5], k * 2);
      }
    const idx: number[] = [];
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: this.grain, roughness: 0.95 }));
    this.terrain.receiveShadow = true;

    const ripples = rippleNormals();
    ripples.repeat.set(40, 40);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 8, H * 8).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: ART.water, roughness: 0.15, metalness: 0.05, transparent: true, opacity: ART.waterOpacity, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35) }),
    );
    this.water.position.set(W / 2, SEA, H / 2);
    this.water.receiveShadow = true;
    this.scene.add(this.terrain, this.water);
  }

  // Corner colours blend the four tiles around them; slope and height add rock and snow.
  private paintGround() {
    const world = this.world!, C = this.corners;
    const col = this.terrain.geometry.attributes.color as THREE.BufferAttribute;
    const base = new Map<number, THREE.Color>();
    const tileCol = (x: number, y: number) => {
      const key = y * W + x;
      let c = base.get(key);
      if (c) return c;
      const t = world.at(x, y);
      c = t.t === 'water' ? new THREE.Color(ART.sand)
        : t.t === 'mountain' ? new THREE.Color().setHSL(0.07, 0.1, 0.44 + hash(x, y) * 0.08)
        : t.t === 'grass' ? new THREE.Color(t.col).offsetHSL(ART.grass.h, ART.grass.s, ART.grass.l)
        : new THREE.Color(t.col).offsetHSL(0, 0.05, 0.04);
      if (t.t !== 'grass') c.set(grade('#' + c.getHexString()));
      // Land outside your border stays readable, just cooler and dimmer.
      if (!world.territory[key] && t.t !== 'water') c.offsetHSL(0, -0.12, 0).multiplyScalar(0.72).lerp(new THREE.Color('#4a5070'), 0.12);
      base.set(key, c);
      return c;
    };
    const rock = new THREE.Color(ART.rock), snow = new THREE.Color(ART.snow), line = ART.snowLine;
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        const k = j * (W + 1) + i;
        const c = this.c.setRGB(0, 0, 0);
        let n = 0;
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]])
          if (world.inside(x, y)) {
            c.add(tileCol(x, y));
            n++;
          }
        c.multiplyScalar(1 / Math.max(1, n));
        const h = C[k];
        const slope = Math.abs(C[Math.min(k + 1, C.length - 1)] - h) + Math.abs(C[Math.min(k + W + 1, C.length - 1)] - h);
        if (slope > 0.35 && h > 0.3) c.lerp(rock, Math.min(0.8, (slope - 0.35) * 1.5));
        if (h > line) c.lerp(snow, Math.min(1, (h - line) * 1.2));
        if (h < SEA) c.lerp(this.deep, Math.min(0.85, -h * 0.5));
        col.setXYZ(k, c.r, c.g, c.b);
      }
    col.needsUpdate = true;
  }

  private drawBorder() {
    const world = this.world!;
    const inT = (x: number, y: number) => world.inside(x, y) && world.territory[y * W + x] === 1;
    const pts: number[] = [];
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      for (let s = 0; s < 4; s++) {
        const t0 = s / 4, t1 = (s + 1) / 4;
        const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;
        pts.push(x0, this.heightAt(x0, y0) + 0.04, y0, x1, this.heightAt(x1, y1) + 0.04, y1);
      }
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!inT(x, y)) continue;
        if (!inT(x - 1, y)) seg(x, y, x, y + 1);
        if (!inT(x + 1, y)) seg(x + 1, y, x + 1, y + 1);
        if (!inT(x, y - 1)) seg(x, y, x + 1, y);
        if (!inT(x, y + 1)) seg(x, y + 1, x + 1, y + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.border.geometry.dispose();
    this.border.geometry = g;
    this.border.computeLineDistances();
  }

  // Draped ribbons along each road: a dark verge under a lighter packed-earth track.
  private drawRoads(game: Game) {
    for (const c of this.roads.children) (c as THREE.Mesh).geometry.dispose();
    this.roads.clear();
    for (const [width, color, lift, off] of [[0.38, ART.roads[0], 0.02, -1], [0.26, ART.roads[1], 0.03, -2]] as const) {
      const pos: number[] = [], idx: number[] = [];
      for (const r of game.roads.values()) {
        // Round the corners, then add points so no step is longer than a quarter tile.
        const curve = smoothPath(r.path), pts: THREE.Vector2[] = [];
        curve.forEach((p, i) => {
          if (i) {
            const a = curve[i - 1], n = Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / 0.25);
            for (let s = 1; s < n; s++) pts.push(new THREE.Vector2(a.x + 0.5 + ((p.x - a.x) * s) / n, a.y + 0.5 + ((p.y - a.y) * s) / n));
          }
          pts.push(new THREE.Vector2(p.x + 0.5, p.y + 0.5));
        });
        const base = pos.length / 3;
        pts.forEach((p, i) => {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          const d = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
          const nx = -d.y * width / 2, ny = d.x * width / 2;
          pos.push(p.x + nx, this.heightAt(p.x + nx, p.y + ny) + lift, p.y + ny);
          pos.push(p.x - nx, this.heightAt(p.x - nx, p.y - ny) + lift, p.y - ny);
          if (i) {
            const k = base + i * 2;
            idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
          }
        });
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 1 ? [] : [pos[i] * 1.5])), 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, map: this.grain, roughness: 1, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }));
      m.receiveShadow = true;
      this.roads.add(m);
    }
  }

  // --- scenery -------------------------------------------------------------

  // Turns a model by `yaw` around its base, then bends it `bend` radians with the wind.
  private bent(yaw: number, bend: number) {
    this.q.setFromAxisAngle(UP, yaw);
    this.q2.setFromAxisAngle(LEAN_AXIS, bend);
    return this.q.premultiply(this.q2);
  }

  private scenery(now: number) {
    const world = this.world!;
    const [leafy, pine, birch, bloom] = this.trees;
    const nt = [0, 0, 0, 0];
    const np = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
    let nr = 0, nc = 0, nf = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = world.at(x, y);
        const gust = wind(x, y, now);
        if (t.tree > 0) {
          const px = x + 0.5 + (hash(x, y) - 0.5) * 0.3, pz = y + 0.5 + (hash(y, x) - 0.5) * 0.3;
          const s = (0.3 + 0.7 * t.tree) * (0.85 + hash(x * 3, y) * 0.35);
          // Some leafy trees are birches, and a few are in blossom. Only the look changes.
          const pick = hash(x * 7 + 1, y * 13 + 2);
          const kind = t.conifer ? 1 : pick < 0.2 ? 2 : pick < 0.27 ? 3 : 0;
          const bend = gust * 0.07 + flutter(x, y, now) * 0.012;
          this.m4.compose(this.v.set(px, this.heightAt(px, pz) - 0.02, pz), this.bent(hash(x, y * 7) * Math.PI * 2, bend), this.s.setScalar(s));
          const mesh = this.trees[kind], n = nt[kind]++;
          mesh.setMatrixAt(n, this.m4);
          // A little warmer or cooler, lighter or darker, so a forest is not one flat green.
          mesh.setColorAt(n, this.c.setHSL(ART.tree.hue + (hash(y, x * 5) - 0.5) * ART.tree.range, ART.tree.s, ART.tree.l + hash(x, y * 3) * 0.22));
        }
        if (t.crop > 0) {
          const px = x + 0.5, pz = y + 0.5, gy = this.heightAt(px, pz);
          this.m4.compose(this.v.set(px, gy + 0.015, pz), this.q.identity(), this.s.setScalar(1));
          this.fields.setMatrixAt(nc, this.m4);
          const bend = (gust * 0.16 + flutter(x, y, now, 1.3) * 0.03) * t.crop;
          const q = this.bent(0, bend);
          this.m4.compose(this.v.set(px, gy, pz), q, this.s.set(1, 0.08 + 0.92 * t.crop, 1));
          this.crops.setMatrixAt(nc, this.m4);
          // Green while growing, gold when ripe.
          this.crops.setColorAt(nc++, t.crop >= 1 ? this.c.set('#e0b84a') : this.c.setHSL(0.25 - 0.1 * t.crop, 0.55, 0.36 + 0.1 * t.crop));
        }
        // A plant hides under anything else on its tile, and comes back when that is gone.
        if (t.plant && !t.tree && !t.crop && !t.rock && !t.b && !t.flag && !t.road) {
          const p = PLANTS[t.plant], mesh = this.plants[t.plant], n = np[t.plant]++;
          const px = x + 0.5 + (hash(x * 5, y) - 0.5) * 0.2, pz = y + 0.5 + (hash(x, y * 5) - 0.5) * 0.2;
          const bend = p.bend * (gust + flutter(x, y, now, 1.6) * 0.25);
          const s = 0.85 + hash(x * 11, y * 3) * 0.35;
          const q = this.bent(hash(y * 3, x) * Math.PI * 2, bend);
          this.m4.compose(this.v.set(px, this.heightAt(px, pz) - 0.01, pz), q, this.s.setScalar(s));
          mesh.setMatrixAt(n, this.m4);
          mesh.setColorAt(n, t.plant === 'pebbles' ? this.c.setHSL(0.08, 0.08, 0.55 + hash(x, y * 9) * 0.2) : this.c.setHSL(0.15, 0.2, 0.85 + hash(x * 9, y) * 0.15));
          if (t.plant === 'flowers') {
            this.petals.setMatrixAt(nf, this.m4);
            this.petals.setColorAt(nf++, this.c.set(grade(PETALS[Math.floor(hash(x * 13, y * 17) * PETALS.length)])));
          }
        }
        if (t.rock > 0) {
          const k = Math.min(3, Math.ceil(t.rock / 2));
          for (let i = 0; i < k; i++) {
            const px = x + 0.5 + (hash(x + i, y) - 0.5) * 0.55, pz = y + 0.5 + (hash(x, y + i) - 0.5) * 0.55;
            const s = 0.9 + hash(x * (i + 1), y) * 0.6 + t.rock * 0.08;
            this.e.set(hash(i, x) * 3, hash(y, i) * 6, 0);
            this.m4.compose(this.v.set(px, this.heightAt(px, pz) + 0.02, pz), this.q.setFromEuler(this.e), this.s.set(s, s * 0.7, s));
            this.rocks.setMatrixAt(nr, this.m4);
            this.rocks.setColorAt(nr++, this.c.setHSL(0.08 + hash(i, y) * 0.04, 0.08, 0.5 + hash(x + i, y * 2) * 0.14));
          }
        }
      }
    for (const k of KINDS) {
      const m = this.plants[k];
      m.count = np[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    for (const [m, n] of [[leafy, nt[0]], [pine, nt[1]], [birch, nt[2]], [bloom, nt[3]], [this.petals, nf], [this.rocks, nr], [this.crops, nc], [this.fields, nc]] as const) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // --- buildings -----------------------------------------------------------

  private mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
    const key = color + JSON.stringify(extra);
    let m = this.mats.get(key);
    if (!m) this.mats.set(key, (m = new THREE.MeshStandardMaterial({ color: grade(color), roughness: 0.85, ...extra })));
    return m;
  }

  private add(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, extra?: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.Mesh(geo, this.mat(color, extra));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // A timber-framed house on a stone footing. The roof ridge runs along X and the door faces +Z.
  // `w` and `d` are half the width (X) and half the depth (Z) of the walls.
  private house(g: THREE.Group, model: Model, o: House) {
    const { w, d, h, rh, wall, roof, style = 'tile', chimney = true, door = -0.35, win = 0.45 } = o;
    const e = style === 'thatch' ? 0.09 : 0.07, beam = '#4e3420', top = h + 0.05;
    const at = new THREE.Group();
    at.position.set(o.x ?? 0, 0, o.z ?? 0);
    g.add(at);
    this.add(at, new THREE.BoxGeometry(2 * w + 0.08, 0.3, 2 * d + 0.08), '#9d958a', 0, -0.1, 0);
    this.add(at, new THREE.BoxGeometry(2 * w, h, 2 * d), wall, 0, h / 2 + 0.05, 0);
    // A stone ground floor with lighter corner stones; the timber frame sits on top.
    const sh = h * 0.5;
    this.add(at, new THREE.BoxGeometry(2 * w + 0.03, sh, 2 * d + 0.03), '#a59d8e', 0, 0.05 + sh / 2, 0);
    for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]])
      for (let i = 0; i < 3; i++) this.add(at, new THREE.BoxGeometry(0.07, sh / 3 - 0.01, 0.07), i % 2 ? '#bdb5a6' : '#c8c0b0', x, 0.05 + (i + 0.5) * (sh / 3), z);

    // Timber frame: corner posts, a sill, a middle rail and a top beam.
    for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) this.add(at, new THREE.BoxGeometry(0.045, h, 0.045), beam, x, h / 2 + 0.05, z);
    for (const y of [0.07, 0.05 + h * 0.55, top - 0.02]) this.add(at, new THREE.BoxGeometry(2 * w + 0.03, 0.035, 2 * d + 0.03), beam, 0, y, 0);
    // A cross of braces in the upper half of the side wall.
    const span = h * 0.45 - 0.03, len = Math.hypot(span, 2 * d);
    for (const s of [1, -1]) {
      const b = this.add(at, new THREE.BoxGeometry(0.02, len, 0.025), beam, w + 0.012, 0.05 + h * 0.775, 0);
      b.rotation.x = s * Math.atan2(2 * d, span);
    }

    // Gable walls and the two roof slopes.
    const shape = new THREE.Shape([new THREE.Vector2(-d, 0), new THREE.Vector2(d, 0), new THREE.Vector2(0, rh)]);
    this.add(at, new THREE.ExtrudeGeometry(shape, { depth: 2 * w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-w, top, 0), wall, 0, 0, 0);
    const t = style === 'thatch' ? 0.1 : 0.05;
    const L = Math.hypot(d + e, rh) + 0.03, a = Math.atan2(rh, d + e);
    for (const side of [1, -1]) {
      const slab = this.add(at, new THREE.BoxGeometry(2 * w + 2 * e, t, L), roof, 0, top + rh / 2 + t / 2 - 0.005, (side * (d + e)) / 2);
      slab.rotation.x = side * a;
      if (style === 'thatch') {
        // A thick, shaggy lower edge.
        this.add(slab, new THREE.BoxGeometry(2 * w + 2 * e + 0.02, t * 1.3, 0.06), shadeOf(roof, 0.78), 0, -0.01, side * (L / 2 - 0.02));
      } else {
        // Rows of tiles or slates, each a little darker at its lower lip.
        const n = Math.max(3, Math.round(L / (style === 'slate' ? 0.07 : 0.09)));
        for (let i = 0; i < n; i++)
          this.add(slab, new THREE.BoxGeometry(2 * w + 2 * e + 0.005, 0.022, 0.03), shadeOf(roof, 0.8), 0, t / 2, -L / 2 + ((i + 0.6) * L) / n);
      }
    }
    if (style === 'thatch') this.add(at, new THREE.CylinderGeometry(0.06, 0.06, 2 * w + 2 * e, 8).rotateZ(Math.PI / 2), shadeOf(roof, 0.72), 0, top + rh + 0.03, 0);
    else this.add(at, new THREE.BoxGeometry(2 * w + 2 * e + 0.02, 0.06, 0.07), shadeOf(roof, 0.65), 0, top + rh + 0.04, 0);

    if (chimney) {
      const cx = w * 0.55, cz = -d * 0.4, ch = rh + 0.24, cy = top + rh * 0.45 + ch / 2 - 0.1;
      this.add(at, new THREE.BoxGeometry(0.1, ch, 0.1), '#8c8278', cx, cy, cz);
      this.add(at, new THREE.BoxGeometry(0.13, 0.035, 0.13), '#6e665e', cx, cy + ch / 2, cz);
      model.chimney = new THREE.Vector3((o.x ?? 0) + cx, cy + ch / 2 + 0.05, (o.z ?? 0) + cz);
    }

    // Door with a frame and a stone step; a shuttered window beside it and one on the side.
    if (o.bigDoor) {
      this.add(at, new THREE.BoxGeometry(0.34, 0.34, 0.02), beam, 0, 0.22, d + 0.008);
      for (const s of [-1, 1]) this.add(at, new THREE.BoxGeometry(0.14, 0.3, 0.025), '#6a4628', s * 0.075, 0.2, d + 0.014);
      this.add(at, new THREE.BoxGeometry(0.28, 0.025, 0.03), beam, 0, 0.2, d + 0.03);
    } else {
      const dx = door * w;
      this.add(at, new THREE.BoxGeometry(0.17, 0.27, 0.02), beam, dx, 0.185, d + 0.008);
      this.add(at, new THREE.BoxGeometry(0.12, 0.23, 0.025), '#6a4628', dx, 0.165, d + 0.014);
      this.add(at, new THREE.BoxGeometry(0.2, 0.04, 0.08), '#a39b8f', dx, 0.03, d + 0.06);
    }
    const glass = { emissive: '#ffa040', emissiveIntensity: 0.35 };
    const shutter = shadeOf(o.shutter ?? roof, 0.85);
    if (win !== null) {
      const wx = win * w, wy = 0.05 + h * 0.62;
      this.add(at, new THREE.BoxGeometry(0.1, 0.1, 0.02), '#ffd88a', wx, wy, d + 0.012, glass);
      for (const s of [-1, 1]) this.add(at, new THREE.BoxGeometry(0.045, 0.11, 0.015), shutter, wx + s * 0.075, wy, d + 0.016);
      this.add(at, new THREE.BoxGeometry(0.13, 0.02, 0.04), beam, wx, wy - 0.06, d + 0.02);
    }
    this.add(at, new THREE.BoxGeometry(0.02, 0.09, 0.09), '#ffd88a', w + 0.012, 0.05 + h * 0.3, d * 0.35, glass);
    return at;
  }

  private logPile(g: THREE.Group, x: number, z: number, n: number) {
    for (let i = 0; i < n; i++) {
      const row = i >= 3 ? 1 : 0;
      const m = this.add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.26, 7), '#7a4a24', x + (i % 3) * 0.075 - 0.075 + row * 0.037, 0.04 + row * 0.06, z);
      m.rotation.x = Math.PI / 2;
      // Pale cut ends.
      for (const s of [-1, 1]) {
        const end = this.add(m, new THREE.CylinderGeometry(0.03, 0.03, 0.005, 7), '#e0bf8a', 0, s * 0.13, 0);
        end.castShadow = false;
      }
    }
  }

  // A small leafy sapling, used by the forester and as decoration.
  private sapling(g: THREE.Object3D, x: number, z: number, s = 1) {
    this.add(g, new THREE.CylinderGeometry(0.008 * s, 0.012 * s, 0.1 * s, 4), '#6a4524', x, 0.05 * s, z);
    this.add(g, new THREE.IcosahedronGeometry(0.05 * s, 0), '#6cb648', x, 0.12 * s, z, { flatShading: true });
  }

  private crate(g: THREE.Object3D, x: number, y: number, z: number, s = 0.13) {
    this.add(g, new THREE.BoxGeometry(s, s, s), '#b4844e', x, y + s / 2, z);
    this.add(g, new THREE.BoxGeometry(s + 0.006, 0.02, s + 0.006), '#7a5530', x, y + s * 0.8, z);
    this.add(g, new THREE.BoxGeometry(s + 0.006, 0.02, s + 0.006), '#7a5530', x, y + s * 0.2, z);
  }

  private barrel(g: THREE.Object3D, x: number, z: number) {
    this.add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), '#8a5a32', x, 0.08, z);
    for (const y of [0.03, 0.13]) this.add(g, new THREE.CylinderGeometry(0.064, 0.064, 0.015, 10), '#4a4440', x, y, z);
  }

  private makeBuilding(type: BType, built: boolean): Model {
    const g = new THREE.Group();
    const def = BDEFS[type];
    const model: Model = { g, key: `${type}:${built}` };
    if (!built) {
      // A building site: a stone footing, scaffolding, and a timber frame that rises as it is built.
      this.add(g, new THREE.BoxGeometry(0.86, 0.08, 0.86), '#a39b8f', 0, 0.0, 0);
      const rise = new THREE.Group();
      for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28], [0, -0.28], [0, 0.28], [-0.28, 0], [0.28, 0]])
        this.add(rise, new THREE.BoxGeometry(0.04, 1, 0.04).translate(0, 0.5, 0), '#c99a5e', x, 0, z);
      for (const y of [0.33, 0.66, 0.98]) {
        this.add(rise, new THREE.BoxGeometry(0.6, 0.035, 0.04), '#b0824c', 0, y, 0.28);
        this.add(rise, new THREE.BoxGeometry(0.6, 0.035, 0.04), '#b0824c', 0, y, -0.28);
        this.add(rise, new THREE.BoxGeometry(0.04, 0.035, 0.6), '#b0824c', 0.28, y, 0);
        this.add(rise, new THREE.BoxGeometry(0.04, 0.035, 0.6), '#b0824c', -0.28, y, 0);
      }
      g.add(rise);
      model.rise = rise;
      // Scaffold poles and a ladder stay full height.
      for (const [x, z] of [[-0.4, 0.4], [0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]])
        this.add(g, new THREE.CylinderGeometry(0.018, 0.02, 0.8, 5), '#7a5530', x, 0.4, z);
      for (const y of [0.4, 0.75]) {
        this.add(g, new THREE.BoxGeometry(0.82, 0.02, 0.07), '#9c7444', 0, y, 0.4);
        this.add(g, new THREE.BoxGeometry(0.07, 0.02, 0.82), '#9c7444', 0.4, y, 0);
      }
      const ladder = new THREE.Group();
      for (const s of [-1, 1]) this.add(ladder, new THREE.BoxGeometry(0.015, 0.75, 0.015), '#7a5530', s * 0.05, 0.37, 0);
      for (let i = 0; i < 6; i++) this.add(ladder, new THREE.BoxGeometry(0.1, 0.012, 0.012), '#7a5530', 0, 0.08 + i * 0.12, 0);
      ladder.position.set(-0.2, 0, 0.46);
      ladder.rotation.x = -0.15;
      g.add(ladder);
      const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#2a1e12', opacity: 0.7, transparent: true, depthTest: false }));
      bg.scale.set(0.62, 0.08, 1);
      bg.position.y = 1.1;
      bg.renderOrder = 10;
      const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#ffd24a', depthTest: false }));
      bar.center.set(0, 0.5);
      bar.renderOrder = 11;
      bar.position.copy(bg.position).addScaledVector(RIGHT, -0.3);
      g.add(bg, bar);
      model.bar = bar;
      return model;
    }
    const wall = def.wall, roof = ART.roofs[type];
    switch (type) {
      case 'hq': {
        this.add(g, new THREE.BoxGeometry(1.02, 0.3, 1.02), '#a39a8c', 0, -0.1, 0);
        // A square stone keep with battlements and a banner.
        const tx = -0.22, tz = -0.22, stone = '#d8cdb2';
        this.add(g, new THREE.BoxGeometry(0.44, 1.35, 0.44), stone, tx, 0.67, tz);
        this.add(g, new THREE.BoxGeometry(0.5, 0.08, 0.5), shadeOf(stone, 0.85), tx, 1.36, tz);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]])
          this.add(g, new THREE.BoxGeometry(0.1, 0.11, 0.1), stone, tx + x * 0.2, 1.45, tz + z * 0.2);
        for (const y of [0.85, 1.12]) {
          this.add(g, new THREE.BoxGeometry(0.04, 0.12, 0.02), '#2a2420', tx + 0.1, y, tz + 0.225);
          this.add(g, new THREE.BoxGeometry(0.02, 0.12, 0.04), '#2a2420', tx + 0.225, y, tz - 0.05);
        }
        this.add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), '#3b2b1a', tx, 1.7, tz);
        model.cloth = this.add(g, new THREE.PlaneGeometry(0.34, 0.2).translate(0.17, 0, 0), roof, tx, 1.86, tz, { side: THREE.DoubleSide });
        // A round corner tower with a pointed roof.
        this.add(g, new THREE.CylinderGeometry(0.13, 0.14, 0.95, 12), stone, 0.3, 0.47, -0.3);
        this.add(g, new THREE.ConeGeometry(0.18, 0.36, 12), roof, 0.3, 1.12, -0.3);
        // The main hall in front.
        this.house(g, model, { w: 0.42, d: 0.3, h: 0.58, rh: 0.4, wall, roof, x: 0.06, z: 0.14, door: 0.0, win: 0.6, bigDoor: true });
        this.barrel(g, -0.4, 0.4);
        this.crate(g, 0.42, 0, 0.47, 0.1);
        break;
      }
      case 'lookout': {
        this.add(g, new THREE.BoxGeometry(0.6, 0.3, 0.6), '#9d958a', 0, -0.1, 0);
        // A small room at the bottom, four tall posts with braces, a railed platform and a spire.
        this.add(g, new THREE.BoxGeometry(0.38, 0.38, 0.38), wall, 0, 0.24, 0);
        this.add(g, new THREE.BoxGeometry(0.12, 0.22, 0.02), '#6a4628', 0, 0.16, 0.2);
        const beam = '#5a3c22', top = 1.2;
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.add(g, new THREE.BoxGeometry(0.055, top, 0.055), beam, x * 0.21, top / 2, z * 0.21);
        for (const [y0, y1] of [[0.45, 0.82], [0.82, 1.18]]) {
          const dy = y1 - y0, len = Math.hypot(0.42, dy), ang = Math.atan2(0.42, dy);
          for (const s of [1, -1]) {
            for (const z of [0.21, -0.21]) this.add(g, new THREE.BoxGeometry(0.025, len, 0.025), beam, 0, (y0 + y1) / 2, z).rotation.z = s * ang;
            for (const x of [0.21, -0.21]) this.add(g, new THREE.BoxGeometry(0.025, len, 0.025), beam, x, (y0 + y1) / 2, 0).rotation.x = s * ang;
          }
        }
        this.add(g, new THREE.BoxGeometry(0.64, 0.05, 0.64), '#8a6238', 0, top, 0);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.add(g, new THREE.BoxGeometry(0.035, 0.3, 0.035), beam, x * 0.29, top + 0.15, z * 0.29);
        for (const [x, z, sx, sz] of [[0, 0.29, 0.6, 0.025], [0, -0.29, 0.6, 0.025], [0.29, 0, 0.025, 0.6], [-0.29, 0, 0.025, 0.6]])
          this.add(g, new THREE.BoxGeometry(sx, 0.025, sz), beam, x, top + 0.12, z);
        const spire = this.add(g, new THREE.ConeGeometry(0.46, 0.5, 4), roof, 0, top + 0.55, 0);
        spire.rotation.y = Math.PI / 4;
        this.add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), beam, 0, top + 0.9, 0);
        model.cloth = this.add(g, new THREE.PlaneGeometry(0.16, 0.09).translate(0.08, 0, 0), '#e9c440', 0, top + 0.96, 0, { side: THREE.DoubleSide });
        break;
      }
      case 'sawmill': {
        this.house(g, model, { w: 0.3, d: 0.26, h: 0.44, rh: 0.3, wall, roof, x: -0.14, z: -0.14, win: 0.4 });
        // An open shed over the saw bench.
        const beam = '#5a3c22';
        for (const [x, z] of [[0.12, 0.12], [0.44, 0.12], [0.12, 0.44], [0.44, 0.44]]) this.add(g, new THREE.BoxGeometry(0.035, 0.42, 0.035), beam, x, 0.21, z);
        const lean = this.add(g, new THREE.BoxGeometry(0.42, 0.035, 0.44), roof, 0.28, 0.44, 0.28);
        lean.rotation.x = 0.25;
        this.add(g, new THREE.BoxGeometry(0.3, 0.1, 0.12), '#7a5530', 0.28, 0.08, 0.3);
        const log = this.add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.3, 7), '#7a4a24', 0.28, 0.16, 0.3);
        log.rotation.z = Math.PI / 2;
        const blade = this.add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16), '#c8ccd0', 0.32, 0.17, 0.3, { metalness: 0.7, roughness: 0.3 });
        blade.geometry.rotateX(Math.PI / 2);
        model.spin = blade;
        this.logPile(g, -0.28, 0.35, 5);
        this.add(g, new THREE.BoxGeometry(0.2, 0.03, 0.08), '#d9b27a', 0.3, 0.015, -0.3);
        this.add(g, new THREE.BoxGeometry(0.2, 0.03, 0.08), '#d9b27a', 0.32, 0.045, -0.3);
        break;
      }
      case 'storehouse': {
        // A wide barn with big double doors, crates and barrels.
        this.house(g, model, { w: 0.42, d: 0.3, h: 0.46, rh: 0.4, wall, roof, z: -0.08, chimney: false, win: null, bigDoor: true });
        this.crate(g, -0.36, 0, 0.36);
        this.crate(g, -0.22, 0, 0.4, 0.11);
        this.crate(g, -0.3, 0.13, 0.37, 0.1);
        this.barrel(g, 0.32, 0.36);
        this.barrel(g, 0.42, 0.24);
        break;
      }
      case 'mill': {
        // A tapered white tower with a turning cap and four lattice sails.
        this.add(g, new THREE.CylinderGeometry(0.36, 0.38, 0.3, 14), '#9d958a', 0, -0.1, 0);
        this.add(g, new THREE.CylinderGeometry(0.22, 0.31, 1.05, 14), wall, 0, 0.57, 0);
        this.add(g, new THREE.CylinderGeometry(0.33, 0.33, 0.04, 14), '#6a4628', 0, 0.42, 0);
        this.add(g, new THREE.ConeGeometry(0.28, 0.4, 14), roof, 0, 1.29, 0);
        this.add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), shadeOf(roof, 0.75), 0, 1.11, 0);
        this.add(g, new THREE.BoxGeometry(0.13, 0.25, 0.03), '#6a4628', 0, 0.17, 0.3);
        this.add(g, new THREE.BoxGeometry(0.07, 0.09, 0.02), '#ffd88a', 0, 0.75, 0.25, { emissive: '#ffa040', emissiveIntensity: 0.35 });
        this.add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8).rotateX(Math.PI / 2), '#4a3220', 0, 1.08, 0.27);
        const sails = new THREE.Group();
        sails.position.set(0, 1.08, 0.36);
        for (let i = 0; i < 4; i++) {
          const arm = new THREE.Group();
          arm.rotation.z = (i * Math.PI) / 2;
          this.add(arm, new THREE.BoxGeometry(0.03, 0.66, 0.025), '#5a3c22', 0, 0.33, 0);
          this.add(arm, new THREE.BoxGeometry(0.14, 0.46, 0.008), '#f2ead8', 0.085, 0.4, 0.008);
          for (let k = 0; k < 4; k++) this.add(arm, new THREE.BoxGeometry(0.15, 0.012, 0.015), '#7a5530', 0.085, 0.2 + k * 0.13, 0.016);
          this.add(arm, new THREE.BoxGeometry(0.012, 0.46, 0.015), '#7a5530', 0.155, 0.4, 0.016);
          sails.add(arm);
        }
        g.add(sails);
        model.sails = sails;
        for (const [x, z] of [[0.32, 0.22], [0.38, 0.1]]) this.add(g, new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.15, 1), '#efe6d0', x, 0.06, z);
        break;
      }
      case 'mine': {
        this.add(g, new THREE.BoxGeometry(0.9, 0.3, 0.9), '#8a8378', 0, -0.1, 0);
        // A rocky mound with a timbered tunnel mouth, rails and a cart of stone.
        this.add(g, new THREE.DodecahedronGeometry(0.5, 0).scale(1, 0.8, 0.8), '#948d80', 0, 0.22, -0.18, { flatShading: true });
        this.add(g, new THREE.DodecahedronGeometry(0.28, 0).scale(1, 0.9, 1), '#857e72', -0.3, 0.16, 0.05, { flatShading: true });
        this.add(g, new THREE.DodecahedronGeometry(0.22, 0), '#9c9588', 0.32, 0.12, -0.12, { flatShading: true });
        this.add(g, new THREE.BoxGeometry(0.3, 0.34, 0.12), '#16120e', 0, 0.17, 0.22);
        const beam = '#5a3c22';
        for (const x of [-0.17, 0.17]) this.add(g, new THREE.BoxGeometry(0.055, 0.42, 0.06), beam, x, 0.21, 0.29);
        this.add(g, new THREE.BoxGeometry(0.46, 0.06, 0.08), beam, 0, 0.44, 0.29);
        this.add(g, new THREE.BoxGeometry(0.03, 0.06, 0.03), '#ffcf6a', 0.2, 0.36, 0.33, { emissive: '#ffa040', emissiveIntensity: 0.9 });
        for (const x of [-0.06, 0.06]) this.add(g, new THREE.BoxGeometry(0.015, 0.012, 0.3), '#6a6460', x, 0.01, 0.42);
        for (let i = 0; i < 4; i++) this.add(g, new THREE.BoxGeometry(0.18, 0.012, 0.03), '#6a4628', 0, 0.005, 0.3 + i * 0.07);
        this.add(g, new THREE.BoxGeometry(0.16, 0.08, 0.12), '#5d5248', 0, 0.07, 0.43);
        for (const [x, z] of [[-0.03, 0.42], [0.04, 0.44], [0, 0.4]]) this.add(g, new THREE.DodecahedronGeometry(0.035, 0), '#b0ada4', x, 0.13, z);
        break;
      }
      default: {
        const style: Roof = type === 'quarry' ? 'slate' : type === 'bakery' ? 'tile' : 'thatch';
        this.house(g, model, { w: 0.3, d: 0.25, h: 0.42, rh: 0.3, wall, roof, style, x: -0.08, z: -0.08, shutter: '#4f6f5a' });
        if (type === 'woodcutter') {
          this.logPile(g, 0.3, 0.32, 5);
          this.add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), '#7a5530', -0.33, 0.05, 0.33);
          this.add(g, new THREE.CylinderGeometry(0.055, 0.055, 0.005, 8), '#e0bf8a', -0.33, 0.1, 0.33);
          const axe = new THREE.Group();
          this.add(axe, new THREE.BoxGeometry(0.012, 0.16, 0.012), '#6a4628', 0, 0.08, 0);
          this.add(axe, new THREE.BoxGeometry(0.05, 0.035, 0.012), '#c8ccd0', 0.02, 0.15, 0);
          axe.position.set(-0.33, 0.09, 0.33);
          axe.rotation.z = 0.3;
          g.add(axe);
        } else if (type === 'forester') {
          // A little fenced nursery bed of saplings.
          this.add(g, new THREE.BoxGeometry(0.22, 0.03, 0.34), '#6b4a2c', 0.36, 0.015, 0.05);
          for (const [x, z] of [[0.31, -0.06], [0.41, 0.05], [0.31, 0.16], [0.4, -0.08]]) this.sapling(g, x, z, 0.9);
          for (const z of [-0.13, 0.23]) this.add(g, new THREE.BoxGeometry(0.24, 0.02, 0.015), '#8a6238', 0.36, 0.07, z);
          this.sapling(g, -0.36, 0.38, 1.3);
        } else if (type === 'fisher') {
          // An upturned boat, a drying rack with fish and a net.
          const boat = this.add(g, new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.9, 0.6, 0.75), '#7a5230', 0.26, 0, 0.36);
          boat.rotation.y = 0.35;
          for (const x of [0.28, 0.46]) this.add(g, new THREE.BoxGeometry(0.02, 0.3, 0.02), '#5a3c22', x, 0.15, -0.18);
          this.add(g, new THREE.BoxGeometry(0.22, 0.015, 0.015), '#5a3c22', 0.37, 0.29, -0.18);
          for (const x of [0.32, 0.37, 0.42]) this.add(g, new THREE.SphereGeometry(0.02, 6, 4).scale(0.6, 2.2, 0.6), '#9cc0d0', x, 0.23, -0.18);
          this.add(g, new THREE.PlaneGeometry(0.2, 0.14), '#e8e0c4', -0.36, 0.12, 0.3, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }).rotation.y = 0.8;
        } else if (type === 'farm') {
          // A haystack, sacks of grain and a stretch of fence.
          this.add(g, new THREE.CylinderGeometry(0.12, 0.13, 0.12, 10), '#d8b84a', 0.33, 0.06, 0.3);
          this.add(g, new THREE.ConeGeometry(0.13, 0.16, 10), '#e3c457', 0.33, 0.2, 0.3);
          for (const [x, z] of [[0.38, 0.04], [0.32, -0.06]]) this.add(g, new THREE.SphereGeometry(0.05, 8, 6).scale(1, 1.3, 0.9), '#cdb488', x, 0.06, z);
          for (let i = 0; i < 4; i++) this.add(g, new THREE.BoxGeometry(0.02, 0.12, 0.02), '#8a6238', -0.44 + i * 0.12, 0.06, 0.42);
          for (const y of [0.05, 0.1]) this.add(g, new THREE.BoxGeometry(0.38, 0.015, 0.012), '#8a6238', -0.26, y, 0.42);
        } else if (type === 'bakery') {
          // A domed brick oven with its own chimney, where the smoke comes from.
          this.add(g, new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), '#b5654a', 0.3, 0, 0.26);
          this.add(g, new THREE.BoxGeometry(0.08, 0.07, 0.03), '#1a100a', 0.3, 0.04, 0.41, { emissive: '#ff6a20', emissiveIntensity: 0.8 });
          this.add(g, new THREE.BoxGeometry(0.06, 0.18, 0.06), '#9a4f3a', 0.3, 0.2, 0.18);
          model.chimney = new THREE.Vector3(0.3, 0.33, 0.18);
          this.add(g, new THREE.BoxGeometry(0.16, 0.02, 0.1), '#8a6238', -0.36, 0.12, 0.36);
          for (const s of [-1, 1]) this.add(g, new THREE.BoxGeometry(0.015, 0.12, 0.015), '#6a4628', -0.36 + s * 0.06, 0.06, 0.36);
          this.add(g, new THREE.SphereGeometry(0.035, 8, 6).scale(1.5, 0.7, 1), '#c07a36', -0.36, 0.145, 0.36);
        } else if (type === 'quarry') {
          for (const [x, y, z, s] of [[0.33, 0, 0.27, 0.1], [0.42, 0, 0.12, 0.09], [0.37, 0.1, 0.22, 0.08], [0.28, 0, -0.3, 0.09]])
            this.add(g, new THREE.BoxGeometry(s * 1.5, s, s * 1.1), '#bdb9ae', x, y + s / 2, z);
          const pick = new THREE.Group();
          this.add(pick, new THREE.BoxGeometry(0.012, 0.17, 0.012), '#6a4628', 0, 0.085, 0);
          this.add(pick, new THREE.BoxGeometry(0.12, 0.018, 0.018), '#8c9094', 0, 0.17, 0);
          pick.position.set(-0.36, 0, 0.36);
          pick.rotation.z = -0.4;
          g.add(pick);
        }
      }
    }
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(type), depthTest: false, transparent: true }));
    icon.scale.setScalar(0.3);
    icon.renderOrder = 12;
    if (type !== 'hq') {
      icon.position.y = iconY(type);
      g.add(icon);
      model.icon = icon;
    }
    model.smoke = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: '#e8e8e8', transparent: true, depthWrite: false }));
      s.visible = false;
      g.add(s);
      return s;
    });
    return model;
  }

  private noRoadSign() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.noRoadTex, depthTest: false, transparent: true }));
    s.scale.setScalar(0.4);
    s.renderOrder = 13;
    return s;
  }

  private icon(type: BType) {
    let t = this.icons.get(type);
    if (!t) this.icons.set(type, (t = iconTexture(BDEFS[type].icon)));
    return t;
  }

  private ghostify(g: THREE.Object3D) {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = (m.material as THREE.Material).clone();
      Object.assign(m.material, { transparent: true, opacity: 0.55, depthWrite: false });
      m.castShadow = false;
    });
    g.visible = false;
  }

  private buildings(game: Game, now: number) {
    const seen = new Set<number>();
    for (const b of game.buildings.values()) {
      seen.add(b.id);
      const key = `${b.type}:${b.built}`;
      let m = this.models.get(b.id);
      if (!m || m.key !== key) {
        if (m) this.scene.remove(m.g);
        m = this.makeBuilding(b.type, b.built);
        if (b.type !== 'hq') m.g.add((m.noRoad = this.noRoadSign()));
        m.g.position.set(b.x + 0.5, this.heightAt(b.x + 0.5, b.y + 0.5), b.y + 0.5);
        this.models.set(b.id, m);
        this.scene.add(m.g);
      }
      if (m.noRoad) {
        m.noRoad.visible = !game.linked(b);
        m.noRoad.position.y = (b.built ? iconY(b.type) + 0.42 : 1.4) + Math.sin(now * 4) * 0.04;
      }
      this.animateBuilding(b, m, now);
    }
    for (const [id, m] of this.models)
      if (!seen.has(id)) {
        this.scene.remove(m.g);
        this.models.delete(id);
      }
  }

  private animateBuilding(b: Building, m: Model, now: number) {
    const base = m.g.position;
    if (m.rise) {
      m.rise.scale.y = Math.max(0.001, 0.55 * b.progress);
      m.bar!.scale.set(0.6 * b.progress, 0.07, 1);
      let k = 0;
      for (const g of ['plank', 'stone'] as Good[])
        for (let i = 0; i < b.stock[g]; i++, k++) this.good(g, base.x - 0.3 + (k % 3) * 0.2, base.y + 0.04 + Math.floor(k / 3) * 0.06, base.z + 0.52, 0);
      return;
    }
    if (m.cloth) m.cloth.rotation.y = Math.sin(now * 3) * 0.35;
    if (m.icon) m.icon.position.y = iconY(b.type) + Math.sin(now * 2 + b.id) * 0.03;
    if (m.sails && b.busy) m.sails.rotation.z = -now * 1.6;
    if (m.spin && b.busy) m.spin.rotation.z = -now * 14;
    const c = m.chimney;
    m.smoke!.forEach((s, i) => {
      s.visible = b.busy && !!c;
      if (!s.visible) return;
      const t = (now * 0.5 + i / 3) % 1;
      s.position.set(c!.x + Math.sin(t * 6) * 0.05 + t * 0.12, c!.y + t * 0.7, c!.z);
      s.scale.setScalar(0.12 + t * 0.25);
      (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - t);
    });
    let k = 0;
    for (const g of GOOD_LIST)
      for (let i = 0; i < b.out[g]; i++, k++) this.good(g, base.x + 0.5, base.y + 0.04 + Math.floor(k / 2) * 0.06, base.z + 0.12 - (k % 2) * 0.24, Math.PI / 2);
  }

  private good(g: Good, x: number, y: number, z: number, rot: number) {
    const n = this.goodN[g]++;
    if (n >= 4000) return;
    this.e.set(0, rot, 0);
    this.m4.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e), this.s.setScalar(1));
    this.goods[g].setMatrixAt(n, this.m4);
  }

  // --- flags and settlers --------------------------------------------------

  private makeFlag(): Model {
    const g = new THREE.Group();
    this.add(g, new THREE.DodecahedronGeometry(0.045, 0).scale(1, 0.5, 1), '#9d958a', 0, 0.01, 0);
    this.add(g, new THREE.CylinderGeometry(0.013, 0.017, 0.58, 6), '#5a3c22', 0, 0.29, 0);
    this.add(g, new THREE.SphereGeometry(0.022, 8, 6), '#f0c030', 0, 0.59, 0, { metalness: 0.5, roughness: 0.4 });
    const pennant = new THREE.Shape([new THREE.Vector2(0, 0.075), new THREE.Vector2(0.25, 0.075), new THREE.Vector2(0.19, 0), new THREE.Vector2(0.25, -0.075), new THREE.Vector2(0, -0.075)]);
    const cloth = this.add(g, new THREE.ShapeGeometry(pennant), ART.flag, 0, 0.49, 0, { side: THREE.DoubleSide });
    this.add(cloth, new THREE.PlaneGeometry(0.25, 0.022).translate(0.1, 0.06, 0.001), '#f0c030', 0, 0, 0, { side: THREE.DoubleSide });
    return { g, key: 'flag', cloth };
  }

  private flagsAndGoods(game: Game, now: number) {
    const seen = new Set<number>();
    for (const f of game.flags.values()) {
      seen.add(f.id);
      let m = this.flags.get(f.id);
      if (!m) {
        m = this.makeFlag();
        m.g.position.set(f.x + 0.5, this.heightAt(f.x + 0.5, f.y + 0.5), f.y + 0.5);
        this.flags.set(f.id, m);
        this.scene.add(m.g);
      }
      m.cloth!.rotation.y = Math.sin(now * 4 + f.x) * 0.4;
      const p = m.g.position;
      f.items.forEach((it, k) => {
        const a = (k / 8) * Math.PI * 2 + 0.4;
        this.good(it.g, p.x + Math.cos(a) * 0.2, p.y + 0.04, p.z + Math.sin(a) * 0.2, -a);
      });
    }
    for (const [id, m] of this.flags)
      if (!seen.has(id)) {
        this.scene.remove(m.g);
        this.flags.delete(id);
      }
  }

  // A settler: legs, a tunic in their trade's colour, swinging arms, and a hat and tool for the job.
  private makePerson(role: Role): Person {
    const g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    const shirt = ROLE_COLOR[role], skin = '#eac39a', trousers = '#4a3a2c';
    const legs = [-0.028, 0.028].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.12, 0);
      this.add(pivot, new THREE.BoxGeometry(0.036, 0.11, 0.04), trousers, 0, -0.055, 0);
      this.add(pivot, new THREE.BoxGeometry(0.04, 0.025, 0.055), '#2e2218', 0, -0.108, 0.008);
      body.add(pivot);
      return pivot;
    });
    this.add(body, new THREE.CylinderGeometry(0.048, 0.062, 0.15, 8), shirt, 0, 0.19, 0);
    this.add(body, new THREE.CylinderGeometry(0.063, 0.063, 0.02, 8), '#3a2a1c', 0, 0.14, 0);
    this.add(body, new THREE.SphereGeometry(0.042, 10, 8), skin, 0, 0.3, 0);
    this.add(body, new THREE.SphereGeometry(0.044, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), HAIR[role], 0, 0.305, -0.004);
    this.hat(body, role);
    const arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.062, 0.255, 0);
      this.add(pivot, new THREE.BoxGeometry(0.026, 0.1, 0.03), shirt, 0, -0.045, 0);
      this.add(pivot, new THREE.SphereGeometry(0.016, 6, 4), skin, 0, -0.1, 0);
      body.add(pivot);
      return pivot;
    });
    const tool = this.tool(role);
    tool.position.set(0, -0.1, 0);
    tool.visible = false;
    arms[1].add(tool);
    // A big head on a small body, so the hat shows the trade: scale up everything above the neck.
    for (const c of body.children)
      if (c.position.y >= 0.28) {
        c.position.y = 0.3 + (c.position.y - 0.3) * 1.6 + 0.05;
        c.scale.multiplyScalar(1.6);
      }
    body.scale.setScalar(PERSON_SCALE);
    return { g, legs, arms, tool, body, px: NaN, py: NaN, heading: 0 };
  }

  private hat(body: THREE.Group, role: Role) {
    const y = 0.33;
    const brim = (r: number, color: string) => this.add(body, new THREE.CylinderGeometry(r, r, 0.012, 12), color, 0, y, 0);
    switch (role) {
      case 'farmer':
      case 'fisher':
        brim(0.085, HAT[role]);
        this.add(body, new THREE.CylinderGeometry(0.035, 0.045, 0.04, 10), HAT[role], 0, y + 0.02, 0);
        break;
      case 'forester':
        brim(0.07, HAT[role]);
        this.add(body, new THREE.ConeGeometry(0.045, 0.07, 10), HAT[role], 0, y + 0.035, 0);
        break;
      case 'woodcutter':
      case 'scout':
        this.add(body, new THREE.ConeGeometry(0.048, 0.1, 10), HAT[role], 0, y + 0.04, -0.008).rotation.x = -0.35;
        if (role === 'scout') this.add(body, new THREE.BoxGeometry(0.008, 0.07, 0.02), '#e84a3a', 0.03, y + 0.06, -0.02).rotation.z = -0.4;
        break;
      case 'baker':
        this.add(body, new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), HAT[role], 0, y + 0.03, 0);
        break;
      case 'miller':
        this.add(body, new THREE.SphereGeometry(0.048, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), HAT[role], 0.01, y - 0.005, 0);
        break;
      case 'miner':
        this.add(body, new THREE.SphereGeometry(0.047, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), HAT[role], 0, y - 0.01, 0);
        this.add(body, new THREE.BoxGeometry(0.02, 0.02, 0.012), '#ffe08a', 0, y + 0.02, 0.045, { emissive: '#ffb040', emissiveIntensity: 1 });
        break;
      case 'carrier':
        break;
      default:
        // A flat cap with a short peak.
        this.add(body, new THREE.CylinderGeometry(0.045, 0.047, 0.025, 10), HAT[role], 0, y + 0.005, 0);
        this.add(body, new THREE.BoxGeometry(0.06, 0.008, 0.035), HAT[role], 0, y - 0.004, 0.045);
    }
  }

  // The tool a worker holds while working. Its handle points along +Z from the hand.
  private tool(role: Role) {
    const t = new THREE.Group(), wood = '#6b4a28', iron = '#b8bcc0';
    const handle = (len: number) => this.add(t, new THREE.BoxGeometry(0.014, 0.014, len), wood, 0, 0, len / 2 - 0.03);
    switch (role) {
      case 'woodcutter':
        handle(0.18);
        this.add(t, new THREE.BoxGeometry(0.008, 0.06, 0.04), iron, 0, 0.02, 0.14);
        break;
      case 'stonecutter':
      case 'miner':
        handle(0.17);
        this.add(t, new THREE.BoxGeometry(0.014, 0.12, 0.018), iron, 0, 0, 0.13).rotation.x = 0.2;
        break;
      case 'forester':
        handle(0.2);
        this.add(t, new THREE.BoxGeometry(0.05, 0.008, 0.06), iron, 0, 0, 0.19);
        break;
      case 'farmer': {
        handle(0.1);
        const blade = this.add(t, new THREE.TorusGeometry(0.045, 0.006, 4, 10, Math.PI * 1.2), iron, 0, 0.0, 0.1);
        blade.rotation.y = Math.PI / 2;
        break;
      }
      case 'fisher':
        this.add(t, new THREE.CylinderGeometry(0.004, 0.007, 0.4, 4).rotateX(Math.PI / 2), wood, 0, 0, 0.17);
        break;
      default:
        handle(0.14);
        this.add(t, new THREE.BoxGeometry(0.02, 0.05, 0.03), '#8c9094', 0, 0, 0.11);
    }
    return t;
  }

  private settlers(game: Game, now: number) {
    const seen = new Set<number>();
    for (const s of game.settlers.values()) {
      if (s.inside) continue;
      seen.add(s.id);
      let p = this.people.get(s.id);
      if (!p) {
        p = this.makePerson(s.role);
        this.people.set(s.id, p);
        this.scene.add(p.g);
      }
      this.pose(s, p, now);
    }
    for (const [id, p] of this.people)
      if (!seen.has(id)) {
        this.scene.remove(p.g);
        this.people.delete(id);
      }
  }

  private pose(s: Settler, p: Person, now: number) {
    const x = s.x + 0.5, z = s.y + 0.5;
    const dx = x - p.px, dz = z - p.py;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < 1) {
      const want = Math.atan2(dx, dz);
      let d = want - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * 0.3;
    }
    p.px = x;
    p.py = z;
    const ph = now * 11 + s.id;
    const y = this.heightAt(x, z);
    p.g.position.set(x, y + (s.walking ? Math.abs(Math.sin(ph)) * 0.02 : 0), z);
    p.g.rotation.y = p.heading;
    const swing = s.walking ? Math.sin(ph) * 0.6 : 0;
    p.legs[0].rotation.x = swing;
    p.legs[1].rotation.x = -swing;
    // Arms swing against the legs, hold a load up on the head, or swing the tool.
    const [armL, armR] = p.arms;
    armL.rotation.x = s.carrying ? -2.7 : -swing * 0.8;
    armR.rotation.x = s.carrying ? -2.7 : swing * 0.8;
    p.tool.visible = !!s.anim;
    if (s.anim) armR.rotation.x = s.anim === 'plant' ? -0.5 + Math.sin(now * 6) * 0.35
      : s.anim === 'fish' ? -1.2 + Math.sin(now * 1.5) * 0.08
      : s.anim === 'reap' ? -0.6 + Math.sin(now * 6) * 0.7
      : -1.2 + Math.sin(now * 9) * 0.9;
    if (s.carrying) this.good(s.carrying, x, y + CARRY_Y, z, p.heading + Math.PI / 2);
  }

  // --- overlays ------------------------------------------------------------

  private tileOutline(line: THREE.LineLoop | THREE.Mesh, x: number, y: number, lift = 0.04) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].forEach(([cx, cy], i) => a.setXYZ(i, cx, this.heightAt(cx, cy) + lift, cy));
    a.needsUpdate = true;
    line.visible = true;
  }

  private circle(line: THREE.LineLoop, x: number, y: number, r: number) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2, px = x + 0.5 + Math.cos(t) * r, pz = y + 0.5 + Math.sin(t) * r;
      a.setXYZ(i, px, Math.max(SEA, this.heightAt(px, pz)) + 0.05, pz);
    }
    a.needsUpdate = true;
    line.visible = true;
  }

  private overlays(game: Game, view: View) {
    for (const o of [this.hoverFill, this.hoverRing, this.selRing, this.fromRing, this.selRadius, this.placeRadius, this.ghostFlag]) o.visible = false;
    for (const g of this.ghosts.values()) g.visible = false;
    const world = game.world;

    const from = view.tool === 'road' && view.roadFrom ? game.flags.get(view.roadFrom) : null;
    if (from) this.tileOutline(this.fromRing, from.x, from.y);
    const path = from ? view.preview : null;
    if (path !== this.previewOf) {
      this.previewOf = path;
      const g = new THREE.BufferGeometry();
      if (path) g.setFromPoints(smoothPath(path).map((p) => new THREE.Vector3(p.x + 0.5, this.heightAt(p.x + 0.5, p.y + 0.5) + 0.08, p.y + 0.5)));
      this.preview.geometry.dispose();
      this.preview.geometry = g;
      // A geometry without points has no position attribute, which computeLineDistances needs.
      if (path) this.preview.computeLineDistances();
    }
    this.preview.visible = !!path;

    const sel = game.buildings.get(view.selected);
    if (sel) {
      this.tileOutline(this.selRing, sel.x, sel.y);
      const r = BDEFS[sel.type].radius;
      if (r && sel.type !== 'hq') this.circle(this.selRadius, sel.x, sel.y, r);
    }

    const hv = view.hover;
    if (!hv || !world.inside(hv.x, hv.y)) return;
    if (view.placing) {
      this.tileOutline(this.hoverFill, hv.x, hv.y, 0.03);
      (this.hoverFill.material as THREE.MeshBasicMaterial).color.set(view.placeOk ? '#78ff8c' : '#ff5a50');
      const r = BDEFS[view.placing].radius;
      if (r) this.circle(this.placeRadius, hv.x, hv.y, r);
      if (view.placeOk) {
        let ghost = this.ghosts.get(view.placing);
        if (!ghost) {
          ghost = this.makeBuilding(view.placing, true).g;
          this.ghostify(ghost);
          ghost.traverse((o) => { if ((o as THREE.Sprite).isSprite) o.visible = false; });
          this.ghosts.set(view.placing, ghost);
          this.scene.add(ghost);
        }
        ghost.position.set(hv.x + 0.5, this.heightAt(hv.x + 0.5, hv.y + 0.5), hv.y + 0.5);
        ghost.visible = true;
        this.ghostFlag.position.set(hv.x + 0.5, this.heightAt(hv.x + 0.5, hv.y + 1.5), hv.y + 1.5);
        this.ghostFlag.visible = true;
      }
    } else {
      (this.hoverRing.material as THREE.LineBasicMaterial).color.set(view.tool === 'remove' ? '#ff6a5a' : '#ffffff');
      this.tileOutline(this.hoverRing, hv.x, hv.y);
    }
  }
}

function shadeOf(hex: string, k: number) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}
