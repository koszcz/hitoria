// The worker huts, each with its own body and the tools of its trade, so you can tell them apart.
import * as THREE from 'three';
import type { BType } from '../game';
import type { Model } from './buildings';
import { add } from './kit';
import { house, logPile, sapling } from './props';

export function hut(g: THREE.Group, model: Model, type: BType, wall: string, roof: string) {
  if (type === 'woodcutter') woodcutter(g, model, wall, roof);
  else if (type === 'forester') forester(g, model, wall, roof);
  else if (type === 'quarry') quarry(g, model, wall, roof);
  else if (type === 'fisher') fisher(g, model, wall, roof);
  else if (type === 'farm') farm(g, model, wall, roof);
  else if (type === 'bakery') bakery(g, model, wall, roof);
  else if (type === 'well') well(g, wall, roof);
}

// A log cabin with a mossy roof, a pile of logs and a chopping block with an axe in it.
function woodcutter(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.3, d: 0.22, h: 0.34, rh: 0.24, wall, roof, walls: 'logs', x: -0.08, z: -0.1, shutter: '#5a3c22' });
  logPile(g, 0.3, 0.32, 5);
  add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), '#7a5530', -0.33, 0.05, 0.33);
  add(g, new THREE.CylinderGeometry(0.055, 0.055, 0.005, 8), '#e0bf8a', -0.33, 0.1, 0.33);
  const axe = new THREE.Group();
  add(axe, new THREE.BoxGeometry(0.012, 0.16, 0.012), '#6a4628', 0, 0.08, 0);
  add(axe, new THREE.BoxGeometry(0.05, 0.035, 0.012), '#c8ccd0', 0.02, 0.15, 0);
  axe.position.set(-0.33, 0.09, 0.33);
  axe.rotation.z = 0.3;
  g.add(axe);
}

// A narrow hut under a tall, steep thatch, beside a fenced nursery bed of saplings.
function forester(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.2, d: 0.2, h: 0.3, rh: 0.5, wall, roof, style: 'thatch', x: -0.12, z: -0.1, door: 0, win: null, chimney: false });
  add(g, new THREE.BoxGeometry(0.22, 0.03, 0.34), '#6b4a2c', 0.32, 0.015, 0.05);
  for (const [x, z] of [[0.27, -0.06], [0.37, 0.05], [0.27, 0.16], [0.36, -0.08]]) sapling(g, x, z, 0.9);
  for (const z of [-0.13, 0.23]) add(g, new THREE.BoxGeometry(0.24, 0.02, 0.015), '#8a6238', 0.32, 0.07, z);
  sapling(g, -0.36, 0.36, 1.3);
}

// A low, squat stone hut with a flat slate roof, cut blocks and a lifting tripod.
function quarry(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.32, d: 0.22, h: 0.28, rh: 0.14, wall, roof, style: 'slate', walls: 'stone', x: -0.08, z: -0.14, chimney: false, shutter: '#5a5650' });
  for (const [x, y, z, s] of [[0.33, 0, 0.27, 0.1], [0.42, 0, 0.12, 0.09], [0.37, 0.1, 0.22, 0.08], [0.2, 0, 0.36, 0.09]])
    add(g, new THREE.BoxGeometry(s * 1.5, s, s * 1.1), '#bdb9ae', x, y + s / 2, z);
  // Three poles leaning together over the blocks, with a rope and hook.
  const at = new THREE.Vector3(0.33, 0.52, 0.24);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.4, foot = new THREE.Vector3(at.x + Math.cos(a) * 0.17, 0, at.z + Math.sin(a) * 0.17);
    const pole = add(g, new THREE.CylinderGeometry(0.012, 0.014, foot.distanceTo(at), 5), '#6a4628', (at.x + foot.x) / 2, at.y / 2, (at.z + foot.z) / 2);
    pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at.clone().sub(foot).normalize());
  }
  add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), '#d8c8a0', at.x, at.y - 0.1, at.z);
  const pick = new THREE.Group();
  add(pick, new THREE.BoxGeometry(0.012, 0.17, 0.012), '#6a4628', 0, 0.085, 0);
  add(pick, new THREE.BoxGeometry(0.12, 0.018, 0.018), '#8c9094', 0, 0.17, 0);
  pick.position.set(-0.36, 0, 0.36);
  pick.rotation.z = -0.4;
  g.add(pick);
}

// A grey board hut up on stilts, with a ramp, an upturned boat, a fish rack and a net.
function fisher(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.24, d: 0.2, h: 0.32, rh: 0.24, wall, roof, walls: 'planks', lift: 0.16, x: -0.1, z: -0.16, door: 0.3, win: -0.4, chimney: false });
  add(g, new THREE.BoxGeometry(0.1, 0.015, 0.26), '#8a7a62', -0.03, 0.095, 0.27).rotation.x = 0.68;
  const boat = add(g, new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.9, 0.6, 0.75), '#7a5230', 0.28, 0, 0.36);
  boat.rotation.y = 0.35;
  for (const x of [0.28, 0.46]) add(g, new THREE.BoxGeometry(0.02, 0.3, 0.02), '#5a3c22', x, 0.15, -0.18);
  add(g, new THREE.BoxGeometry(0.22, 0.015, 0.015), '#5a3c22', 0.37, 0.29, -0.18);
  for (const x of [0.32, 0.37, 0.42]) add(g, new THREE.SphereGeometry(0.02, 6, 4).scale(0.6, 2.2, 0.6), '#9cc0d0', x, 0.23, -0.18);
  add(g, new THREE.PlaneGeometry(0.2, 0.14), '#e8e0c4', -0.36, 0.12, 0.32, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }).rotation.y = 0.8;
}

