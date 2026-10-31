// Worn paths: footsteps wear grass into dirt, worn ground is faster to walk on, and unused paths fade.
import { describe, expect, test } from 'bun:test';
import { Game, FADE_DELAY, FADE_TIME, PATH_SPEED, ROAD_SPEED, WEAR_STEP } from '.';
import { W } from '../world';
import { findPath } from '../path';
import { walkCost, walkSpeed } from './land';
import { takeSettler, step } from './settlers';
import { tread } from './wear';
import { flatGame, run } from './test-helpers';

const wearAt = (g: Game, x: number, y: number) => g.wear[y * W + x];

// Send one settler from the HQ on a walk to (x, y), and run until they get there.
function walkTo(g: Game, x: number, y: number) {
  const s = takeSettler(g, 'carrier')!;
  s.x = g.hq.x;
  s.y = g.hq.y + 1;
  s.tasks = [{ k: 'walk', x, y }];
  for (let t = 0; t < 60 && s.tasks.length; t += 0.1) step(g, s, 0.1);
  g.settlers.delete(s.id);
  g.pool++;
}

describe('worn paths', () => {
  test('a settler walking across grass wears the tiles they step on', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    walkTo(g, x + 6, y + 1);
    for (let i = 1; i <= 6; i++) expect(wearAt(g, x + i, y + 1)).toBeCloseTo(WEAR_STEP);
    expect(wearAt(g, x + 3, y + 4)).toBe(0);
  });

  test('wear builds up with each step and stops at 1', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    tread(g, x, y);
    tread(g, x, y);
    expect(wearAt(g, x, y)).toBeCloseTo(2 * WEAR_STEP);
    for (let i = 0; i < 20; i++) tread(g, x, y);
    expect(wearAt(g, x, y)).toBe(1);
  });

  test('roads, flags, fields, buildings, water and mountains never wear', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    const marks: [string, object][] = [['road', { road: 1 }], ['flag', { flag: 1 }], ['field', { field: 1 }],
      ['building', { b: 1 }], ['water', { t: 'water' }], ['mountain', { t: 'mountain' }]];
    marks.forEach(([, mark], i) => {
      Object.assign(g.world.at(x + i, y), mark);
      tread(g, x + i, y);
      expect(wearAt(g, x + i, y)).toBe(0);
    });
    g.world.at(x, y + 1).t = 'sand';
    tread(g, x, y + 1);
    expect(wearAt(g, x, y + 1)).toBeGreaterThan(0);
  });

  test('a fully worn path is faster than grass, but slower than a road', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    expect(walkSpeed(g, x, y)).toBe(1);
    g.wear[y * W + x] = 0.5;
    expect(walkSpeed(g, x, y)).toBeCloseTo(1 + (PATH_SPEED - 1) / 2);
    g.wear[y * W + x] = 1;
    expect(walkSpeed(g, x, y)).toBe(PATH_SPEED);
    expect(PATH_SPEED).toBeGreaterThan(1);
    expect(PATH_SPEED).toBeLessThan(ROAD_SPEED);
    expect(walkCost(g, x, y)).toBeCloseTo(1 / PATH_SPEED);
  });

  test('settlers walk faster on a worn path', () => {
    const timeTo = (worn: boolean) => {
      const g = flatGame();
      const { x, y } = g.hq;
      if (worn) for (let i = 0; i <= 8; i++) g.wear[(y + 1) * W + x + i] = 1;
      const s = takeSettler(g, 'carrier')!;
      s.x = x;
      s.y = y + 1;
      s.tasks = [{ k: 'walk', x: x + 8, y: y + 1 }];
      let t = 0;
      while (s.tasks.length) {
        step(g, s, 0.05);
        t += 0.05;
      }
      return t;
    };
    expect(timeTo(true)).toBeLessThan(timeTo(false) * 0.9);
  });

  test('settlers keep to a worn path when it is not much longer', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    // A worn path that bows one tile north of the straight line.
    for (let i = 0; i <= 10; i++) g.wear[(y - 3) * W + x + i] = 1;
    const p = findPath(x, y - 2, x + 10, y - 2, g.passable, 6000, (a, b) => walkCost(g, a, b))!;
    expect(p.filter((n) => n.y === y - 3).length).toBeGreaterThan(5);
  });

  test('an unused path fades back to grass over several minutes', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    g.world.at(x, y).plant = '';
    for (let i = 0; i < 10; i++) tread(g, x, y);
    run(g, FADE_DELAY - 2, undefined, 0.5);
    expect(wearAt(g, x, y)).toBe(1);
    run(g, FADE_TIME / 2, undefined, 0.5);
    expect(wearAt(g, x, y)).toBeGreaterThan(0.3);
    expect(wearAt(g, x, y)).toBeLessThan(0.7);
    run(g, FADE_TIME / 2 + 4, undefined, 0.5);
    expect(wearAt(g, x, y)).toBe(0);
    expect(FADE_DELAY + FADE_TIME).toBeGreaterThanOrEqual(180);
  });

  test('a busy path never fades', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    for (let i = 0; i < 10; i++) tread(g, x, y);
    for (let i = 0; i < 20; i++) {
      run(g, FADE_DELAY - 5, undefined, 0.5);
      tread(g, x, y);
    }
    expect(wearAt(g, x, y)).toBe(1);
  });

  test('the look counter changes only when a tile visibly changes', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    const before = g.worn;
    tread(g, x, y);
    expect(g.worn).toBeGreaterThan(before);
    for (let i = 0; i < 20; i++) tread(g, x, y);
    const full = g.worn;
    tread(g, x, y);
    expect(g.worn).toBe(full);
  });

  test('a saved game keeps its worn paths', () => {
    const g = flatGame();
    const x = g.hq.x + 4, y = g.hq.y + 4;
    for (let i = 0; i < 3; i++) tread(g, x, y);
    const d = JSON.parse(JSON.stringify(g.save()));
    const g2 = Game.load(d);
    expect(wearAt(g2, x, y)).toBeCloseTo(3 * WEAR_STEP, 2);
    // Paths in a loaded game wait the full delay before they start to fade.
    run(g2, FADE_DELAY - 2, undefined, 0.5);
    expect(wearAt(g2, x, y)).toBeCloseTo(3 * WEAR_STEP, 2);
  });

  test('a save from before worn paths loads with no wear', () => {
    const g = flatGame();
    const d = g.save();
    d.tiles = d.tiles.map((t) => t.slice(0, 8) as typeof t);
    const g2 = Game.load(JSON.parse(JSON.stringify(d)));
    expect(g2.wear.every((w) => w === 0)).toBe(true);
  });
});
