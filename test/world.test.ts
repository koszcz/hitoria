import { describe, expect, test } from 'bun:test';
import { World, W, H, rng } from '../src/world';
import { toIso, fromIso } from '../src/iso';

describe('rng', () => {
  test('gives the same numbers for the same seed', () => {
    const a = rng(42), b = rng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  test('stays in [0, 1)', () => {
    const r = rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('World', () => {
  test('builds the same map from the same seed', () => {
    expect(new World(123).tiles).toEqual(new World(123).tiles);
  });

  test('builds different maps from different seeds', () => {
    expect(new World(1).tiles).not.toEqual(new World(2).tiles);
  });

  // Every seed must be playable: flat land at the start, plus trees and stone close by.
  for (const seed of [1, 2, 3, 99, 12345, 987654321]) {
    test(`seed ${seed} starts on grass with trees and boulders nearby`, () => {
      const w = new World(seed);
      expect(w.tiles).toHaveLength(W * H);
      const { x: sx, y: sy } = w.start;
      let trees = 0, rocks = 0;
      for (let y = sy - 9; y <= sy + 9; y++)
        for (let x = sx - 9; x <= sx + 9; x++) {
          const t = w.at(x, y);
          if (Math.hypot(x - sx, y - sy) < 3.5) {
            expect(t.t).toBe('grass');
            expect(t.tree).toBe(0);
            expect(t.rock).toBe(0);
          }
          if (t.tree) trees++;
          if (t.rock) rocks++;
        }
      expect(trees).toBeGreaterThanOrEqual(5);
      expect(rocks).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('isometric projection', () => {
  test('fromIso undoes toIso', () => {
    for (const [x, y] of [[0, 0], [3, 7], [12.5, 0.25], [-4, 9]]) {
      const back = fromIso(toIso(x, y).x, toIso(x, y).y);
      expect(back.x).toBeCloseTo(x);
      expect(back.y).toBeCloseTo(y);
    }
  });
});