// A long farmhouse under golden thatch, with a haystack, sacks of grain and a stretch of fence.
function farm(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.4, d: 0.2, h: 0.32, rh: 0.26, wall, roof, style: 'thatch', x: -0.04, z: -0.18, door: -0.55, win: 0.15, shutter: '#4f6f5a' });
  add(g, new THREE.CylinderGeometry(0.12, 0.13, 0.12, 10), '#d8b84a', 0.33, 0.06, 0.3);
  add(g, new THREE.ConeGeometry(0.13, 0.16, 10), '#e3c457', 0.33, 0.2, 0.3);
  for (const [x, z] of [[0.14, 0.2], [0.04, 0.24]]) add(g, new THREE.SphereGeometry(0.05, 8, 6).scale(1, 1.3, 0.9), '#cdb488', x, 0.06, z);
  for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.02, 0.12, 0.02), '#8a6238', -0.44 + i * 0.12, 0.06, 0.42);
  for (const y of [0.05, 0.1]) add(g, new THREE.BoxGeometry(0.38, 0.015, 0.012), '#8a6238', -0.26, y, 0.42);
}

// A brick bakehouse beside a domed oven with a tall chimney, where the smoke comes from.
function bakery(g: THREE.Group, model: Model, wall: string, roof: string) {
  house(g, model, { w: 0.26, d: 0.24, h: 0.4, rh: 0.26, wall, roof, walls: 'brick', x: -0.12, z: -0.1, chimney: false, shutter: '#4f6f5a' });
  add(g, new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), '#b5654a', 0.3, 0, 0.26);
  add(g, new THREE.BoxGeometry(0.08, 0.07, 0.03), '#1a100a', 0.3, 0.04, 0.41, { emissive: '#ff6a20', emissiveIntensity: 0.8 });
  add(g, new THREE.BoxGeometry(0.09, 0.8, 0.09), '#8c8278', 0.3, 0.4, 0.14);
  add(g, new THREE.BoxGeometry(0.12, 0.04, 0.12), '#6e665e', 0.3, 0.8, 0.14);
  model.chimney = new THREE.Vector3(0.3, 0.86, 0.14);
  add(g, new THREE.BoxGeometry(0.16, 0.02, 0.1), '#8a6238', -0.36, 0.12, 0.36);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.015, 0.12, 0.015), '#6a4628', -0.36 + s * 0.06, 0.06, 0.36);
  add(g, new THREE.SphereGeometry(0.035, 8, 6).scale(1.5, 0.7, 1), '#c07a36', -0.36, 0.145, 0.36);
}

// A round stone well under a little pitched roof, with a winch, a rope and a bucket, and a trough beside it.
function well(g: THREE.Group, wall: string, roof: string) {
  add(g, new THREE.CylinderGeometry(0.2, 0.22, 0.24, 14), wall, 0, 0.12, 0);
  add(g, new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14), '#8c8678', 0, 0.25, 0);
  add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.01, 14), '#3a6a8a', 0, 0.22, 0, { emissive: '#2a5a7a', emissiveIntensity: 0.2 });
  for (const x of [-0.17, 0.17]) add(g, new THREE.BoxGeometry(0.035, 0.42, 0.035), '#6a4628', x, 0.45, 0);
  add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8).rotateZ(Math.PI / 2), '#7a5530', 0, 0.56, 0);
  add(g, new THREE.BoxGeometry(0.008, 0.18, 0.008), '#c8b48a', 0, 0.46, 0);
  add(g, new THREE.CylinderGeometry(0.035, 0.028, 0.05, 8), '#8a6238', 0, 0.36, 0);
  add(g, new THREE.BoxGeometry(0.012, 0.08, 0.012), '#5a3c22', 0.21, 0.56, 0.04);
  for (const s of [-1, 1]) {
    const side = add(g, new THREE.BoxGeometry(0.48, 0.02, 0.2), roof, 0, 0.7, s * 0.075);
    side.rotation.x = s * 0.6;
  }
  add(g, new THREE.BoxGeometry(0.28, 0.06, 0.1), '#7a5530', 0.3, 0.03, 0.3);
  add(g, new THREE.BoxGeometry(0.24, 0.01, 0.07), '#3a6a8a', 0.3, 0.06, 0.3);
  add(g, new THREE.CylinderGeometry(0.035, 0.028, 0.05, 8), '#8a6238', -0.3, 0.025, 0.32);
}
