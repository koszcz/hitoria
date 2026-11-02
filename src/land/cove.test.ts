// The hidden cove theme: from map version 12, an island can get a sheltered lagoon cut deep into
// it, ringed by sand and reeds. Older maps never get it.
import { describe, expect, test } from 'bun:test';
import { World } from '../world';
import { COVE_FROM } from './cove';
import { drawThemes, isleWith } from './themes';
import type { IsleName } from './themes';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
// Seeds whose map has the cove, on either island.
const COVES = SEEDS.filter((s) => isleWith(drawThemes(s, COVE_FROM), 'cove'));
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Every tile of one island, as { x, y, i }, where i is the tile's index.
function tilesOf(w: World, isle: IsleName) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.isleAt(x, y) === isle) out.push({ x, y, i: y * w.w + x });
  return out;
}
const coveTiles = (w: World) => tilesOf(w, isleWith(w.themes, 'cove')!).filter((t) => w.cove[t.i]);

describe('drawing three themes', () => {
  test('each theme comes up on each island across seeds', () => {
    for (const isle of ['other', 'far'] as const)
      expect([...new Set(SEEDS.map((s) => drawThemes(s, COVE_FROM)[isle]))].sort()).toEqual(['cove', 'meadow', 'pines']);
  });

  test('the two islands never share a theme', () => {
    for (const s of SEEDS) expect(drawThemes(s, COVE_FROM).other).not.toBe(drawThemes(s, COVE_FROM).far);
  });

  test('older maps keep the pines and the meadow, as they were drawn before', () => {
    for (const s of SEEDS) expect([drawThemes(s, COVE_FROM - 1).other, drawThemes(s, COVE_FROM - 1).far].sort()).toEqual(['meadow', 'pines']);
    expect(drawThemes(1, 8)).toEqual({ other: 'meadow', far: 'pines' });
  });

  test('older maps have no lagoon', () => {
    for (const s of COVES.slice(0, 4)) expect(new World(s, COVE_FROM - 1).cove.every((c) => c === 0)).toBe(true);
  });

  test('a map without the cove has no lagoon', () => {
    const s = SEEDS.find((s) => !isleWith(drawThemes(s, COVE_FROM), 'cove'))!;
    expect(new World(s).cove.every((c) => c === 0)).toBe(true);
  });
});

for (const seed of COVES)
  describe(`hidden cove, seed ${seed}`, () => {
    const w = new World(seed), isle = isleWith(w.themes, 'cove')!;
    const land = tilesOf(w, isle).filter((t) => w.tiles[t.i].t !== 'water');
    const lagoon = coveTiles(w);

    test('has a lagoon of open water on the cove island only', () => {
      expect(lagoon.length).toBeGreaterThanOrEqual(25);
      for (const t of lagoon) expect(w.tiles[t.i].t).toBe('water');
      expect(w.cove.reduce((n, c) => n + c, 0)).toBe(lagoon.length);
    });

    test('cuts deep into the island, with land on both sides', () => {
      // The farthest part of the lagoon lies at least 5 tiles from any water outside it.
      const sea = tilesOf(w, isle).filter((t) => w.tiles[t.i].t === 'water' && !w.cove[t.i]);
      const deep = Math.max(...lagoon.map((a) => Math.min(...sea.map((b) => Math.hypot(a.x - b.x, a.y - b.y)))));
      expect(deep).toBeGreaterThanOrEqual(5);
    });

    test('joins the open sea through its mouth', () => {
      const seen = new Set([lagoon[0].i]), todo = [lagoon[0]];
      let open = false;
      while (todo.length && !open) {
        const { x, y } = todo.pop()!;
        for (const [dx, dy] of SIDES) {
          const i = (y + dy) * w.w + x + dx;
          if (seen.has(i) || w.at(x + dx, y + dy).t !== 'water') continue;
          if (!w.cove[i]) open = true;
          seen.add(i);
          todo.push({ x: x + dx, y: y + dy, i });
        }
      }
      expect(open).toBe(true);
    });

    test('is ringed by sand, most of it grown with reeds', () => {
      const shore = land.filter((t) => SIDES.some(([dx, dy]) => w.cove[(t.y + dy) * w.w + t.x + dx]));
      expect(shore.length).toBeGreaterThanOrEqual(12);
      for (const t of shore) expect(w.tiles[t.i].t).toBe('sand');
      const reeds = shore.filter((t) => w.tiles[t.i].plant === 'reeds').length;
      expect(reeds / shore.length).toBeGreaterThanOrEqual(0.7);
    });

    test('keeps the ore ridge', () => {
      expect(land.filter((t) => w.hasOre(t.x, t.y)).length).toBeGreaterThanOrEqual(6);
    });

    test('settlers can walk around the lagoon and the ridge to every part of the island', () => {
      const ok = (x: number, y: number) => w.isleAt(x, y) === isle && w.at(x, y).t !== 'water' && w.at(x, y).t !== 'mountain';
      const ground = land.filter((t) => ok(t.x, t.y));
      const seen = new Set([ground[0].i]), todo = [ground[0]];
      while (todo.length) {
        const { x, y } = todo.pop()!;
        for (const [dx, dy] of SIDES) {
          const i = (y + dy) * w.w + x + dx;
          if (seen.has(i) || !ok(x + dx, y + dy)) continue;
          seen.add(i);
          todo.push({ x: x + dx, y: y + dy, i });
        }
      }
      expect(seen.size).toBe(ground.length);
    });
  });
