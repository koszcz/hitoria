// Bigger map: from map version 9, new maps are 96 by 96 tiles. The land is the same as on a
// 64 by 64 map, laid in the middle, with open sea all around it. Older maps stay 64 by 64.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { Game } from '../game';
import { BIG_FROM, BIG_SIZE, OLD_SIZE, mapSize } from './size';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const RIM = (BIG_SIZE - OLD_SIZE) / 2;
const LAST_SMALL = BIG_FROM - 1;

describe('map size', () => {
  test('new maps are 96 by 96 tiles', () => {
    expect(MAP_VERSION).toBeGreaterThanOrEqual(BIG_FROM);
    const w = new World(1);
    expect(w.w).toBe(96);
    expect(w.h).toBe(96);
    expect(w.tiles).toHaveLength(96 * 96);
    expect(w.territory).toHaveLength(96 * 96);
    expect(w.ore).toHaveLength(96 * 96);
    expect(w.cliff).toHaveLength(96 * 96);
    expect(w.start).toEqual({ x: 48, y: 48 });
  });

  test('older maps stay 64 by 64 tiles', () => {
    for (let map = 1; map < BIG_FROM; map++) {
      expect(mapSize(map)).toBe(64);
      const w = new World(1, map);
      expect(w.w).toBe(64);
      expect(w.tiles).toHaveLength(64 * 64);
      expect(w.start).toEqual({ x: 32, y: 32 });
    }
  });

  test('a tile is inside the map only within its own size', () => {
    const old = new World(1, LAST_SMALL), now = new World(1);
    expect(old.inside(70, 10)).toBe(false);
    expect(now.inside(70, 10)).toBe(true);
    expect(now.inside(95, 95)).toBe(true);
    expect(now.inside(96, 0)).toBe(false);
    expect(now.inside(-1, 0)).toBe(false);
  });

  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const old = new World(seed, LAST_SMALL), now = new World(seed);

      test('the land is the land of the last 64 by 64 map, moved into the middle', () => {
        for (let y = 0; y < OLD_SIZE; y++)
          for (let x = 0; x < OLD_SIZE; x++) {
            const i = y * OLD_SIZE + x, j = (y + RIM) * BIG_SIZE + x + RIM;
            expect(now.tiles[j]).toEqual(old.tiles[i]);
            expect(now.ore[j]).toBe(old.ore[i]);
            expect(now.cliff[j]).toBe(old.cliff[i]);
          }
      });

      test('the home island and both islands keep their places and themes', () => {
        expect(now.start).toEqual({ x: old.start.x + RIM, y: old.start.y + RIM });
        expect(now.isle).toEqual({ x: old.isle!.x + RIM, y: old.isle!.y + RIM });
        expect(now.far).toEqual({ ...old.far!, x: old.far!.x + RIM, y: old.far!.y + RIM });
        expect(now.themes).toEqual(old.themes);
      });

      test('open sea runs 16 tiles wide around the land, and grows deeper away from it', () => {
        let ring = 0;
        for (let y = 0; y < BIG_SIZE; y++)
          for (let x = 0; x < BIG_SIZE; x++) {
            const out = Math.max(RIM - x, RIM - y, x - (RIM + OLD_SIZE - 1), y - (RIM + OLD_SIZE - 1));
            if (out <= 0) continue;
            ring++;
            const t = now.at(x, y);
            expect(t.t).toBe('water');
            expect(t.h).toBeLessThanOrEqual(Math.max(-0.35, 0.22 - out * 0.05) + 1e-9);
            expect(t.h).toBeGreaterThanOrEqual(-0.35);
            expect(t.tree + t.rock).toBe(0);
            expect(t.plant).toBe('');
            expect(now.hasOre(x, y)).toBe(false);
          }
        expect(ring).toBe(BIG_SIZE * BIG_SIZE - OLD_SIZE * OLD_SIZE);
        expect(now.at(0, 0).h).toBe(-0.35);
      });
    });
});

describe('saves and map size', () => {
  test('a new game saves and loads on a 96 by 96 map', () => {
    const d = new Game(1).save();
    expect(d.tiles).toHaveLength(96 * 96);
    const g = Game.load(d);
    expect(g.world.w).toBe(96);
    expect(g.wear).toHaveLength(96 * 96);
    expect(g.hq).toMatchObject({ x: 48, y: 48 });
  });

  test('a save from an older map loads on a 64 by 64 map', () => {
    const d = new Game(1, LAST_SMALL).save();
    expect(d.tiles).toHaveLength(64 * 64);
    const g = Game.load(d);
    expect(g.world.w).toBe(64);
    expect(g.world.map).toBe(LAST_SMALL);
    expect(g.wear).toHaveLength(64 * 64);
    expect(g.signs).toHaveLength(64 * 64);
    expect(g.hq).toMatchObject({ x: 32, y: 32 });
  });
});
