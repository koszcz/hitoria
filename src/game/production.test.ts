// Huts and workshops that make goods.
import { describe, expect, test } from 'bun:test';
import { BIG_SIZE as W } from '../land/size';
import { flatGame, run, runUntil, totalGoods, placeLinked } from './test-helpers';

describe('production', () => {
  test('a woodcutter fells trees and sends logs to the HQ', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const trees = [{ x: b.x + 2, y: b.y - 2 }, { x: b.x + 3, y: b.y - 1 }];
    for (const t of trees) g.world.at(t.x, t.y).tree = 1;
    runUntil(g, () => g.hq.stock.log >= 8, 300);
    for (const t of trees) expect(g.world.at(t.x, t.y).tree).toBe(0);
  });

  test('a woodcutter waits when no grown trees are in range', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 2, b.y - 2).tree = 0.5; // a sapling, not ready
    runUntil(g, () => b.status === 'No grown trees in range', 200);
    expect(g.world.at(b.x + 2, b.y - 2).tree).toBeGreaterThanOrEqual(0.5); // still standing, maybe grown a little
  });

  test('a quarry breaks boulders into stone', () => {
    const g = flatGame();
    const b = placeLinked(g, 'quarry', g.hq.x - 4, g.hq.y);
    const rock = g.world.at(b.x - 2, b.y - 2);
    rock.rock = 2;
    runUntil(g, () => g.hq.stock.stone >= 16, 300);
    expect(rock.rock).toBe(0);
  });

  test('a sawmill turns logs into planks', () => {
    const g = flatGame();
    const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.built, 200);
    const planks = totalGoods(g).plank;
    runUntil(g, () => totalGoods(g).plank >= planks + 3, 300);
    expect(totalGoods(g).log).toBeLessThan(6);
  });

  test('a forester plants saplings that grow into trees', () => {
    const g = flatGame();
    placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    const count = (min: number) => g.world.tiles.filter((t) => t.tree >= min).length;
    const before = count(1);
    runUntil(g, () => count(0.01) > before, 200);
    runUntil(g, () => count(1) > before, 200);
  });

  test('a forester never plants on a worn path', () => {
    const g = flatGame();
    const b = placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    const worn = new Set<number>();
    for (let y = b.y - 8; y <= b.y + 8; y++)
      for (let x = b.x - 8; x <= b.x + 8; x++)
        if ((x + y) % 2 === 0) {
          const i = y * W + x;
          worn.add(i);
          g.wear[i] = 1;
        }
    run(g, 200, () => { for (const i of worn) g.trod[i] = g.time; }, 0.5);
    let planted = 0;
    for (let y = b.y - 8; y <= b.y + 8; y++)
      for (let x = b.x - 8; x <= b.x + 8; x++) {
        const t = g.world.at(x, y);
        if (t.tree > 0 && t.tree < 1) planted++;
        if (worn.has(y * W + x)) expect(t.tree).toBe(0);
      }
    expect(planted).toBeGreaterThan(0); // it did plant, between the paths
  });

  test('a forester never plants next to a building', () => {
    const g = flatGame();
    const b = placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    run(g, 400);
    for (const o of g.buildings.values())
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          expect(g.world.at(o.x + dx, o.y + dy).tree).toBe(0);
    expect(g.world.tiles.some((t) => t.tree > 0)).toBe(true); // it did plant, farther off
    expect(b.built).toBe(true);
  });

  test('saplings grow fully in about 40 seconds', () => {
    const g = flatGame();
    const t = g.world.at(g.hq.x + 3, g.hq.y - 3);
    t.tree = 0.05;
    run(g, 20);
    expect(t.tree).toBeGreaterThan(0.05);
    expect(t.tree).toBeLessThan(1);
    run(g, 25);
    expect(t.tree).toBe(1);
  });
});
