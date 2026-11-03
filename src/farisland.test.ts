// The far island: a third island farther out than the second one, to one side of the bay, with
// coal and iron ore in its mountain. Older maps have no far island.
import { describe, expect, test } from 'bun:test';
import { World } from './world';
import { HUGE_SIZE as W } from './land/size';

const H = W;

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];

// The tiles of the land piece that holds (x, y), as a set of tile indexes.
function landAt(w: World, x: number, y: number) {
  const seen = new Set([y * W + x]);
  const todo = [y * W + x];
  while (todo.length) {
    const j = todo.pop()!, cx = j % W, cy = Math.floor(j / W);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
        if (!w.inside(nx, ny) || seen.has(k) || w.tiles[k].t === 'water') continue;
        seen.add(k);
        todo.push(k);
      }
  }
  return seen;
}

const at = (i: number) => ({ x: i % W, y: Math.floor(i / W) });
const gap = (a: Set<number>, b: Set<number>) => {
  let d = Infinity;
  for (const i of a) for (const j of b) d = Math.min(d, Math.hypot(at(i).x - at(j).x, at(i).y - at(j).y));
  return d;
};

describe('far island', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed);
      const far = w.far!;
      const island = landAt(w, Math.round(far.x), Math.round(far.y));
      const home = landAt(w, w.start.x, w.start.y);
      const isle = landAt(w, Math.round(w.isle!.x), Math.round(w.isle!.y));
      const fromStart = (i: number) => Math.hypot(at(i).x - w.start.x, at(i).y - w.start.y);

      test('is land of its own, big enough for a small settlement', () => {
        expect(w.at(Math.round(far.x), Math.round(far.y)).t).not.toBe('water');
        expect(island.size).toBeGreaterThanOrEqual(80);
        expect(island.has(w.start.y * W + w.start.x)).toBe(false);
      });

      test('lies farther from the start than the second island', () => {
        const nearest = (s: Set<number>) => Math.min(...[...s].map(fromStart));
        expect(nearest(island)).toBeGreaterThan(nearest(isle));
      });

      test('keeps at least 3 tiles of water from the home island and the second island', () => {
        expect(gap(island, home)).toBeGreaterThanOrEqual(3);
        expect(gap(island, isle)).toBeGreaterThanOrEqual(3);
      });

      test('has a sandy beach and trees', () => {
        // A pine island has sea cliffs instead of sand on its far shore, so its beach is shorter.
        expect([...island].filter((i) => w.tiles[i].t === 'sand').length).toBeGreaterThanOrEqual(6);
        // A meadow island has trees only in its small grove. The land comes out a little different
        // on Linux and on a Mac, so the grove can hold as few as 4 trees.
        expect([...island].filter((i) => w.tiles[i].tree).length).toBeGreaterThanOrEqual(3);
      });

      test('has a mountain, and every mountain tile on it holds ore, except sea cliffs', () => {
        const mountains = [...island].filter((i) => w.tiles[i].t === 'mountain' && !w.cliff[i]);
        expect(mountains.length).toBeGreaterThanOrEqual(6);
        for (const i of mountains) expect(w.hasOre(at(i).x, at(i).y)).toBe(true);
      });

      test('is found by isleAt, and the second island too', () => {
        for (const i of island) expect(w.isleAt(at(i).x, at(i).y)).toBe('far');
        for (const i of isle) expect(w.isleAt(at(i).x, at(i).y)).toBe('other');
        for (const i of home) expect(w.isleAt(at(i).x, at(i).y)).toBeNull();
      });

      test('stays inside the map', () => {
        for (const i of island) {
          expect(at(i).x).toBeGreaterThan(0);
          expect(at(i).y).toBeGreaterThan(0);
          expect(at(i).x).toBeLessThan(W - 1);
          expect(at(i).y).toBeLessThan(H - 1);
        }
      });
    });

  test('older map versions have no far island', () => {
    for (const map of [1, 4, 5, 6]) expect(new World(1, map).far).toBeNull();
  });

  test('older map versions keep their land, with no tile on the far island', () => {
    const old = new World(1, 6), now = new World(1);
    const far = now.far!;
    expect(old.far).toBeNull();
    expect(old.isleAt(Math.round(far.x), Math.round(far.y))).toBeNull();
  });
});
