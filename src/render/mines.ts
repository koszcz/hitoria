// The three mines: a rocky mound with a timbered tunnel mouth, rails and a cart of what the mine digs.
// Each mine has its own rock colour and one tell-tale feature, so you can tell them apart.
import * as THREE from 'three';
import type { BType } from '../game';
import { add } from './kit';

type MineType = Extract<BType, 'mine' | 'coalmine' | 'ironmine'>;

// The rock of the mound, from lightest to darkest, and the colour of the good in the cart.
const ROCK: Record<MineType, { rock: [string, string, string]; base: string; good: string }> = {
  mine: { rock: ['#948d80', '#857e72', '#9c9588'], base: '#8a8378', good: '#b0ada4' },
  coalmine: { rock: ['#5e5852', '#4e4944', '#68625b'], base: '#5a5550', good: '#1e1c1c' },
  ironmine: { rock: ['#9a6e58', '#875c48', '#a87a62'], base: '#8a7466', good: '#7a3e26' },
};

export function mine(g: THREE.Group, type: MineType, roof: string) {
  const { rock, base, good } = ROCK[type];
  add(g, new THREE.BoxGeometry(0.9, 0.3, 0.9), base, 0, -0.1, 0);
  add(g, new THREE.DodecahedronGeometry(0.5, 0).scale(1, 0.8, 0.8), rock[0], 0, 0.22, -0.18, { flatShading: true });
  add(g, new THREE.DodecahedronGeometry(0.28, 0).scale(1, 0.9, 1), rock[1], -0.3, 0.16, 0.05, { flatShading: true });
  add(g, new THREE.DodecahedronGeometry(0.22, 0), rock[2], 0.32, 0.12, -0.12, { flatShading: true });
  add(g, new THREE.BoxGeometry(0.3, 0.34, 0.12), '#16120e', 0, 0.17, 0.22);
  const beam = '#5a3c22';
  for (const x of [-0.17, 0.17]) add(g, new THREE.BoxGeometry(0.055, 0.42, 0.06), beam, x, 0.21, 0.29);
  add(g, new THREE.BoxGeometry(0.46, 0.06, 0.08), beam, 0, 0.44, 0.29);
  add(g, new THREE.BoxGeometry(0.03, 0.06, 0.03), '#ffcf6a', 0.2, 0.36, 0.33, { emissive: '#ffa040', emissiveIntensity: 0.9 });
  for (const x of [-0.06, 0.06]) add(g, new THREE.BoxGeometry(0.015, 0.012, 0.3), '#6a6460', x, 0.01, 0.42);
  for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.18, 0.012, 0.03), '#6a4628', 0, 0.005, 0.3 + i * 0.07);
  add(g, new THREE.BoxGeometry(0.16, 0.08, 0.12), '#5d5248', 0, 0.07, 0.43);
  for (const [x, z] of [[-0.03, 0.42], [0.04, 0.44], [0, 0.4]]) add(g, new THREE.DodecahedronGeometry(0.035, 0), good, x, 0.13, z);
  if (type === 'coalmine') hoist(g, roof);
  if (type === 'ironmine') orePile(g, roof, good);
}

// A coal mine has a timber hoist over a shaft on top of the mound, with a pale rope wheel.
function hoist(g: THREE.Group, wheel: string) {
  const beam = '#4a3220';
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.035, 0.5, 0.035).rotateZ(s * 0.28), beam, s * 0.08, 0.72, -0.2);
  }
  add(g, new THREE.BoxGeometry(0.26, 0.035, 0.035), beam, 0, 0.6, -0.2);
  add(g, new THREE.TorusGeometry(0.075, 0.014, 5, 12), wheel, 0, 0.94, -0.2);
  add(g, new THREE.BoxGeometry(0.006, 0.36, 0.006), '#d8d0c0', 0.075, 0.74, -0.2);
}

// An iron mine has a heap of rust-red ore by its mouth and a little roofed tool rack.
function orePile(g: THREE.Group, roof: string, ore: string) {
  for (const [x, y, z, r] of [[-0.3, 0.04, 0.32, 0.07], [-0.36, 0.04, 0.22, 0.06], [-0.26, 0.1, 0.26, 0.05]] as const)
    add(g, new THREE.DodecahedronGeometry(r, 0), ore, x, y, z, { flatShading: true });
  add(g, new THREE.BoxGeometry(0.18, 0.025, 0.14), roof, 0.32, 0.3, 0.3);
  for (const x of [0.25, 0.39]) add(g, new THREE.BoxGeometry(0.02, 0.3, 0.02), '#5a3c22', x, 0.15, 0.3);
  add(g, new THREE.BoxGeometry(0.012, 0.2, 0.012).rotateZ(0.3), '#6a6460', 0.31, 0.12, 0.33);
}
