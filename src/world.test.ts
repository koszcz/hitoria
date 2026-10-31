import { describe, expect, test } from 'bun:test';
import { World, W, H, MAP_VERSION, rng } from './world';
import { toIso, fromIso } from './iso';

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

  // Saved games store only what changed on the map, so each map version must keep building
  // exactly the same land. These fingerprints come from the generator before map version 2.
  test('map version 1 builds the map from before the guaranteed mountain and bay', () => {
    // Farm fields came later and belong to the game, not the land, so they stay out of the fingerprint.
    const land = (seed: number) => new World(seed, 1).tiles.map(({ field: _, ...t }) => t);
    const fingerprint = (seed: number) => Bun.hash(JSON.stringify(land(seed))).toString();
    expect(fingerprint(1)).toBe('3576088837111545344');
    expect(fingerprint(12345)).toBe('4996496841631808014');
  });

  test('new maps use the latest map version', () => {
    expect(new World(1).tiles).toEqual(new World(1, MAP_VERSION).tiles);
    expect(new World(1).tiles).not.toEqual(new World(1, 1).tiles);
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

// The HQ's land reaches 9 tiles.
const LAND = 9;
const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];

function inLand(w: World, x: number, y: number) {
  return w.inside(x, y) && Math.hypot(x - w.start.x, y - w.start.y) <= LAND;
}

// Water in the HQ's land joins the map edge through water, so it is a bay, not a pond.
function bayJoinsSea(w: World) {
  const seen = new Set<number>();
  const todo: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inLand(w, x, y) && w.at(x, y).t === 'water') todo.push([x, y]);
  while (todo.length) {
    const [x, y] = todo.pop()!;
    if (!w.inside(x, y) || seen.has(y * W + x) || w.at(x, y).t !== 'water') continue;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return true;
    seen.add(y * W + x);
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return false;
}

describe('start near a mountain and shore', () => {
  for (const seed of SEEDS) {
    test(`seed ${seed} has a bay that joins the open sea`, () => {
      expect(bayJoinsSea(new World(seed))).toBe(true);
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
