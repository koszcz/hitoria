// Building and flag models.
import * as THREE from 'three';
import { BDEFS, BType } from '../game';
import { ART } from '../art';
import { RIGHT } from './kit';
import { iconTexture, noRoadTexture, softDot } from './textures';
import { add, shadeOf } from './kit';
import { mergeModel } from './merge';
import { barrel, crate, house, logPile } from './props';
import { hut } from './huts';
import { LOOKS } from './looks';
import { mine } from './mines';

let dotTex: THREE.Texture | undefined;
const dot = () => (dotTex ??= softDot());
let noRoadTexture_: THREE.Texture | undefined;
const noRoadTex = () => (noRoadTexture_ ??= noRoadTexture());
const icons = new Map<BType, THREE.Texture>();

// How high a building's sign floats.
export const iconY = (type: BType) => (type === 'lookout' ? 2.45 : type === 'mill' || type === 'monument' ? 1.95 : 1.3);

export interface Model {
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

export function makeBuilding(type: BType, built: boolean): Model {
  const g = new THREE.Group();
  const model: Model = { g, key: `${type}:${built}` };
  if (!built) {
    // A building site: a stone footing, scaffolding, and a timber frame that rises as it is built.
    add(g, new THREE.BoxGeometry(0.86, 0.08, 0.86), '#a39b8f', 0, 0.0, 0);
    const rise = new THREE.Group();
    for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28], [0, -0.28], [0, 0.28], [-0.28, 0], [0.28, 0]])
      add(rise, new THREE.BoxGeometry(0.04, 1, 0.04).translate(0, 0.5, 0), '#c99a5e', x, 0, z);
    for (const y of [0.33, 0.66, 0.98]) {
      add(rise, new THREE.BoxGeometry(0.6, 0.035, 0.04), '#b0824c', 0, y, 0.28);
      add(rise, new THREE.BoxGeometry(0.6, 0.035, 0.04), '#b0824c', 0, y, -0.28);
      add(rise, new THREE.BoxGeometry(0.04, 0.035, 0.6), '#b0824c', 0.28, y, 0);
      add(rise, new THREE.BoxGeometry(0.04, 0.035, 0.6), '#b0824c', -0.28, y, 0);
    }
    g.add(rise);
    model.rise = rise;
    // Scaffold poles and a ladder stay full height.
    for (const [x, z] of [[-0.4, 0.4], [0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]])
      add(g, new THREE.CylinderGeometry(0.018, 0.02, 0.8, 5), '#7a5530', x, 0.4, z);
    for (const y of [0.4, 0.75]) {
      add(g, new THREE.BoxGeometry(0.82, 0.02, 0.07), '#9c7444', 0, y, 0.4);
      add(g, new THREE.BoxGeometry(0.07, 0.02, 0.82), '#9c7444', 0.4, y, 0);
    }
    const ladder = new THREE.Group();
    for (const s of [-1, 1]) add(ladder, new THREE.BoxGeometry(0.015, 0.75, 0.015), '#7a5530', s * 0.05, 0.37, 0);
    for (let i = 0; i < 6; i++) add(ladder, new THREE.BoxGeometry(0.1, 0.012, 0.012), '#7a5530', 0, 0.08 + i * 0.12, 0);
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
    mergeModel(g, [rise]);
    return model;
  }
  const { wall, roof } = LOOKS[type];
  switch (type) {
    case 'hq': {
      add(g, new THREE.BoxGeometry(1.02, 0.3, 1.02), '#a39a8c', 0, -0.1, 0);
      // A square stone keep with battlements and a banner.
      const tx = -0.22, tz = -0.22, stone = '#d8cdb2';
      add(g, new THREE.BoxGeometry(0.44, 1.35, 0.44), stone, tx, 0.67, tz);
      add(g, new THREE.BoxGeometry(0.5, 0.08, 0.5), shadeOf(stone, 0.85), tx, 1.36, tz);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]])
        add(g, new THREE.BoxGeometry(0.1, 0.11, 0.1), stone, tx + x * 0.2, 1.45, tz + z * 0.2);
      for (const y of [0.85, 1.12]) {
        add(g, new THREE.BoxGeometry(0.04, 0.12, 0.02), '#2a2420', tx + 0.1, y, tz + 0.225);
        add(g, new THREE.BoxGeometry(0.02, 0.12, 0.04), '#2a2420', tx + 0.225, y, tz - 0.05);
      }
      add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), '#3b2b1a', tx, 1.7, tz);
      model.cloth = add(g, new THREE.PlaneGeometry(0.34, 0.2).translate(0.17, 0, 0), roof, tx, 1.86, tz, { side: THREE.DoubleSide });
      // A round corner tower with a pointed roof.
      add(g, new THREE.CylinderGeometry(0.13, 0.14, 0.95, 12), stone, 0.3, 0.47, -0.3);
      add(g, new THREE.ConeGeometry(0.18, 0.36, 12), roof, 0.3, 1.12, -0.3);
      // The main hall in front.
      house(g, model, { w: 0.42, d: 0.3, h: 0.58, rh: 0.4, wall, roof, x: 0.06, z: 0.14, door: 0.0, win: 0.6, bigDoor: true });
      barrel(g, -0.4, 0.4);
      crate(g, 0.42, 0, 0.47, 0.1);
      break;
    }
    case 'lookout': {
      add(g, new THREE.BoxGeometry(0.6, 0.3, 0.6), '#9d958a', 0, -0.1, 0);
      // A small room at the bottom, four tall posts with braces, a railed platform and a spire.
      add(g, new THREE.BoxGeometry(0.38, 0.38, 0.38), wall, 0, 0.24, 0);
      add(g, new THREE.BoxGeometry(0.12, 0.22, 0.02), '#6a4628', 0, 0.16, 0.2);
      const beam = '#5a3c22', top = 1.2;
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, new THREE.BoxGeometry(0.055, top, 0.055), beam, x * 0.21, top / 2, z * 0.21);
      for (const [y0, y1] of [[0.45, 0.82], [0.82, 1.18]]) {
        const dy = y1 - y0, len = Math.hypot(0.42, dy), ang = Math.atan2(0.42, dy);
        for (const s of [1, -1]) {
          for (const z of [0.21, -0.21]) add(g, new THREE.BoxGeometry(0.025, len, 0.025), beam, 0, (y0 + y1) / 2, z).rotation.z = s * ang;
          for (const x of [0.21, -0.21]) add(g, new THREE.BoxGeometry(0.025, len, 0.025), beam, x, (y0 + y1) / 2, 0).rotation.x = s * ang;
        }
      }
      add(g, new THREE.BoxGeometry(0.64, 0.05, 0.64), '#8a6238', 0, top, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, new THREE.BoxGeometry(0.035, 0.3, 0.035), beam, x * 0.29, top + 0.15, z * 0.29);
      for (const [x, z, sx, sz] of [[0, 0.29, 0.6, 0.025], [0, -0.29, 0.6, 0.025], [0.29, 0, 0.025, 0.6], [-0.29, 0, 0.025, 0.6]])
        add(g, new THREE.BoxGeometry(sx, 0.025, sz), beam, x, top + 0.12, z);
      const spire = add(g, new THREE.ConeGeometry(0.46, 0.5, 4), roof, 0, top + 0.55, 0);
      spire.rotation.y = Math.PI / 4;
      add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), beam, 0, top + 0.9, 0);
      model.cloth = add(g, new THREE.PlaneGeometry(0.16, 0.09).translate(0.08, 0, 0), '#e9c440', 0, top + 0.96, 0, { side: THREE.DoubleSide });
      break;
    }
    case 'sawmill': {
      house(g, model, { w: 0.3, d: 0.26, h: 0.44, rh: 0.3, wall, roof, x: -0.14, z: -0.14, win: 0.4 });
      // An open shed over the saw bench.
      const beam = '#5a3c22';
      for (const [x, z] of [[0.12, 0.12], [0.44, 0.12], [0.12, 0.44], [0.44, 0.44]]) add(g, new THREE.BoxGeometry(0.035, 0.42, 0.035), beam, x, 0.21, z);
      const lean = add(g, new THREE.BoxGeometry(0.42, 0.035, 0.44), roof, 0.28, 0.44, 0.28);
      lean.rotation.x = 0.25;
      add(g, new THREE.BoxGeometry(0.3, 0.1, 0.12), '#7a5530', 0.28, 0.08, 0.3);
      const log = add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.3, 7), '#7a4a24', 0.28, 0.16, 0.3);
      log.rotation.z = Math.PI / 2;
      const blade = add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16), '#c8ccd0', 0.32, 0.17, 0.3, { metalness: 0.7, roughness: 0.3 });
      blade.geometry.rotateX(Math.PI / 2);
      model.spin = blade;
      logPile(g, -0.28, 0.35, 5);
      add(g, new THREE.BoxGeometry(0.2, 0.03, 0.08), '#d9b27a', 0.3, 0.015, -0.3);
      add(g, new THREE.BoxGeometry(0.2, 0.03, 0.08), '#d9b27a', 0.32, 0.045, -0.3);
      break;
    }
    case 'storehouse': {
      // A wide barn with big double doors, crates and barrels.
      house(g, model, { w: 0.42, d: 0.3, h: 0.46, rh: 0.4, wall, roof, z: -0.08, chimney: false, win: null, bigDoor: true });
      crate(g, -0.36, 0, 0.36);
      crate(g, -0.22, 0, 0.4, 0.11);
      crate(g, -0.3, 0.13, 0.37, 0.1);
      barrel(g, 0.32, 0.36);
      barrel(g, 0.42, 0.24);
      break;
    }
    case 'mill': {
      // A tapered white tower with a turning cap and four lattice sails.
      add(g, new THREE.CylinderGeometry(0.36, 0.38, 0.3, 14), '#9d958a', 0, -0.1, 0);
      add(g, new THREE.CylinderGeometry(0.22, 0.31, 1.05, 14), wall, 0, 0.57, 0);
      add(g, new THREE.CylinderGeometry(0.33, 0.33, 0.04, 14), '#6a4628', 0, 0.42, 0);
      add(g, new THREE.ConeGeometry(0.28, 0.4, 14), roof, 0, 1.29, 0);
      add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), shadeOf(roof, 0.75), 0, 1.11, 0);
      add(g, new THREE.BoxGeometry(0.13, 0.25, 0.03), '#6a4628', 0, 0.17, 0.3);
      add(g, new THREE.BoxGeometry(0.07, 0.09, 0.02), '#ffd88a', 0, 0.75, 0.25, { emissive: '#ffa040', emissiveIntensity: 0.35 });
      add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8).rotateX(Math.PI / 2), '#4a3220', 0, 1.08, 0.27);
      const sails = new THREE.Group();
      sails.position.set(0, 1.08, 0.36);
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.z = (i * Math.PI) / 2;
        add(arm, new THREE.BoxGeometry(0.03, 0.66, 0.025), '#5a3c22', 0, 0.33, 0);
        add(arm, new THREE.BoxGeometry(0.14, 0.46, 0.008), '#f2ead8', 0.085, 0.4, 0.008);
        for (let k = 0; k < 4; k++) add(arm, new THREE.BoxGeometry(0.15, 0.012, 0.015), '#7a5530', 0.085, 0.2 + k * 0.13, 0.016);
        add(arm, new THREE.BoxGeometry(0.012, 0.46, 0.015), '#7a5530', 0.155, 0.4, 0.016);
        sails.add(arm);
      }
      g.add(sails);
      model.sails = sails;
      for (const [x, z] of [[0.32, 0.22], [0.38, 0.1]]) add(g, new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.15, 1), '#efe6d0', x, 0.06, z);
      break;
    }
    case 'mine':
    case 'coalmine':
    case 'ironmine':
      mine(g, type, roof);
      break;
    case 'house': {
      // A cottage with a vegetable patch, a picket fence and washing on a line.
      house(g, model, { w: 0.28, d: 0.24, h: 0.4, rh: 0.32, wall, roof, style: 'tile', x: -0.1, z: -0.12, door: 0.3, win: -0.4, shutter: '#6a4a7a' });
      add(g, new THREE.BoxGeometry(0.3, 0.025, 0.2), '#6b4a2c', -0.24, 0.0125, 0.32);
      for (let i = 0; i < 3; i++)
        for (const z of [0.27, 0.37]) add(g, new THREE.SphereGeometry(0.03, 6, 5), i === 1 ? '#c8503a' : '#5f8a3a', -0.34 + i * 0.1, 0.045, z);
      for (let i = 0; i < 6; i++) add(g, new THREE.BoxGeometry(0.018, 0.09, 0.012), '#efe6d0', -0.4 + i * 0.065, 0.045, 0.45);
      add(g, new THREE.BoxGeometry(0.34, 0.012, 0.01), '#efe6d0', -0.24, 0.07, 0.45);
      const pole = '#5a3c22';
      for (const x of [0.22, 0.44]) add(g, new THREE.BoxGeometry(0.02, 0.3, 0.02), pole, x, 0.15, 0.36);
      add(g, new THREE.BoxGeometry(0.22, 0.004, 0.004), '#d8d0c0', 0.33, 0.29, 0.36);
      for (const [x, c] of [[0.27, '#e8e0cc'], [0.33, '#5a7aa8'], [0.39, '#d07a5a']] as const)
        add(g, new THREE.PlaneGeometry(0.045, 0.07), c, x, 0.25, 0.36, { side: THREE.DoubleSide });
      break;
    }
    case 'monument': {
      // A stone obelisk on stepped plinths, with a gilded tip and flower beds at its foot.
      add(g, new THREE.BoxGeometry(0.8, 0.08, 0.8), shadeOf(wall, 0.82), 0, 0.04, 0);
      add(g, new THREE.BoxGeometry(0.6, 0.1, 0.6), shadeOf(wall, 0.92), 0, 0.13, 0);
      add(g, new THREE.BoxGeometry(0.42, 0.12, 0.42), wall, 0, 0.24, 0);
      add(g, new THREE.CylinderGeometry(0.1, 0.16, 1.1, 4, 1).rotateY(Math.PI / 4), wall, 0, 0.85, 0);
      add(g, new THREE.ConeGeometry(0.1, 0.18, 4).rotateY(Math.PI / 4), roof, 0, 1.49, 0, { emissive: roof, emissiveIntensity: 0.25 });
      for (const [x, z] of [[-0.33, 0.33], [0.33, 0.33], [-0.33, -0.33], [0.33, -0.33]]) {
        add(g, new THREE.BoxGeometry(0.12, 0.04, 0.12), '#5f8a3a', x, 0.1, z);
        add(g, new THREE.SphereGeometry(0.03, 6, 5), '#e07a8a', x, 0.13, z);
      }
      break;
    }
    default:
      hut(g, model, type, wall, roof);
  }
  mergeModel(g, [model.cloth, model.sails, model.spin]);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(type), depthTest: false, transparent: true }));
  icon.scale.setScalar(0.3);
  icon.renderOrder = 12;
  if (type !== 'hq') {
    icon.position.y = iconY(type);
    g.add(icon);
    model.icon = icon;
  }
  model.smoke = [0, 1, 2].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: '#e8e8e8', transparent: true, depthWrite: false }));
    s.visible = false;
    g.add(s);
    return s;
  });
  return model;
}

