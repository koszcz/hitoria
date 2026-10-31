// Settler models: body, tunic, hat and tool for each trade.
import * as THREE from 'three';
import { Role } from '../game';
import { add } from './kit';

// Settlers are drawn a third larger than true scale so you can follow them, and a load
// sits on top of their big heads.
export const PERSON_SCALE = 1.35;
export const CARRY_Y = 0.42 * PERSON_SCALE + 0.07;

// Tunic colours, hats and hair, so you can tell a settler's trade at a glance.
export const ROLE_COLOR: Record<Role, string> = {
  carrier: '#d8c08a', builder: '#e0883a', woodcutter: '#b0402e', forester: '#5f9a3a',
  stonecutter: '#8a8f96', sawyer: '#a8763e', scout: '#3f6fc0',
  fisher: '#3f7a96', farmer: '#c8a040', miller: '#efe8d6', baker: '#d9894a', miner: '#5a5048',
};
export const HAT: Record<Role, string> = {
  carrier: '', builder: '#f2c23a', woodcutter: '#3f6a34', forester: '#4a6a2c', stonecutter: '#6a6e72',
  sawyer: '#6b4a28', scout: '#2c4a8a', fisher: '#e8c84a', farmer: '#ead48a', miller: '#ffffff', baker: '#ffffff', miner: '#4a4440',
};
export const HAIR: Record<Role, string> = {
  carrier: '#6a4a2a', builder: '#3a2618', woodcutter: '#8a4a22', forester: '#4a3020', stonecutter: '#2a2420',
  sawyer: '#b0803a', scout: '#d8b060', fisher: '#5a5048', farmer: '#9a6a32', miller: '#c8c0b0', baker: '#4a3020', miner: '#2a2420',
};

export interface Person {
  g: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  tool: THREE.Object3D;
  body: THREE.Group;
  px: number;
  py: number;
  heading: number;
}

// A settler: legs, a tunic in their trade's colour, swinging arms, and a hat and tool for the job.
export function makePerson(role: Role): Person {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const shirt = ROLE_COLOR[role], skin = '#eac39a', trousers = '#4a3a2c';
  const legs = [-0.028, 0.028].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.12, 0);
    add(pivot, new THREE.BoxGeometry(0.036, 0.11, 0.04), trousers, 0, -0.055, 0);
    add(pivot, new THREE.BoxGeometry(0.04, 0.025, 0.055), '#2e2218', 0, -0.108, 0.008);
    body.add(pivot);
    return pivot;
  });
  add(body, new THREE.CylinderGeometry(0.048, 0.062, 0.15, 8), shirt, 0, 0.19, 0);
  add(body, new THREE.CylinderGeometry(0.063, 0.063, 0.02, 8), '#3a2a1c', 0, 0.14, 0);
  add(body, new THREE.SphereGeometry(0.042, 10, 8), skin, 0, 0.3, 0);
  add(body, new THREE.SphereGeometry(0.044, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), HAIR[role], 0, 0.305, -0.004);
  hat(body, role);
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.062, 0.255, 0);
    add(pivot, new THREE.BoxGeometry(0.026, 0.1, 0.03), shirt, 0, -0.045, 0);
    add(pivot, new THREE.SphereGeometry(0.016, 6, 4), skin, 0, -0.1, 0);
    body.add(pivot);
    return pivot;
  });
  const tool = makeTool(role);
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

export function hat(body: THREE.Group, role: Role) {
  const y = 0.33;
  const brim = (r: number, color: string) => add(body, new THREE.CylinderGeometry(r, r, 0.012, 12), color, 0, y, 0);
  switch (role) {
    case 'farmer':
    case 'fisher':
      brim(0.085, HAT[role]);
      add(body, new THREE.CylinderGeometry(0.035, 0.045, 0.04, 10), HAT[role], 0, y + 0.02, 0);
      break;
    case 'forester':
      brim(0.07, HAT[role]);
      add(body, new THREE.ConeGeometry(0.045, 0.07, 10), HAT[role], 0, y + 0.035, 0);
      break;
    case 'woodcutter':
    case 'scout':
      add(body, new THREE.ConeGeometry(0.048, 0.1, 10), HAT[role], 0, y + 0.04, -0.008).rotation.x = -0.35;
      if (role === 'scout') add(body, new THREE.BoxGeometry(0.008, 0.07, 0.02), '#e84a3a', 0.03, y + 0.06, -0.02).rotation.z = -0.4;
      break;
    case 'baker':
      add(body, new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), HAT[role], 0, y + 0.03, 0);
      break;
    case 'miller':
      add(body, new THREE.SphereGeometry(0.048, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), HAT[role], 0.01, y - 0.005, 0);
      break;
    case 'miner':
      add(body, new THREE.SphereGeometry(0.047, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), HAT[role], 0, y - 0.01, 0);
      add(body, new THREE.BoxGeometry(0.02, 0.02, 0.012), '#ffe08a', 0, y + 0.02, 0.045, { emissive: '#ffb040', emissiveIntensity: 1 });
      break;
    case 'carrier':
      break;
    default:
      // A flat cap with a short peak.
      add(body, new THREE.CylinderGeometry(0.045, 0.047, 0.025, 10), HAT[role], 0, y + 0.005, 0);
      add(body, new THREE.BoxGeometry(0.06, 0.008, 0.035), HAT[role], 0, y - 0.004, 0.045);
  }
}

// The tool a worker holds while working. Its handle points along +Z from the hand.
export function makeTool(role: Role) {
  const t = new THREE.Group(), wood = '#6b4a28', iron = '#b8bcc0';
  const handle = (len: number) => add(t, new THREE.BoxGeometry(0.014, 0.014, len), wood, 0, 0, len / 2 - 0.03);
  switch (role) {
    case 'woodcutter':
      handle(0.18);
      add(t, new THREE.BoxGeometry(0.008, 0.06, 0.04), iron, 0, 0.02, 0.14);
      break;
    case 'stonecutter':
    case 'miner':
      handle(0.17);
      add(t, new THREE.BoxGeometry(0.014, 0.12, 0.018), iron, 0, 0, 0.13).rotation.x = 0.2;
      break;
    case 'forester':
      handle(0.2);
      add(t, new THREE.BoxGeometry(0.05, 0.008, 0.06), iron, 0, 0, 0.19);
      break;
    case 'farmer': {
      handle(0.1);
      const blade = add(t, new THREE.TorusGeometry(0.045, 0.006, 4, 10, Math.PI * 1.2), iron, 0, 0.0, 0.1);
      blade.rotation.y = Math.PI / 2;
      break;
    }
    case 'fisher':
      add(t, new THREE.CylinderGeometry(0.004, 0.007, 0.4, 4).rotateX(Math.PI / 2), wood, 0, 0, 0.17);
      break;
    default:
      handle(0.14);
      add(t, new THREE.BoxGeometry(0.02, 0.05, 0.03), '#8c9094', 0, 0, 0.11);
  }
  return t;
}
