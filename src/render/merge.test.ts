import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BUILDABLE } from '../game';
import { add } from './kit';
import { mergeModel } from './merge';
import { makeBuilding, makeFlag } from './buildings';
import { makePerson } from './people';

// Building signs are drawn on a canvas. Tests have no DOM, so give them one that ignores drawing.
const ctx: object = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => ctx), set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ getContext: () => ctx }) };

const meshes = (o: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) out.push(c as THREE.Mesh); });
  return out;
};
const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);

describe('mergeModel', () => {
  test('joins meshes with plain materials into one, and keeps their colours and places', () => {
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 0, 0, 0);
    add(g, new THREE.BoxGeometry(1, 1, 1), '#0000ff', 3, 0, 0).rotation.y = 1;
    const before = box(g);
    mergeModel(g, []);
    const m = meshes(g);
    expect(m).toHaveLength(1);
    expect(box(g).min.distanceTo(before.min)).toBeLessThan(1e-6);
    expect(box(g).max.distanceTo(before.max)).toBeLessThan(1e-6);
    const col = m[0].geometry.attributes.color;
    const reds = new Set<number>();
    for (let i = 0; i < col.count; i++) reds.add(Math.round(col.getX(i) * 100));
    expect(reds.size).toBe(2); // one red part, one blue part
    expect(m[0].castShadow && m[0].receiveShadow).toBe(true);
  });

  test('keeps materials with different settings apart', () => {
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 0, 0, 0);
    add(g, new THREE.BoxGeometry(1, 1, 1), '#00ff00', 1, 0, 0);
    add(g, new THREE.BoxGeometry(1, 1, 1), '#ffff00', 2, 0, 0, { emissive: '#ffa040' });
    mergeModel(g, []);
    expect(meshes(g)).toHaveLength(2);
  });

  test('leaves moving parts as their own objects, and merges what hangs under them', () => {
    const g = new THREE.Group(), arm = new THREE.Group();
    g.add(arm);
    add(g, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 0, 0, 0);
    add(g, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 1, 0, 0);
    add(arm, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 0, 1, 0);
    add(arm, new THREE.BoxGeometry(1, 1, 1), '#ff0000', 0, 2, 0);
    mergeModel(g, [arm]);
    expect(meshes(g)).toHaveLength(2);
    expect(arm.parent).toBe(g);
    expect(meshes(arm)).toHaveLength(1);
    arm.rotation.z = 1; // still turns its own parts
    arm.updateMatrixWorld(true);
    expect(box(arm).max.x).toBeLessThan(0);
  });
});

describe('models', () => {
  test('every building is drawn with only a few meshes', () => {
    for (const t of ['hq', ...BUILDABLE] as const) {
      expect(meshes(makeBuilding(t, true).g).length).toBeLessThanOrEqual(8);
      expect(meshes(makeBuilding(t, false).g).length).toBeLessThanOrEqual(4);
    }
  });

  test('a building keeps its moving parts', () => {
    const mill = makeBuilding('mill', true);
    expect(mill.sails?.parent).toBe(mill.g);
    expect(meshes(mill.sails!).length).toBeGreaterThan(0);
    const site = makeBuilding('woodcutter', false);
    expect(meshes(site.rise!)).toHaveLength(1);
  });

  test('a settler is drawn with a few meshes and still moves its limbs', () => {
    const p = makePerson('woodcutter');
    expect(meshes(p.g).length).toBeLessThanOrEqual(7);
    for (const limb of [...p.legs, ...p.arms]) expect(meshes(limb).length).toBeGreaterThan(0);
  });

  test('a flag keeps its waving cloth', () => {
    const f = makeFlag();
    expect(meshes(f.cloth!).length).toBeGreaterThan(0);
    expect(meshes(f.g).length).toBeLessThanOrEqual(4);
  });
});
