// Huts and workshops that make goods.
import { describe, expect, test } from 'bun:test';
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
    expect(g.world.at(b.x + 2, b.y - 2).tree).toBeGreaterThan(0);
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

  test('a forester never plants next to a flag', () => {
    const g = flatGame();
    const b = placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    // A lone flag near the hut, with nothing around it but the planting ground.
    const lone = g.buildRoad(b.flag, { x: b.x + 3, y: b.y + 1 });
    if (typeof lone === 'string') throw new Error(lone);
    run(g, 400);
    for (const f of g.flags.values())
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          expect(g.world.at(f.x + dx, f.y + dy).tree).toBe(0);
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
