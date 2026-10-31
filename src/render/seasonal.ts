// Shader changes that show the season on trees and ground: autumn leaves, bare branches,
// dry or fresh grass, and snow on whatever faces the sky.
import * as THREE from 'three';
import { ART } from '../art';
import type { SeasonLook } from '../seasons/year';

// Shared by every seasonal material, so one update a frame changes them all.
const U = {
  uAutumn: { value: 0 },
  uBare: { value: 0 },
  uSnow: { value: 0 },
  uDry: { value: 0 },
  uSnowCol: { value: new THREE.Color(ART.winter) },
};

export function setSeason(l: SeasonLook) {
  U.uAutumn.value = l.autumn;
  U.uBare.value = l.bare;
  U.uSnow.value = l.snow;
  U.uDry.value = l.dry;
}

// A leaf is any part of a tree model that is mostly green. Trunks are brown or white.
const LEAF = 'float vGreen = (color.g > color.r * 1.15 && color.g > color.b) ? 1.0 : 0.0;';

// `leafy` trees turn colour and drop their leaves. Firs stay green and only catch snow.
export function seasonTree(m: THREE.MeshStandardMaterial, leafy: boolean) {
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U, { uLeafy: { value: leafy ? 1 : 0 } });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uBare, uLeafy;\nvarying float vLeaf, vUp, vSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${LEAF}
        vLeaf = vGreen;
        vUp = objectNormal.y;
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        // Bare trees keep a thin, twiggy crown around the trunk.
        float fall = clamp(uBare * 1.5 - vSeed * 0.5, 0.0, 1.0) * uLeafy * vLeaf;
        transformed.xz *= 1.0 - 0.45 * fall;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAutumn, uBare, uSnow, uLeafy;\nuniform vec3 uSnowCol;\nvarying float vLeaf, vUp, vSeed;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        // Each tree turns a little earlier or later, to yellow, orange or red.
        float turn = clamp(uAutumn * 1.5 - vSeed * 0.5, 0.0, 1.0) * uLeafy * vLeaf;
        vec3 fallCol = vSeed < 0.33 ? vec3(0.9, 0.55, 0.06) : vSeed < 0.7 ? vec3(0.85, 0.28, 0.04) : vec3(0.62, 0.1, 0.04);
        diffuseColor.rgb = mix(diffuseColor.rgb, fallCol * (0.5 + lum * 1.6), turn);
        float bare = clamp(uBare * 1.5 - vSeed * 0.5, 0.0, 1.0) * uLeafy * vLeaf;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.11, 0.08), bare);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSnowCol, uSnow * smoothstep(0.15, 0.6, vUp) * 0.9);`);
  };
}

// Grass dries in autumn and is fresh in spring. Snow settles on flat land, in patches at first.
export function seasonGround(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vH, vUp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = (modelMatrix * vec4(transformed, 1.0)).y;\nvUp = objectNormal.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow, uDry;\nuniform vec3 uSnowCol;\nvarying float vH, vUp;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 c = diffuseColor.rgb;
        float grassy = c.g > c.r * 1.02 && c.g > c.b ? 0.7 : 0.0;
        vec3 tint = uDry > 0.0 ? vec3(1.3, 1.0, 0.55) : vec3(0.85, 1.12, 0.8);
        diffuseColor.rgb = mix(c, c * tint, abs(uDry) * grassy);
        float patches = texture2D(map, vMapUv * 0.13).r;
        float cover = smoothstep(patches * 0.6, patches * 0.6 + 0.2, uSnow) * step(0.02, vH) * smoothstep(0.5, 0.8, vUp);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSnowCol * (0.85 + patches * 0.2), cover);`);
  };
}
