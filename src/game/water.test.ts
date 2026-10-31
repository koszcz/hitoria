import { describe, expect, test } from 'bun:test';
import { Game, PILE } from '.';
import { flatGame, placeLinked, run, runUntil, expectIncomingConsistent, wallOff } from './test-helpers';

describe('wells and water', () => {
  test('a well draws water and carriers take it to the HQ', () => {
    const g = flatGame();
    const well = placeLinked(g, 'well', g.hq.x + 4, g.hq.y);
    runUntil(g, () => well.built, 150);
    runUntil(g, () => g.stored.water >= 2, 120, () => expectIncomingConsistent(g));
    expect(g.made.water).toBeGreaterThanOrEqual(2);
  });

  test('a well needs no input and keeps at most 4 water', () => {
    const g = flatGame();
    const well = placeLinked(g, 'well', g.hq.x + 4, g.hq.y);
    runUntil(g, () => well.built, 150);
    runUntil(g, () => well.status === 'Drawing water', 60);
    // With the well walled off, no carrier comes, so the water piles up.
    wallOff(g, well);
    runUntil(g, () => well.status === 'Full, waiting for a carrier', 120, () => {
      expect(well.out.water).toBeLessThanOrEqual(PILE);
    });
  });

  test('a bakery with flour but no water waits for water', () => {
    const g = flatGame();
    const bakery = placeLinked(g, 'bakery', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => bakery.built, 150);
    g.hq.stock.flour = 3;
    runUntil(g, () => bakery.stock.flour >= 1, 60);
    runUntil(g, () => bakery.status === 'Waiting for water', 30);
    run(g, 20);
    expect(g.made.bread).toBe(0);
    expect(bakery.stock.flour).toBe(3);
  });

  test('a bakery with water but no flour waits for flour', () => {
    const g = flatGame();
    const bakery = placeLinked(g, 'bakery', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => bakery.built, 150);
    g.hq.stock.water = 3;
    runUntil(g, () => bakery.stock.water >= 3, 60);
    runUntil(g, () => bakery.status === 'Waiting for flour', 30);
    expect(g.made.bread).toBe(0);
  });

  test('a bakery uses 1 flour and 1 water for each loaf', () => {
    const g = flatGame();
    const bakery = placeLinked(g, 'bakery', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => bakery.built, 150);
    Object.assign(g.hq.stock, { flour: 3, water: 2 });
    runUntil(g, () => g.made.bread >= 2, 120, () => expectIncomingConsistent(g));
    run(g, 30);
    expect(g.made.bread).toBe(2);
    expect(g.stored.flour + bakery.stock.flour).toBe(1);
    expect(g.stored.water + bakery.stock.water).toBe(0);
  });

  test('a bakery keeps at most 4 flour and 4 water', () => {
    const g = flatGame();
    const bakery = placeLinked(g, 'bakery', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => bakery.built, 150);
    Object.assign(g.hq.stock, { flour: 10, water: 10 });
    let flour = 0, water = 0;
    run(g, 60, () => {
      flour = Math.max(flour, bakery.stock.flour + bakery.incoming.flour);
      water = Math.max(water, bakery.stock.water + bakery.incoming.water);
    });
    expect(flour).toBe(PILE);
    expect(water).toBe(PILE);
  });

  test('saving while a bakery bakes puts its flour and water back', () => {
    const g = flatGame();
    const bakery = placeLinked(g, 'bakery', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => bakery.built, 150);
    Object.assign(bakery.stock, { flour: 1, water: 1 });
    runUntil(g, () => bakery.busy, 30);
    const saved = g.save().buildings.find((b) => b.id === bakery.id)!;
    expect(saved.stock.flour).toBe(1);
    expect(saved.stock.water).toBe(1);
  });

  test('a save from before water loads with no water', () => {
    const g = flatGame();
    const d = g.save();
    for (const b of d.buildings) delete (b.stock as Partial<typeof b.stock>).water;
    delete (d.made as Partial<typeof g.made>).water;
    const l = Game.load(JSON.parse(JSON.stringify(d)));
    expect(l.hq.stock.water).toBe(0);
    expect(l.made.water).toBe(0);
  });
});
