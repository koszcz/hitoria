import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BUILDABLE } from '../game';
import { ghostify, makeBuilding, type Paint } from './buildings';
import { glowAt, setGlow, glowLooks } from './glow';
import { GLASS, mat } from './kit';

const paint: Paint = { icon: () => new THREE.Texture(), dot: () => new THREE.Texture() };
const NOON = 0.5, MIDNIGHT = 0, DUSK = 0.75, DAWN = 0.25;

describe('glowAt', () => {
  test('is off by day and full at night', () => {
    expect(glowAt(NOON)).toBe(0);
    expect(glowAt(0.4)).toBe(0);
    expect(glowAt(MIDNIGHT)).toBe(1);
    expect(glowAt(0.9)).toBe(1);
  });

  test('fades in through dusk and out through dawn', () => {
    const dusk = [0.66, 0.7, DUSK, 0.77, 0.8].map(glowAt);
    for (let i = 1; i < dusk.length; i++) expect(dusk[i]).toBeGreaterThan(dusk[i - 1]);
    const dawn = [0.2, 0.23, DAWN, 0.28, 0.33].map(glowAt);
    for (let i = 1; i < dawn.length; i++) expect(dawn[i]).toBeLessThan(dawn[i - 1]);
    expect(glowAt(DUSK)).toBeCloseTo(0.5, 5);
    expect(glowAt(DAWN)).toBeCloseTo(0.5, 5);
  });

  test('uses only the time of day, not the day count', () => {
    expect(glowAt(7 + NOON)).toBe(0);
    expect(glowAt(7 + MIDNIGHT)).toBe(1);
    expect(glowAt(3 + DUSK)).toBeCloseTo(glowAt(DUSK), 9);
  });
});

const glowParts = (g: THREE.Object3D) => {
  const out: THREE.Object3D[] = [];
  g.traverse((o) => { if (o.userData.glow) out.push(o); });
  return out;
};

describe('building glow', () => {
  test('every finished building has a pool of light on the ground', () => {
    for (const t of ['hq', ...BUILDABLE] as const) {
      const pool = glowParts(makeBuilding(t, true, paint).g).filter((o) => o.userData.glow === 'pool');
      expect(pool).toHaveLength(1);
      expect(pool[0].position.y).toBeLessThan(0.1);
    }
  });

  test('a building site has no glow', () => {
    expect(glowParts(makeBuilding('woodcutter', false, paint).g)).toEqual([]);
  });

  test('a house glows at its doorway', () => {
    const door = glowParts(makeBuilding('house', true, paint).g).filter((o) => o.userData.glow === 'door');
    expect(door).toHaveLength(1);
    expect(door[0].position.z).toBeGreaterThan(0); // the door faces +Z
  });

  test('the placing ghost never glows', () => {
    const g = makeBuilding('house', true, paint).g;
    ghostify(g);
    for (const o of glowParts(g)) expect(o.visible).toBe(false);
  });
});

describe('setGlow', () => {
  test('hides the glow by day, and shows it at night', () => {
    const { pool, door } = glowLooks(paint.dot());
    setGlow(0);
    expect(pool.visible).toBe(false);
    expect(door.visible).toBe(false);
    setGlow(1);
    expect(pool.visible).toBe(true);
    expect(door.visible).toBe(true);
    expect(pool.opacity).toBeGreaterThan(0.3);
  });

  test('windows glow brighter at night than by day', () => {
    const glass = mat('#ffd88a', GLASS) as THREE.MeshStandardMaterial;
    setGlow(0);
    const day = glass.emissiveIntensity;
    setGlow(1);
    expect(glass.emissiveIntensity).toBeGreaterThan(day * 3);
    setGlow(0);
    expect(glass.emissiveIntensity).toBe(day);
  });
});
