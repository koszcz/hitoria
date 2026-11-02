// Bigger far island: from map version 11, the far island is about 26 tiles across, the largest of
// the three, with wider meadows, more forest and a longer ridge with more ore. Older maps keep the
// smaller far island.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { BIG_FAR, BIG_FAR_FROM, SMALL_ISLE, farShape } from './isle';
import { COVE_FROM } from './cove';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const LAST_SMALL = BIG_FAR_FROM - 1;
// The last map before the hidden cove, which cuts a lagoon into one island. See cove.test.ts.
const BEFORE_COVE = COVE_FROM - 1;

// Every land tile of one island, as { x, y, i }, where i is the tile's index.
function landOf(w: World, isle: IsleName) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < w.h; y++)
    for (let x = 0; x < w.w; x++) if (w.isleAt(x, y) === isle && w.at(x, y).t !== 'water') out.push({ x, y, i: y * w.w + x });
  return out;
}

// How many tiles across the island is, at right angles to the way it faces out to sea.
function across(land: { x: number; y: number }[], c: { x: number; y: number; out: { x: number; y: number } }) {
  const side = land.map((t) => (t.x - c.x) * -c.out.y + (t.y - c.y) * c.out.x);
  return Math.max(...side) - Math.min(...side) + 1;
}

// How many tiles the island reaches along the way it faces out to sea.
function deep(land: { x: number; y: number }[], c: { x: number; y: number; out: { x: number; y: number } }) {
  const along = land.map((t) => (t.x - c.x) * c.out.x + (t.y - c.y) * c.out.y);
  return Math.max(...along) - Math.min(...along) + 1;
}

const count = (w: World, land: { i: number }[], ok: (t: World['tiles'][number], i: number) => boolean) =>
  land.filter((t) => ok(w.tiles[t.i], t.i)).length;

describe('far island shape by map version', () => {
  test('new maps have the bigger far island', () => {
    expect(MAP_VERSION).toBeGreaterThanOrEqual(BIG_FAR_FROM);
    expect(farShape(MAP_VERSION)).toBe(BIG_FAR);
    expect(new World(1).farShape).toBe(BIG_FAR);
  });

  test('older maps keep the smaller far island', () => {
    for (let map = 1; map < BIG_FAR_FROM; map++) expect(farShape(map)).toBe(SMALL_ISLE);
    expect(new World(1, LAST_SMALL).farShape).toBe(SMALL_ISLE);
  });
});

describe('bigger far island', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed, BEFORE_COVE), old = new World(seed, LAST_SMALL);
      const far = landOf(w, 'far'), was = landOf(old, 'far');

      test('is about 26 tiles across, where it was about 13', () => {
        expect(across(far, w.far!)).toBeGreaterThanOrEqual(23);
        expect(across(far, w.far!)).toBeLessThanOrEqual(28);
        expect(deep(far, w.far!)).toBeGreaterThanOrEqual(20);
        expect(across(was, old.far!)).toBeLessThanOrEqual(16);
        expect(far.length).toBeGreaterThanOrEqual(2.5 * was.length);
      });

      test('is the largest of the three islands', () => {
        const other = landOf(w, 'other');
        expect(far.length).toBeGreaterThan(other.length);
        expect(across(far, w.far!)).toBeGreaterThan(w.shape.size * 2 + 1);
      });

      test('has wider meadows: at least twice the grass', () => {
        const open = (v: World, land: typeof far) => count(v, land, (t) => t.t === 'grass');
        expect(open(w, far)).toBeGreaterThanOrEqual(2 * open(old, was));
      });

      test('has more forest', () => {
        const trees = (v: World, land: typeof far) => count(v, land, (t) => t.tree > 0);
        expect(trees(w, far)).toBeGreaterThanOrEqual(1.5 * trees(old, was));
        if (w.themes!.far === 'pines') expect(trees(w, far)).toBeGreaterThanOrEqual(120);
        else expect(trees(w, far)).toBeGreaterThanOrEqual(15);
      });

      test('has a longer ridge, with at least twice the ore', () => {
        const ore = (v: World, land: typeof far) => land.filter((t) => v.hasOre(t.x, t.y));
        expect(ore(w, far).length).toBeGreaterThanOrEqual(2 * ore(old, was).length);
        expect(across(ore(w, far), w.far!)).toBeGreaterThanOrEqual(12);
      });

      test('settlers can walk around the ridge to every part of the island', () => {
        const ok = (x: number, y: number) =>
          w.inside(x, y) && w.isleAt(x, y) === 'far' && w.at(x, y).t !== 'water' && w.at(x, y).t !== 'mountain';
        const ground = far.filter((t) => ok(t.x, t.y));
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

      test('keeps open sea to the second island and the map edge', () => {
        const other = landOf(w, 'other');
        let gap = Infinity;
        for (const a of other) for (const b of far) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
        expect(gap).toBeGreaterThanOrEqual(4);
        for (const t of far) expect(Math.min(t.x, t.y, w.w - 1 - t.x, w.h - 1 - t.y)).toBeGreaterThanOrEqual(3);
      });

      test('the second island keeps its size', () => {
        expect(landOf(w, 'other').length).toBeGreaterThanOrEqual(0.9 * landOf(old, 'other').length);
      });
    });
});
