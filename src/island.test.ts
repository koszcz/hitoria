import { describe, expect, test } from 'bun:test';
import { World, W, H } from './world';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
// The HQ's land reaches 9 tiles.
const LAND = 9;

// Every piece of land on the map, as lists of tile indexes. Land touching sideways or diagonally is one piece.
function landmasses(w: World) {
  const seen = new Set<number>();
  const pieces: number[][] = [];
  for (let i = 0; i < W * H; i++) {
    if (seen.has(i) || w.tiles[i].t === 'water') continue;
    const piece: number[] = [];
    const todo = [i];
    seen.add(i);
    while (todo.length) {
      const j = todo.pop()!;
      piece.push(j);
      const x = j % W, y = Math.floor(j / W);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = (y + dy) * W + x + dx;
          if (!w.inside(x + dx, y + dy) || seen.has(k) || w.tiles[k].t === 'water') continue;
          seen.add(k);
          todo.push(k);
        }
    }
    pieces.push(piece);
  }
  return pieces;
}

function islands(w: World) {
  const home = w.start.y * W + w.start.x;
  const pieces = landmasses(w);
  return { home: pieces.find((p) => p.includes(home))!, others: pieces.filter((p) => !p.includes(home)) };
}

const distance = (a: number, b: number) => Math.hypot((a % W) - (b % W), Math.floor(a / W) - Math.floor(b / W));

describe('second island', () => {
  for (const seed of SEEDS) {
    describe(`seed ${seed}`, () => {
      const w = new World(seed);
      const { home, others } = islands(w);
      const island = others.sort((a, b) => b.length - a.length)[0] ?? [];
      const start = w.start.y * W + w.start.x;

      test('has a second island big enough for a small settlement', () => {
        expect(island.length).toBeGreaterThanOrEqual(80);
      });

      test('puts the island outside the HQ land, but near it', () => {
        const nearest = Math.min(...island.map((i) => distance(i, start)));
        expect(nearest).toBeGreaterThan(LAND);
        expect(nearest).toBeLessThan(20);
      });

      test('keeps at least 3 tiles of water between the island and the home island', () => {
        let gap = Infinity;
        for (const i of island) for (const j of home) gap = Math.min(gap, distance(i, j));
        expect(gap).toBeGreaterThanOrEqual(3);
      });

      test('gives the island a sandy beach and trees', () => {
        expect(island.filter((i) => w.tiles[i].t === 'sand').length).toBeGreaterThanOrEqual(8);
        expect(island.filter((i) => w.tiles[i].tree).length).toBeGreaterThanOrEqual(5);
      });
    });
  }

  test('older map versions have no second island', () => {
    for (const map of [1, 2, 3]) {
      const w = new World(1, map);
      expect(islands(w).others.every((p) => p.length < 80)).toBe(true);
    }
  });
});
