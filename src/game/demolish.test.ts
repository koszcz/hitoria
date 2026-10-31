import { describe, expect, test } from 'bun:test';
import { BDEFS, GOODS } from './defs';
import { expectIncomingConsistent, flatGame, inside, placeLinked, run, runUntil, totalGoods } from './test-helpers';

describe('demolishing a building', () => {
  test('the remove tool takes a building off the map', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    expect(g.removeAt({ x: b.x, y: b.y })).toBeNull();
    expect(g.buildings.has(b.id)).toBe(false);
    expect(g.world.at(b.x, b.y).b).toBe(0);
    expect(g.toasts).toContain("🪓 Woodcutter's Hut demolished");
  });

  test('the HQ cannot be demolished', () => {
    const g = flatGame();
    expect(g.removeAt({ x: g.hq.x, y: g.hq.y })).toBe('The HQ cannot be demolished');
    expect(g.buildings.has(g.hq.id)).toBe(true);
  });

  test('its flag and road stay, free for a new building', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const flag = g.flags.get(b.flag)!;
    const roads = [...flag.roads];
    g.removeAt({ x: b.x, y: b.y });
    expect(g.flags.get(b.flag)?.building).toBe(0);
    expect(flag.roads).toEqual(roads);
    expect(g.canPlace('quarry', b.x, b.y)).toBeNull();
  });

  test('goods at a site and on their way to it go back to the HQ', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 5, g.hq.y);
    const sum = (bag: Record<string, number>) => Object.values(bag).reduce((a, n) => a + n, 0);
    runUntil(g, () => sum(b.stock) > 0 && [...g.settlers.values()].some((s) => s.job?.to === b.id && s.carrying));
    const before = totalGoods(g);
    g.removeAt({ x: b.x, y: b.y });
    expectIncomingConsistent(g);
    expect(totalGoods(g)).toEqual(before);
    run(g, 30, () => expectIncomingConsistent(g));
    for (const k of GOODS) expect(g.hq.stock[k]).toBe(before[k]);
  });

  test("a workshop's goods go back to the HQ", () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built);
    b.out.log = 2;
    const logs = g.hq.stock.log;
    g.removeAt({ x: b.x, y: b.y });
    expect(g.hq.stock.log).toBe(logs + 2);
  });

  test('the builder walks back into the HQ', () => {
    const g = flatGame();
    const pool = g.pool;
    const b = placeLinked(g, 'lookout', g.hq.x + 5, g.hq.y);
    runUntil(g, () => !!g.settlers.get(b.builder)?.atWork);
    const builder = b.builder;
    g.removeAt({ x: b.x, y: b.y });
    expect(g.settlers.has(builder)).toBe(true); // walks, rather than vanishing
    runUntil(g, () => g.pool === pool);
    expect(g.settlers.size).toBe(0);
  });

  test('a woodcutter out felling a tree walks home, and frees the tree', () => {
    const g = flatGame();
    const pool = g.pool;
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 3, b.y - 2).tree = 1;
    runUntil(g, () => b.status === 'Felling a tree');
    const worker = g.settlers.get(b.worker)!;
    g.removeAt({ x: b.x, y: b.y });
    expect(worker.home).toBe(0);
    runUntil(g, () => g.pool === pool);
    expect(g.claimed.size).toBe(0);
  });

  test('demolishing a lookout gives back the land it added', () => {
    const g = flatGame(1, 24);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y);
    const beyond = { x: b.x + BDEFS.lookout.radius, y: b.y };
    runUntil(g, () => b.built);
    expect(inside(g, beyond.x, beyond.y)).toBe(true);
    g.removeAt({ x: b.x, y: b.y });
    expect(inside(g, beyond.x, beyond.y)).toBe(false);
  });
});
