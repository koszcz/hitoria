// Bigger second island: from map version 10, the second island is about 20 tiles across, with
// wider meadows, more forest and a longer ridge with more ore. Older maps keep the smaller island.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { BIG_ISLE, BIG_ISLE_FROM, SMALL_ISLE, isleShape } from './isle';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const LAST_SMALL = BIG_ISLE_FROM - 1;

// Every land tile of one island, as { x, y, i }, where i is the tile's index.
function landOf(w: World, isle: IsleName) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < w.h; y++)
    for (let x = 0; x < w.w; x++) if (w.isleAt(x, y) === isle && w.at(x, y).t !== 'water') out.push({ x, y, i: y * w.w + x });
  return out;
}

// How many tiles across the island is, at right angles to the way it faces out to sea.
function across(w: World, land: { x: number; y: number }[], c: { x: number; y: number }) {
  const dx = c.x - w.start.x, dy = c.y - w.start.y, d = Math.hypot(dx, dy);
  const side = land.map((t) => ((t.x - c.x) * -dy + (t.y - c.y) * dx) / d);
  return Math.max(...side) - Math.min(...side) + 1;
}

const count = (land: { i: number }[], ok: (t: World['tiles'][number], i: number) => boolean, w: World) =>
  land.filter((t) => ok(w.tiles[t.i], t.i)).length;

describe('island shape by map version', () => {
  test('new maps have the bigger second island', () => {
    expect(MAP_VERSION).toBeGreaterThanOrEqual(BIG_ISLE_FROM);
    expect(isleShape(MAP_VERSION)).toBe(BIG_ISLE);
    expect(new World(1).shape).toBe(BIG_ISLE);
  });

  test('older maps keep the smaller second island', () => {
    for (let map = 1; map < BIG_ISLE_FROM; map++) expect(isleShape(map)).toBe(SMALL_ISLE);
    expect(new World(1, LAST_SMALL).shape).toBe(SMALL_ISLE);
  });
});

describe('bigger second island', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed), old = new World(seed, LAST_SMALL);
      const isle = landOf(w, 'other'), was = landOf(old, 'other');

      test('is about 20 tiles across, where it was about 13', () => {
        expect(across(w, isle, w.isle!)).toBeGreaterThanOrEqual(18);
        expect(across(w, isle, w.isle!)).toBeLessThanOrEqual(22);
        expect(across(old, was, old.isle!)).toBeLessThanOrEqual(16);
        expect(isle.length).toBeGreaterThanOrEqual(1.7 * was.length);
      });

      test('has wider meadows: at least half as much grass again', () => {
        const open = (v: World, land: typeof isle) => count(land, (t) => t.t === 'grass', v);
        expect(open(w, isle)).toBeGreaterThanOrEqual(1.5 * open(old, was));
      });

      test('has more forest', () => {
        const trees = (v: World, land: typeof isle) => count(land, (t) => t.tree > 0, v);
        expect(trees(w, isle)).toBeGreaterThan(trees(old, was));
        // From map version 11, pines keep a wider clear foot by the ridge, so mines always fit there.
        if (w.themes!.other === 'pines') expect(trees(w, isle)).toBeGreaterThanOrEqual(70);
      });

      test('has a longer ridge, with at least 1.6 times the ore', () => {
        const ore = (v: World, land: typeof isle) => land.filter((t) => v.hasOre(t.x, t.y));
        expect(ore(w, isle).length).toBeGreaterThanOrEqual(1.6 * ore(old, was).length);
        expect(across(w, ore(w, isle), w.isle!)).toBeGreaterThanOrEqual(9);
      });

      test('settlers can walk around the ridge to every part of the island', () => {
        const ok = (x: number, y: number) =>
          w.inside(x, y) && w.isleAt(x, y) === 'other' && w.at(x, y).t !== 'water' && w.at(x, y).t !== 'mountain';
        const ground = isle.filter((t) => ok(t.x, t.y));
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

      // From map version 11, the far island is bigger too. See src/land/farisle.test.ts.
      test('on map version 10, the far island keeps its size, with open sea between it and the second island', () => {
        const v10 = new World(seed, BIG_ISLE_FROM), far = landOf(v10, 'far'), near = landOf(v10, 'other');
        expect(across(v10, far, v10.far!)).toBeLessThanOrEqual(16);
        let gap = Infinity;
        for (const a of near) for (const b of far) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
        expect(gap).toBeGreaterThanOrEqual(4);
      });

      test('the home island keeps to the land of an old-size map, and the map edge is open sea', () => {
        for (let y = 0; y < w.h; y++)
          for (let x = 0; x < w.w; x++) {
            const t = w.at(x, y);
            if (Math.min(x, y, w.w - 1 - x, w.h - 1 - y) < 3) expect(t.t).toBe('water');
            if (t.t === 'water' || w.isleAt(x, y)) continue;
            expect(Math.max(Math.abs(x - w.start.x), Math.abs(y - w.start.y))).toBeLessThanOrEqual(32);
          }
        expect(w.at(0, 0).h).toBeGreaterThanOrEqual(-0.35);
      });
    });
});
