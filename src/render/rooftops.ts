// Snow on buildings: in winter, roofs and other faces that look at the sky turn white, with the
// same snow level as the ground. Settlers share the plain materials, so they stay free of snow.
import * as THREE from 'three';
import { GLASS_MATS } from './kit';
import { SEASON_UNIFORMS } from './seasonal';

// A face holds no snow below FROM (how much its normal points up) and full snow above TO.
// A wall points sideways (0), a flat top straight up (1), a steep cottage roof about 0.4.
const FROM = 0.2, TO = 0.45;
const RATE = 1.25; // roofs are fully white a little before the ground is
const MAX = 0.92; // a little of the roof colour shows through

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// How white a face is, from 0 to MAX, given how much it points up and the snow on the ground.
export const roofSnow = (up: number, snow: number) => Math.min(1, snow * RATE) * smooth(FROM, TO, up) * MAX;

const num = (n: number) => n.toFixed(4);
const SNOWY = 'snowy';

function addRoofSnow(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, SEASON_UNIFORMS);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vRoofUp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoofUp = normalize(mat3(modelMatrix) * objectNormal).y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow;\nuniform vec3 uSnowCol;\nvarying float vRoofUp;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float roofCover = min(1.0, uSnow * ${num(RATE)}) * smoothstep(${num(FROM)}, ${num(TO)}, vRoofUp) * ${num(MAX)};
        diffuseColor.rgb = mix(diffuseColor.rgb, uSnowCol, roofCover);`);
  };
  m.userData[SNOWY] = true;
}

export const isSnowy = (m: THREE.Material) => m.userData[SNOWY] === true;

// One snowy copy of each plain material, shared by every building that uses it.
const copies = new Map<THREE.Material, THREE.MeshStandardMaterial>();
function snowyCopy(m: THREE.MeshStandardMaterial) {
  let c = copies.get(m);
  if (!c) {
    c = m.clone();
    addRoofSnow(c);
    copies.set(m, c);
  }
  return c;
}

// Lets every solid part of a building catch snow. Windows keep their glass, so they still glow
// at night, and see-through parts stay as they are.
export function snowOnTop(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (!m.isMeshStandardMaterial || isSnowy(m) || m.transparent || GLASS_MATS.has(m)) return;
    mesh.material = snowyCopy(m);
  });
}
