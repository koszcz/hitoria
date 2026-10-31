// Builders, building sites and finished buildings.
import { describe, expect, test } from 'bun:test';
import { BDEFS, bag } from '.';
import { flatGame, run, runUntil, totalGoods, expectIncomingConsistent, placeLinked, inside } from './test-helpers';

describe('construction', () => {
  test('a linked site gets its materials and is built', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built, 120);
    expect(b.status).not.toBe('Under construction');
    expect(g.hq.stock.plank).toBe(24 - BDEFS.woodcutter.cost.plank!);
  });

  test('a site with no road is never supplied', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    run(g, 60);
    expect(b.built).toBe(false);
    expect(b.stock).toEqual(bag({ log: 0, plank: 0, stone: 0 }));
    expect(b.status).toBe('Needs a road to your HQ');
  });

  test('no goods or settlers appear or vanish while building', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => b.built, 300, () => {
      if (b.built) return; // the last step used up the materials
      expect(totalGoods(g)).toEqual(before);
      expect(g.population).toBe(18);
      expectIncomingConsistent(g);
    });
    const cost = BDEFS.lookout.cost;
    expect(totalGoods(g)).toEqual({ ...before, plank: before.plank - cost.plank!, stone: before.stone - cost.stone! });
  });

  test('a finished lookout expands your land', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y);
    const beyond = { x: b.x + BDEFS.lookout.radius, y: b.y };
    expect(inside(g, beyond.x, beyond.y)).toBe(false);
    runUntil(g, () => b.built, 300);
    expect(inside(g, beyond.x, beyond.y)).toBe(true);
  });

  test('builders go home when done', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built, 120);
    runUntil(g, () => ![...g.settlers.values()].some((s) => s.role === 'builder'), 60);
  });

  test('a site with no road to the HQ gets no builder', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    run(g, 10);
    expect(b.builder).toBe(0);
    expect(g.pool).toBe(18);
    expect(b.status).toBe('Needs a road to your HQ');
  });

  test('a builder goes home when their site loses its road', () => {
    const g = flatGame();
    g.hq.stock.plank = 0; // no materials, so the site can't finish before the road goes
    g.hq.stock.stone = 0;
    const b = placeLinked(g, 'woodcutter', g.hq.x + 8, g.hq.y);
    runUntil(g, () => !!g.settlers.get(b.builder)?.atWork, 60);
    const road = g.roads.get(g.flags.get(b.flag)!.roads[0])!;
    expect(g.removeAt(road.path[1])).toBeNull();
    expect(g.linked(b)).toBe(false);
    runUntil(g, () => ![...g.settlers.values()].some((s) => s.role === 'builder'), 60);
    expect(b.builder).toBe(0);
    expect(b.built).toBe(false);
    expect(b.status).toBe('Needs a road to your HQ');
    expect(g.population).toBe(18);
  });

  test('houses get a builder before other sites', () => {
    const g = flatGame();
    g.pool = 1;
    const hut = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const house = placeLinked(g, 'house', g.hq.x - 4, g.hq.y);
    run(g, 0.5);
    expect(house.builder).not.toBe(0);
    expect(hut.builder).toBe(0);
    expect(hut.status).toBe('Waiting for a free settler');
  });
});
