// The warm glow of buildings at night: a soft pool of light on the ground, a bright doorway and
// brighter windows, and a warm tint on the walls (`walllight.ts`). It is a painted fake, not real
// lamps, so it costs almost nothing to draw.
import * as THREE from 'three';
import type { Model } from './buildings';
import { GLASS, GLASS_MATS } from './kit';
import { setWallGlow } from './walllight';

// Day fraction where the glow starts and ends its fade. 0 is midnight, 0.25 dawn, 0.75 dusk.
const DUSK_FROM = 0.66, DUSK_TO = 0.84;
const DAWN_FROM = 0.16, DAWN_TO = 0.34;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// How strong the glow is at a time of day: 0 by day, 1 at night, fading at dawn and dusk.
export function glowAt(day: number) {
  const f = day - Math.floor(day);
  if (f >= 0.5) return smooth((f - DUSK_FROM) / (DUSK_TO - DUSK_FROM));
  return 1 - smooth((f - DAWN_FROM) / (DAWN_TO - DAWN_FROM));
}

const WARM = '#ffb45a';
const POOL_OPACITY = 0.9, DOOR_OPACITY = 0.9;
const NIGHT_GLASS = 1.6; // window glow at night; by day it is GLASS.emissiveIntensity

// One pair of materials for every building, so the glow changes for all of them at once.
let looks: { pool: THREE.MeshBasicMaterial; door: THREE.SpriteMaterial } | undefined;
export function glowLooks(dot: THREE.Texture) {
  return (looks ??= {
    pool: new THREE.MeshBasicMaterial({ map: dot, color: WARM, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, visible: false }),
    door: new THREE.SpriteMaterial({ map: dot, color: WARM, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, visible: false }),
  });
}

// Adds the pool of light under a finished building, and a glow in its doorway if it has one.
export function addGlow(model: Model, dot: THREE.Texture) {
  const { pool, door } = glowLooks(dot);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), pool);
  ground.position.set(0, 0.04, 0.12); // a little toward the door, which faces +Z
  ground.renderOrder = 1;
  ground.userData.glow = 'pool';
  model.g.add(ground);
  if (!model.door) return;
  const light = new THREE.Sprite(door);
  light.position.copy(model.door);
  light.scale.setScalar(0.32);
  light.userData.glow = 'door';
  model.g.add(light);
}

// Sets the glow of every building, from 0 (none) to 1 (full night glow).
export function setGlow(k: number) {
  if (looks) {
    looks.pool.visible = looks.door.visible = k > 0.001;
    looks.pool.opacity = POOL_OPACITY * k;
    looks.door.opacity = DOOR_OPACITY * k;
  }
  setWallGlow(k);
  for (const m of GLASS_MATS) m.emissiveIntensity = GLASS.emissiveIntensity + (NIGHT_GLASS - GLASS.emissiveIntensity) * k;
}
