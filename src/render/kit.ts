// Small helpers every model builder shares: palette grading, materials and mesh placement.
import * as THREE from 'three';
import { ART } from '../art';

// Shifts any model colour toward the game's palette.
const graded = new Map<string, string>();
export function grade(hex: string) {
  let out = graded.get(hex);
  if (out) return out;
  const { h, s, l, tint, k } = ART.grade;
  out = '#' + new THREE.Color(hex).offsetHSL(h, s, l).lerp(new THREE.Color(tint), k).getHexString();
  graded.set(hex, out);
  return out;
}

export const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Paints a whole geometry one colour (as a vertex colour) so pieces can be merged into one mesh.
export function paint(g: THREE.BufferGeometry, color: string, jitter = 0) {
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

export function piece(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, jitter = 0) {
  g.translate(x, y, z);
  return paint(g, color, jitter);
}

// Keeps a model's vertices identical from load to load: the jitter above uses Math.random.
export function seeded<T>(seed: number, f: () => T): T {
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
export function skyShade(g: THREE.BufferGeometry, low = 0.7, high = 1.15) {
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  const pos = g.attributes.position, col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const k = low + ((pos.getY(i) - min.y) / (max.y - min.y || 1)) * (high - low);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return g;
}

export function shadeOf(hex: string, k: number) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

// Each material from `mat()` remembers its settings other than colour under this key, so
// `mergeModel` knows which parts can share one material.
export const EXTRA = 'extra';
const mats = new Map<string, THREE.Material>();
export function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  const key = color + JSON.stringify(extra);
  let m = mats.get(key);
  if (!m) {
    mats.set(key, (m = new THREE.MeshStandardMaterial({ color: grade(color), roughness: 0.85, ...extra })));
    m.userData[EXTRA] = JSON.stringify(extra);
  }
  return m;
}

// The material for merged parts: the same settings, with the colour taken from the vertices.
const vertexMats = new Map<string, THREE.Material>();
export function vertexMat(extra: string) {
  let m = vertexMats.get(extra);
  if (!m) vertexMats.set(extra, (m = new THREE.MeshStandardMaterial({ roughness: 0.85, ...JSON.parse(extra), vertexColors: true })));
  return m;
}

export function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, extra?: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const RIGHT = new THREE.Vector3(1, 0, -1).normalize(); // screen right, on the ground
