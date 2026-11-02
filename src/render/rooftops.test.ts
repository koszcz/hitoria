import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BUILDABLE } from '../game';
import { makeBuilding, type Paint } from './buildings';
import { GLASS_MATS } from './kit';
import { makePerson } from './people';
import { roofSnow, isSnowy } from './rooftops';
import { setSeason } from './seasonal';
import { seasonLook } from '../seasons/year';

const paint: Paint = { icon: () => new THREE.Texture(), dot: () => new THREE.Texture() };

const solids = (g: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.Material).type === 'MeshStandardMaterial') out.push(m);
  });
  return out;
};

describe('roofSnow', () => {
  test('a flat top is white in deep winter and bare with no snow', () => {
    expect(roofSnow(1, 1)).toBeCloseTo(0.92, 5);
    expect(roofSnow(1, 0)).toBe(0);
  });

  test('walls never hold snow', () => {
    expect(roofSnow(0, 1)).toBe(0);
    expect(roofSnow(-1, 1)).toBe(0);
  });

  test('a steep cottage roof still holds most of the snow', () => {
    // The cottage roof rises 0.32 over a half-depth of 0.12 plus its eaves.
    const up = Math.cos(Math.atan2(0.32, 0.15));
    expect(roofSnow(up, 1)).toBeGreaterThan(0.7);
  });

  test('snow on roofs grows with the snow on the ground', () => {
    const levels = [0, 0.2, 0.4, 0.6].map((s) => roofSnow(1, s));
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1]);
  });
});

describe('snow on buildings', () => {
  test('every solid part of every building can catch snow, except the windows', () => {
    for (const t of ['hq', ...BUILDABLE] as const)
      for (const built of [true, false])
        for (const m of solids(makeBuilding(t, built, paint).g)) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (GLASS_MATS.has(mat) || mat.transparent) expect(isSnowy(mat)).toBe(false);
          else expect(isSnowy(mat)).toBe(true);
        }
  });

  test('the windows keep their night glow', () => {
    const glass = solids(makeBuilding('house', true, paint).g).filter((m) => GLASS_MATS.has(m.material as THREE.MeshStandardMaterial));
    expect(glass.length).toBeGreaterThan(0);
  });

  test('buildings share their snowy materials', () => {
    const a = solids(makeBuilding('house', true, paint).g).map((m) => m.material);
    const b = solids(makeBuilding('house', true, paint).g).map((m) => m.material);
    expect(b).toEqual(a);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]);
  });

  test('settlers stay free of snow', () => {
    for (const m of solids(makePerson('carrier').g)) expect(isSnowy(m.material as THREE.Material)).toBe(false);
  });

  test('the snow on roofs follows the season', () => {
    const roof = solids(makeBuilding('house', true, paint).g).find((m) => isSnowy(m.material as THREE.Material))!;
    const shader = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' };
    (roof.material as THREE.Material).onBeforeCompile(shader as never, null as never);
    setSeason({ ...seasonLook(0), snow: 0.7 });
    expect(shader.uniforms.uSnow.value).toBe(0.7);
    setSeason({ ...seasonLook(0), snow: 0 });
    expect(shader.uniforms.uSnow.value).toBe(0);
    expect(shader.fragmentShader).toContain('uSnowCol');
  });
});