export function noRoadSign() {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noRoadTex(), depthTest: false, transparent: true }));
  s.scale.setScalar(0.4);
  s.renderOrder = 13;
  return s;
}

export function iconTex(type: BType) {
  let t = icons.get(type);
  if (!t) icons.set(type, (t = iconTexture(BDEFS[type].icon)));
  return t;
}

export function ghostify(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.material = (m.material as THREE.Material).clone();
    Object.assign(m.material, { transparent: true, opacity: 0.55, depthWrite: false });
    m.castShadow = false;
  });
  g.visible = false;
}

export function makeFlag(): Model {
  const g = new THREE.Group();
  add(g, new THREE.DodecahedronGeometry(0.045, 0).scale(1, 0.5, 1), '#9d958a', 0, 0.01, 0);
  add(g, new THREE.CylinderGeometry(0.013, 0.017, 0.58, 6), '#5a3c22', 0, 0.29, 0);
  add(g, new THREE.SphereGeometry(0.022, 8, 6), '#f0c030', 0, 0.59, 0, { metalness: 0.5, roughness: 0.4 });
  const pennant = new THREE.Shape([new THREE.Vector2(0, 0.075), new THREE.Vector2(0.25, 0.075), new THREE.Vector2(0.19, 0), new THREE.Vector2(0.25, -0.075), new THREE.Vector2(0, -0.075)]);
  const cloth = add(g, new THREE.ShapeGeometry(pennant), ART.flag, 0, 0.49, 0, { side: THREE.DoubleSide });
  add(cloth, new THREE.PlaneGeometry(0.25, 0.022).translate(0.1, 0.06, 0.001), '#f0c030', 0, 0, 0, { side: THREE.DoubleSide });
  mergeModel(g, [cloth]);
  return { g, key: 'flag', cloth };
}
