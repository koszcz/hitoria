import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { BDEFS, BUILDABLE } from './defs';
import { RICH_SPEED, richSpots } from './geology';
import { W } from '../world';
import { flatGame, placeLinked, run, runUntil } from './test-helpers';

// A block of mountain from (x0, y0) to (x1, y1), with no rich spots unless `rich` is set.
function mountain(g: Game, x0: number, y0: number, x1: number, y1: number, rich = false) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      g.world.at(x, y).t = 'mountain';
      g.rich[y * W + x] = rich ? 1 : 0;
    }
}

const signsIn = (g: Game, x0: number, y0: number, x1: number, y1: number) => {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) n += g.signs[y * W + x];
  return n;
};

// Game time for a mine to dig `n` stone once it has the food for it.
function digTime(rich: boolean, n = 6) {
  const g = flatGame();
  const { x, y } = g.hq;
  g.rich.fill(0);
  mountain(g, x + 7, y - 1, x + 8, y + 1, rich);
  const mine = placeLinked(g, 'mine', x + 5, y);
  runUntil(g, () => mine.built, 150);
  g.hq.stock.bread = 20;
  runUntil(g, () => mine.stock.bread > 0, 60);
  const start = g.made.stone;
  return runUntil(g, () => g.made.stone >= start + n, 600);
}

describe('rich spots', () => {
  test('every map has rich spots, only on mountain tiles', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      const g = new Game(seed);
      let n = 0;
      g.rich.forEach((r, i) => {
        if (!r) return;
        n++;
        expect(g.world.tiles[i].t).toBe('mountain');
      });
      expect(n).toBeGreaterThan(0);
    }
  });

  test('a mine can reach a rich spot at the mountain by the HQ and at the ore mountain', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      const g = new Game(seed);
      const { x: sx, y: sy } = g.world.start;
      const rich = [...g.rich.keys()].filter((i) => g.rich[i]);
      expect(rich.some((i) => Math.hypot((i % W) - sx, Math.floor(i / W) - sy) < 12)).toBe(true);
      expect(rich.some((i) => g.world.ore[i] === 1)).toBe(true);
    }
  });

  test('the seed decides the rich spots, so a loaded game has the same ones', () => {
    const g = new Game(5);
    expect([...richSpots(new Game(5).world, 5)]).toEqual([...g.rich]);
    expect([...Game.load(g.save()).rich]).toEqual([...g.rich]);
  });

  test('a mine next to a rich spot digs twice as fast', () => {
    expect(RICH_SPEED).toBe(2);
    const plain = digTime(false), rich = digTime(true);
    expect(rich).toBeLessThan(plain * 0.6);
  });

  test('the game says whether a mine at a spot would be rich', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.rich.fill(0);
    mountain(g, x + 7, y - 1, x + 8, y + 1);
    expect(g.richAt('mine', x + 5, y)).toBe(false);
    g.rich[y * W + x + 7] = 1;
    expect(g.richAt('mine', x + 5, y)).toBe(true);
    expect(g.richAt('coalmine', x + 5, y)).toBe(true);
    expect(g.richAt('woodcutter', x + 5, y)).toBe(false);
    expect(g.richAt('mine', x + 2, y)).toBe(false); // too far from the rich spot
  });

  test('placing a mine by a rich spot tells you so', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 7, y - 1, x + 8, y + 1, true);
    g.toasts.length = 0;
    g.place('mine', x + 5, y);
    expect(g.toasts).toContain('⭐ A rich spot! This mine digs twice as fast');
  });
});

describe('geologist', () => {
  test("you can build a Geologist's Hut, and a geologist works it", () => {
    expect(BUILDABLE).toContain('geologist');
    expect(BDEFS.geologist.worker).toBe('geologist');
  });

  test('the hut goes only near a mountain', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.canPlace('geologist', x + 4, y)).toBe('Must be near a mountain');
    mountain(g, x + 9, y - 1, x + 10, y + 1);
    expect(g.canPlace('geologist', x + 4, y)).toBeNull();
  });

  test('the geologist puts up a sign on every mountain tile in reach, then rests', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 8, y - 2, x + 9, y + 2);
    g.rich[y * W + x + 8] = 1;
    const hut = placeLinked(g, 'geologist', x + 4, y);
    runUntil(g, () => hut.built, 150);
    runUntil(g, () => hut.status === 'Surveying the mountain', 60);
    g.toasts.length = 0;
    runUntil(g, () => hut.status === 'Every mountain nearby is surveyed', 600);
    expect(signsIn(g, x + 8, y - 2, x + 9, y + 2)).toBe(10);
    expect(g.toasts).toContain('⭐ Your geologist found a rich spot');
  });

  test('signs go only on mountain tiles', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 8, y - 1, x + 8, y + 1);
    const hut = placeLinked(g, 'geologist', x + 4, y);
    runUntil(g, () => hut.status === 'Every mountain nearby is surveyed', 600);
    g.signs.forEach((s, i) => s && expect(g.world.tiles[i].t).toBe('mountain'));
    expect(signsIn(g, x + 8, y - 1, x + 8, y + 1)).toBe(3);
  });

  test('signs are kept in a saved game', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 8, y - 1, x + 8, y + 1);
    const hut = placeLinked(g, 'geologist', x + 4, y);
    runUntil(g, () => signsIn(g, x + 8, y - 1, x + 8, y + 1) > 0, 300);
    const d = g.save();
    const l = Game.load(d);
    expect(l.signs).toEqual(g.signs);
    expect(hut.id).toBeGreaterThan(0);
  });

  test('a save from before the geologist loads with no signs', () => {
    const d = flatGame().save();
    delete d.signs;
    expect(Game.load(d).signs.some((s) => s > 0)).toBe(false);
  });

  test('the geologist surveys only within the hut reach', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 8, y, x + 8, y);
    mountain(g, x + 4, y - 12, x + 4, y - 12); // far from the hut
    const hut = placeLinked(g, 'geologist', x + 4, y);
    runUntil(g, () => hut.status === 'Every mountain nearby is surveyed', 600);
    run(g, 10);
    expect(g.signs[y * W + x + 8]).toBe(1);
    expect(g.signs[(y - 12) * W + x + 4]).toBe(0);
  });
});
