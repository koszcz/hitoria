// White foam where the sea meets the land: a fringe along the waterline, and small waves that
// roll in toward the beach and fade.
import * as THREE from 'three';
import { World, W, H } from '../world';
import { shoreBand } from '../water/shore';
import { noiseField } from './textures';
import { SEA, type Terrain } from './terrain';

const STEPS = 4; // each shore tile is split into this many strips each way, so the foam follows the waterline
const LIFT = 0.006; // the foam floats just above the sea, so it never flickers with it

export class Foam {
  private mesh: THREE.Mesh | null = null;
  private time = { value: 0 };
  private mat = foamMaterial(this.time);

  constructor(private scene: THREE.Scene) {}

  // Lays the foam over every tile where water touches land. `ground` gives the depth below the sea.
  build(world: World, ground: Terrain) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    const tiles = shoreBand(world, W, H), n = STEPS + 1;
    const pos = new Float32Array(tiles.length * n * n * 3), depth = new Float32Array(tiles.length * n * n);
    const idx: number[] = [];
    tiles.forEach((t, k) => {
      const tx = t % W, ty = Math.floor(t / W), base = k * n * n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = tx + i / STEPS, z = ty + j / STEPS, v = base + j * n + i;
          pos.set([x, SEA + LIFT, z], v * 3);
          depth[v] = SEA - ground.heightAt(x, z);
        }
      for (let j = 0; j < STEPS; j++)
        for (let i = 0; i < STEPS; i++) {
          const a = base + j * n + i, b = a + 1, c = a + n, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    geo.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 1;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  animate(now: number) {
    this.time.value = now;
  }
}

// Foam is white and lit like the land, so it dims at night. Its shape is worked out per pixel
// from the water's depth there, so the waves follow the true shape of the beach.
function foamMaterial(time: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ color: '#f4f8f4', roughness: 1, transparent: true, depthWrite: false, alphaMap: breakup() });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = time;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float depth;\nvarying float vDepth;\nvarying vec2 vSpot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = depth;\nvSpot = position.xz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vDepth;\nvarying vec2 vSpot;')
      .replace('#include <alphamap_fragment>', `
        float grain = texture2D(alphaMap, vSpot * 0.21 + vec2(uTime * 0.01, 0.0)).g;
        float grain2 = texture2D(alphaMap, vSpot * 0.6 - vec2(0.0, uTime * 0.02)).g;
        // A steady fringe right at the waterline, breathing in and out a little.
        float lap = 0.012 + sin(uTime * 1.3 + grain * 6.0) * 0.008;
        float fringe = smoothstep(-0.004, 0.006, vDepth) * (1.0 - smoothstep(lap, lap + 0.05, vDepth));
        // A wave rolls in from deeper water every few seconds, starting at different times along the coast.
        float phase = fract(uTime * 0.18 + grain * 1.7);
        float front = (1.0 - phase) * 0.18;
        float wave = (1.0 - smoothstep(0.0, 0.022, abs(vDepth - front))) * smoothstep(0.0, 0.3, phase) * (1.0 - phase);
        float foam = max(fringe * 0.85, wave * 0.5) * smoothstep(0.25, 0.6, grain2 + 0.25);
        diffuseColor.a *= foam * step(-0.004, vDepth);`);
  };
  return m;
}

// A soft noise texture that breaks the foam into flecks instead of solid lines.
function breakup() {
  const n = 128, f = noiseField(n, 33);
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = Math.max(0, Math.min(255, f[i] * 255));
    data.set([v, v, v, 255], i * 4);
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
