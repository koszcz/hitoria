// Builders, building sites and finished buildings.
import { describe, expect, test } from 'bun:test';
import { BDEFS, bag } from '.';
import { flatGame, run, runUntil, totalGoods, expectIncomingConsistent, placeLinked, inside, placeBare, wallOff } from './test-helpers';

describe('construction', () => {
  test('a linked site gets its materials and is built', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built, 120);
    expect(b.status).not.toBe('Under construction');
    expect(g.hq.stock.plank).toBe(24 - BDEFS.woodcutter.cost.plank!);
  });

  test('a site with no road is supplied on foot and built', () => {
    const g = flatGame();
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    expect(g.linked(b)).toBe(true);
    runUntil(g, () => b.built, 120);
    expect(g.hq.stock.plank).toBe(24 - BDEFS.woodcutter.cost.plank!);
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

  test('a site walled off by water gets no builder', () => {
    const g = flatGame();
    const b = placeBare(g, 'woodcutter', g.hq.x + 6, g.hq.y);
    wallOff(g, b);
    run(g, 10);
    expect(g.linked(b)).toBe(false);
    expect(b.builder).toBe(0);
    expect(g.pool).toBe(18);
    expect(b.status).toBe('No way to walk to your HQ');
  });

  test('a builder leaves their site when it is cut off', () => {
    const g = flatGame();
    g.hq.stock.plank = 0; // no materials, so the site can't finish before it is cut off
    g.hq.stock.stone = 0;
    const b = placeBare(g, 'woodcutter', g.hq.x + 8, g.hq.y);
    runUntil(g, () => !!g.settlers.get(b.builder)?.atWork, 60);
    wallOff(g, b);
    runUntil(g, () => b.builder === 0, 60);
    expect(b.built).toBe(false);
    expect(b.status).toBe('No way to walk to your HQ');
    expect(g.population).toBe(18);
  });

  test('houses get a builder before other sites', () => {
    const g = flatGame();
    g.pool = 1;
    g.hq.stock = bag(); // nothing to carry, so no carrier takes the one settler
    const hut = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const house = placeLinked(g, 'house', g.hq.x - 4, g.hq.y);
    run(g, 0.5);
    expect(house.builder).not.toBe(0);
    expect(hut.builder).toBe(0);
    expect(hut.status).toBe('Waiting for a free settler');
  });
});
