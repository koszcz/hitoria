// The warm tint that a building's pool of light paints on its own walls at night: brightest near
// the ground and the door, fading toward the roof. Each vertex stores how lit it is, and one
// shared uniform fades every building in and out with the night glow.
import * as THREE from 'three';

// Walls are fully lit at the ground and dark from TOP up, which is about where roofs start.
const TOP = 0.55;
// The door adds light within NEAR of the doorway, fading out by FAR.
const NEAR = 0.04, FAR = 0.42;
const GROUND = 0.75, DOOR = 0.5;
const STRENGTH = 0.45; // how strongly a fully lit wall takes the warm colour at full night glow
const WARM = '#ffb45a';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// How lit a point on a building is, from 0 to 1. `y` is its height above the ground, and `door`
// is how far it is from the doorway, or undefined if the building has no door.
export function wallLight(y: number, door?: number) {
  const ground = GROUND * (1 - smooth(0, TOP, y));
  const near = door === undefined ? 0 : DOOR * (1 - smooth(NEAR, FAR, door));
  return Math.min(1, ground + near);
}

export const WALL_UNIFORMS = {
  uWallGlow: { value: 0 },
  uWallCol: { value: new THREE.Color(WARM) },
};

// Sets the tint on every building's walls, from 0 (none) to 1 (full night glow).
export function setWallGlow(k: number) {
  WALL_UNIFORMS.uWallGlow.value = STRENGTH * k;
}

export const LIT = 'wallLight';

// Stores how lit each vertex is in the `wallLight` attribute of every mesh in a finished
// building. `door` is the doorway in the building's own space.
export function lightWalls(root: THREE.Object3D, door?: THREE.Vector3) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4(), p = new THREE.Vector3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
    rel.multiplyMatrices(inv, mesh.matrixWorld);
    const pos = mesh.geometry.attributes.position;
    const lit = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(rel);
      lit[i] = wallLight(p.y, door ? p.distanceTo(door) : undefined);
    }
    mesh.geometry.setAttribute(LIT, new THREE.BufferAttribute(lit, 1));
  });
}

// Adds the wall tint to a building material's shader. The tint is warm light bouncing off the
// wall, so it takes the wall's own colour, and it shows even where the night is dark.
export function tintWalls(s: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }) {
  Object.assign(s.uniforms, WALL_UNIFORMS);
  s.vertexShader = s.vertexShader
    .replace('#include <common>', `#include <common>\nattribute float ${LIT};\nvarying float vWallLight;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvWallLight = ${LIT};`);
  s.fragmentShader = s.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uWallGlow;\nuniform vec3 uWallCol;\nvarying float vWallLight;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uWallCol * diffuseColor.rgb * vWallLight * uWallGlow;`);
}
