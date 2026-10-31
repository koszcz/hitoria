import { describe, expect, test } from 'bun:test';
import { World, W, H, Plant } from './world';
import { Game } from './game';
import { wind, flutter } from './wind';
import { flatGame, run } from './game/test-helpers';

const SEEDS = [1, 2, 3, 99, 12345, 987654321];

function count(w: World) {
  const n: Record<string, number> = {};
  for (const t of w.tiles) n[t.plant] = (n[t.plant] ?? 0) + 1;
  return n;
}

describe('plants', () => {
  test('grow on every kind of land they belong to', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const t = w.at(x, y);
          const allowed: Record<string, Plant[]> = {
            water: [''],
            sand: ['', 'reeds', 'pebbles'],
            mountain: ['', 'pebbles'],
            grass: ['', 'grass', 'flowers', 'bush', 'fern', 'mushrooms', 'log'],
          };
          expect(allowed[t.t]).toContain(t.plant);
        }
    }
  });

  test('reeds grow only on sand next to water', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (w.at(x, y).plant !== 'reeds') continue;
          let wet = false;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if (w.inside(x + dx, y + dy) && w.at(x + dx, y + dy).t === 'water') wet = true;
          expect(wet).toBe(true);
        }
    }
  });

  test('every seed has meadows, forest floor and a shore', () => {
    for (const seed of SEEDS) {
      const n = count(new World(seed));
      for (const k of ['grass', 'flowers', 'bush', 'fern', 'mushrooms', 'reeds', 'pebbles'] as const)
        expect(n[k] ?? 0).toBeGreaterThan(5);
      expect(n.log ?? 0).toBeGreaterThan(0);
    }
  });

  test('ferns and mushrooms grow among trees, not in open meadows', () => {
    const w = new World(12345);
    let inWoods = 0, total = 0;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const p = w.at(x, y).plant;
        if (p !== 'mushrooms' && p !== 'log') continue;
        total++;
        let trees = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (w.at(x + dx, y + dy).tree) trees++;
        if (trees >= 4) inWoods++;
      }
    expect(total).toBeGreaterThan(0);
    expect(inWoods).toBe(total);
  });

  test('are the same for the same seed', () => {
    expect(new World(7).tiles.map((t) => t.plant)).toEqual(new World(7).tiles.map((t) => t.plant));
  });

  test('come back after loading a save', () => {
    const g = new Game(5);
    const loaded = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(loaded.world.tiles.map((t) => t.plant)).toEqual(g.world.tiles.map((t) => t.plant));
  });

  test('never block building, roads or planting', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) g.world.at(x + dx, y + dy).plant = 'bush';
    const site = { x: x + 4, y: y + 1 };
    expect(g.canPlace('forester', site.x, site.y)).toBeNull();
    expect(g.passable(site.x + 1, site.y)).toBe(true);
    g.place('forester', site.x, site.y);
    expect(g.world.at(site.x, site.y).plant).toBe('bush');
    run(g, 5);
  });
});

describe('wind', () => {
  test('stays between 0 and 1', () => {
    for (let t = 0; t < 200; t += 0.7)
      for (const [x, y] of [[0, 0], [10, 50], [63, 63], [31, 7]]) {
        const v = wind(x, y, t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
  });

  test('always blows a little, and gusts blow hard', () => {
    let low = 1, high = 0;
    for (let t = 0; t < 300; t += 0.5) {
      const v = wind(20, 20, t);
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    expect(low).toBeGreaterThanOrEqual(0.25);
    expect(high).toBeGreaterThan(0.8);
  });

  test('gusts reach different places at different times', () => {
    const a = [], b = [];
    for (let t = 0; t < 20; t += 0.25) {
      a.push(wind(5, 5, t));
      b.push(wind(40, 30, t));
    }
    expect(a).not.toEqual(b);
  });

  test('flutter swings both ways and stays between -1 and 1', () => {
    let low = 1, high = -1;
    for (let t = 0; t < 50; t += 0.05) {
      const v = flutter(3, 4, t, 1.5);
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    expect(low).toBeLessThan(-0.5);
    expect(high).toBeGreaterThan(0.5);
    expect(low).toBeGreaterThanOrEqual(-1);
    expect(high).toBeLessThanOrEqual(1);
  });
});
