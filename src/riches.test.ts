// Island riches: coal and iron ore lie only in the second island's mountains. Older maps keep
// ore in every mountain, so old saves keep the mines they could build.
import { describe, expect, test } from 'bun:test';
import { World } from './world';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];

// The tiles of the land piece that holds (x, y), as a set of tile indexes.
function landAt(w: World, x: number, y: number) {
  const W = w.w;
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

const all = (w: World, f: (x: number, y: number) => void) => {
  for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) f(x, y);
};

describe('island riches', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed);
      const home = landAt(w, w.start.x, w.start.y);

      test('the second island has mountains, and every one holds ore, except sea cliffs', () => {
        let rich = 0;
        all(w, (x, y) => {
          if (home.has(y * w.w + x) || w.at(x, y).t !== 'mountain' || w.cliff[y * w.w + x]) return;
          expect(w.hasOre(x, y)).toBe(true);
          rich++;
        });
        expect(rich).toBeGreaterThanOrEqual(6);
      });

      test('the home island has stone only', () => {
        all(w, (x, y) => {
          if (home.has(y * w.w + x)) expect(w.hasOre(x, y)).toBe(false);
        });
      });

      test('only mountains hold ore', () => {
        all(w, (x, y) => {
          if (w.at(x, y).t !== 'mountain') expect(w.hasOre(x, y)).toBe(false);
        });
      });
    });

  test('older maps keep ore in every mountain', () => {
    for (const map of [1, 2, 3, 4]) {
      const w = new World(1, map);
      let mountains = 0;
      all(w, (x, y) => {
        if (w.at(x, y).t !== 'mountain') return;
        mountains++;
        expect(w.hasOre(x, y)).toBe(true);
      });
      expect(mountains).toBeGreaterThan(0);
    }
  });
});
