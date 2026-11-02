import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BUILDABLE } from '../game';
import { makeBuilding, type Paint } from './buildings';
import { setGlow } from './glow';
import { makePerson } from './people';
import { hasLitWalls } from './rooftops';
import { LIT, WALL_UNIFORMS, tintWalls, wallLight } from './walllight';

const paint: Paint = { icon: () => new THREE.Texture(), dot: () => new THREE.Texture() };

const meshes = (g: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) out.push(m);
  });
  return out;
};

describe('wallLight', () => {
  test('is brightest at the ground and fades toward the roof', () => {
    const heights = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((y) => wallLight(y));
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThan(heights[i - 1]);
    expect(wallLight(0)).toBe(0.75);
    expect(wallLight(0.55)).toBe(0);
    expect(wallLight(1.2)).toBe(0);
  });

  test('the doorway adds light, which fades with distance from it', () => {
    expect(wallLight(0.3, 0)).toBeGreaterThan(wallLight(0.3));
    expect(wallLight(0.3, 0.1)).toBeGreaterThan(wallLight(0.3, 0.3));
    expect(wallLight(0.3, 0.42)).toBe(wallLight(0.3));
    expect(wallLight(0.6, 0)).toBe(0.5);
  });

  test('never passes 1', () => {
    expect(wallLight(0, 0)).toBe(1);
  });
});

describe('lit walls', () => {
  test('every solid part of a finished building knows how lit it is', () => {
    for (const t of ['hq', ...BUILDABLE] as const)
      for (const m of meshes(makeBuilding(t, true, paint).g)) {
        const mat = m.material as THREE.Material;
        if (!hasLitWalls(mat)) continue;
        const lit = m.geometry.attributes[LIT];
        expect(lit.count).toBe(m.geometry.attributes.position.count);
      }
  });

  test('a finished house has lit walls, brighter by its door than up on its roof', () => {
    const house = makeBuilding('house', true, paint);
    const lit = meshes(house.g).filter((m) => hasLitWalls(m.material as THREE.Material));
    expect(lit.length).toBeGreaterThan(0);
    let low = 0, high = 1;
    const p = new THREE.Vector3();
    for (const m of lit) {
      const pos = m.geometry.attributes.position, l = m.geometry.attributes[LIT];
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (p.distanceTo(house.door!) < 0.2) low = Math.max(low, l.getX(i));
        if (p.y > 0.7) high = Math.min(high, l.getX(i));
      }
    }
    expect(low).toBeGreaterThan(0.6);
    expect(high).toBe(0);
  });

  test('a building site and settlers do not take the glow', () => {
    for (const m of meshes(makeBuilding('woodcutter', false, paint).g)) expect(hasLitWalls(m.material as THREE.Material)).toBe(false);
    for (const m of meshes(makePerson('carrier').g)) expect(hasLitWalls(m.material as THREE.Material)).toBe(false);
  });

  test('lit and plain materials compile to different shaders', () => {
    const lit = meshes(makeBuilding('house', true, paint).g).find((m) => hasLitWalls(m.material as THREE.Material))!;
    const plain = meshes(makeBuilding('house', false, paint).g)[0];
    const a = (lit.material as THREE.Material).customProgramCacheKey();
    const b = (plain.material as THREE.Material).customProgramCacheKey();
    expect(a).not.toBe(b);
  });

  test('the shader reads the light and the shared glow', () => {
    const s = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' };
    tintWalls(s);
    expect(s.vertexShader).toContain(`attribute float ${LIT}`);
    expect(s.fragmentShader).toContain('totalEmissiveRadiance');
    expect(s.uniforms.uWallGlow).toBe(WALL_UNIFORMS.uWallGlow);
  });

  test('the tint fades in and out with the night glow', () => {
    setGlow(0);
    expect(WALL_UNIFORMS.uWallGlow.value).toBe(0);
    setGlow(1);
    const night = WALL_UNIFORMS.uWallGlow.value;
    expect(night).toBe(0.45);
    setGlow(0.5);
    expect(WALL_UNIFORMS.uWallGlow.value).toBeCloseTo(night / 2, 9);
    setGlow(0);
  });
});
