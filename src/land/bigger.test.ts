// Bigger islands: from map version 13, the map is 128 by 128 tiles, and the second island and the
// far island are each about 32 tiles across, about half the home island's land. Both are the same
// size, with mountains, forests and ore that grow with them. Older maps keep their islands.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { BIG_FAR, BIG_ISLE, HUGE_ISLE, HUGE_ISLES_FROM, farShape, isleShape } from './isle';
import { HUGE_SIZE, mapSize } from './size';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const BEFORE = HUGE_ISLES_FROM - 1;

// Every land tile of one island, or of the home island when `isle` is null, as { x, y, i }.
function landOf(w: World, isle: IsleName | null) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < w.h; y++)
    for (let x = 0; x < w.w; x++) if (w.isleAt(x, y) === isle && w.at(x, y).t !== 'water') out.push({ x, y, i: y * w.w + x });
  return out;
}

// How many tiles across the island is, at right angles to the line from the start to its centre.
function across(w: World, land: { x: number; y: number }[], c: { x: number; y: number }) {
  const dx = c.x - w.start.x, dy = c.y - w.start.y, d = Math.hypot(dx, dy);
  const side = land.map((t) => ((t.x - c.x) * -dy + (t.y - c.y) * dx) / d);
  return Math.max(...side) - Math.min(...side) + 1;
}

const centre = (w: World, isle: IsleName) => (isle === 'other' ? w.isle! : w.far!);

describe('bigger islands by map version', () => {
  test('new maps are 128 by 128 tiles, with the start in the middle', () => {
    expect(MAP_VERSION).toBeGreaterThanOrEqual(HUGE_ISLES_FROM);
    expect(mapSize(MAP_VERSION)).toBe(128);
    expect(HUGE_SIZE).toBe(128);
    const w = new World(1);
    expect(w.w).toBe(128);
    expect(w.tiles).toHaveLength(128 * 128);
    expect(w.start).toEqual({ x: 64, y: 64 });
  });

  test('new maps give both islands the same size, about 32 tiles across', () => {
    expect(isleShape(HUGE_ISLES_FROM)).toBe(HUGE_ISLE);
    expect(farShape(HUGE_ISLES_FROM)).toBe(HUGE_ISLE);
    expect(new World(1).shape).toBe(HUGE_ISLE);
    expect(new World(1).farShape).toBe(HUGE_ISLE);
  });

  test('older maps keep their size and islands', () => {
    expect(mapSize(BEFORE)).toBe(96);
    expect(isleShape(BEFORE)).toBe(BIG_ISLE);
    expect(farShape(BEFORE)).toBe(BIG_FAR);
    expect(new World(1, BEFORE).w).toBe(96);
  });
});

describe('bigger islands', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed), old = new World(seed, BEFORE);
      const home = landOf(w, null);

      for (const isle of ['other', 'far'] as const)
        describe(isle === 'other' ? 'second island' : 'far island', () => {
          const land = landOf(w, isle), was = landOf(old, isle);

          test('is about 32 tiles across', () => {
            expect(across(w, land, centre(w, isle))).toBeGreaterThanOrEqual(29);
            expect(across(w, land, centre(w, isle))).toBeLessThanOrEqual(35);
          });

          test('has about half the home island\'s land', () => {
            expect(land.length).toBeGreaterThanOrEqual(0.35 * home.length);
            expect(land.length).toBeLessThanOrEqual(0.75 * home.length);
          });

          test('has more land, forest and ore than before', () => {
            const trees = (v: World, l: typeof land) => l.filter((t) => v.tiles[t.i].tree > 0).length;
            const ore = (v: World, l: typeof land) => l.filter((t) => v.hasOre(t.x, t.y)).length;
            expect(land.length).toBeGreaterThanOrEqual(1.3 * was.length);
            expect(trees(w, land)).toBeGreaterThan(trees(old, was));
            expect(ore(w, land)).toBeGreaterThanOrEqual(1.3 * ore(old, was));
          });

          test('settlers can walk around the ridge to every part of the island', () => {
            const ok = (x: number, y: number) =>
              w.inside(x, y) && w.isleAt(x, y) === isle && w.at(x, y).t !== 'water' && w.at(x, y).t !== 'mountain';
            const ground = land.filter((t) => ok(t.x, t.y));
            const seen = new Set([ground[0].i]), todo = [ground[0]];
            while (todo.length) {
              const { x, y } = todo.pop()!;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const i = (y + dy) * w.w + x + dx;
                if (seen.has(i) || !ok(x + dx, y + dy)) continue;
                seen.add(i);
                todo.push({ x: x + dx, y: y + dy, i });
              }
            }
            expect(seen.size).toBe(ground.length);
          });

          test('keeps open sea to the home island and the map edge', () => {
            let gap = Infinity;
            for (const a of home) for (const b of land) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
            expect(gap).toBeGreaterThanOrEqual(4);
            for (const t of land) expect(Math.min(t.x, t.y, w.w - 1 - t.x, w.h - 1 - t.y)).toBeGreaterThanOrEqual(3);
          });
        });

      test('both islands are about the same size', () => {
        const a = landOf(w, 'other').length, b = landOf(w, 'far').length;
        expect(Math.min(a, b)).toBeGreaterThanOrEqual(0.8 * Math.max(a, b));
      });

      test('open sea lies between the two islands', () => {
        let gap = Infinity;
        for (const a of landOf(w, 'other')) for (const b of landOf(w, 'far')) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
        expect(gap).toBeGreaterThanOrEqual(4);
      });
    });
});
