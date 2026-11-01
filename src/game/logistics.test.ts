// Goods finding their way to the buildings that need them, and storehouses.
import { describe, expect, test } from 'bun:test';
import { Game, bag } from '.';
import { flatGame, run, runUntil, totalGoods, expectIncomingConsistent, placeLinked, placeBare, wallOff } from './test-helpers';

describe('logistics', () => {
  test('one carrier walks each good the whole way', () => {
    const g = flatGame();
    const site = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    const delivered = new Set<number>();
    runUntil(g, () => site.built, 300, () => {
      for (const s of g.settlers.values()) {
        if (s.role !== 'carrier' || !s.carrying) continue;
        // Whoever holds a good took it from the HQ and keeps it until the site.
        delivered.add(s.id);
        expect(s.job).toMatchObject({ from: g.hq.id, to: site.id });
      }
      expectIncomingConsistent(g);
    });
    expect(delivered.size).toBeGreaterThan(0);
  });

  test('walling off a site mid-delivery loses no goods', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const site = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.carrying), 120);
    wallOff(g, site);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
    run(g, 60, () => {
      expect(totalGoods(g)).toEqual(before);
      expect(g.population).toBe(18);
      expectIncomingConsistent(g);
    });
  });

  test('goods wait inside a building that nobody can walk to', () => {
    const g = flatGame();
    const cutter = placeBare(g, 'woodcutter', g.hq.x + 6, g.hq.y);
    wallOff(g, cutter);
    Object.assign(cutter, { built: true, progress: 1 });
    cutter.out.log = 2;
    run(g, 10);
    expect(cutter.out.log).toBe(2);
    expect([...g.settlers.values()].some((s) => s.role === 'carrier')).toBe(false);
  });

  test('goods head for the building that needs them, not the HQ', () => {
    const g = flatGame();
    const saw = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    const cutter = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.hq.stock.log = 0;
    g.world.at(cutter.x + 2, cutter.y - 2).tree = 1;
    runUntil(g, () => saw.built && cutter.built, 300);
    runUntil(g, () => saw.stock.log + saw.incoming.log > 0 || saw.busy, 300);
  });
});

describe('storehouses', () => {
  // A finished storehouse east of the HQ.
  function storehouse(g: Game) {
    const s = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    runUntil(g, () => s.built, 300);
    expect(s.status).toBe('Storing goods');
    return s;
  }

  test('spare goods go to the nearest store, not the HQ', () => {
    const g = flatGame();
    const s = storehouse(g);
    const cutter = placeBare(g, 'woodcutter', s.x + 3, s.y - 3);
    for (const [dx, dy] of [[1, -2], [-1, -2], [2, 0]]) g.world.at(cutter.x + dx, cutter.y + dy).tree = 1;
    runUntil(g, () => cutter.built, 300);
    const hqLogs = g.hq.stock.log;
    runUntil(g, () => s.stock.log >= 2, 400, () => expectIncomingConsistent(g));
    expect(g.hq.stock.log).toBe(hqLogs);
  });

  test('sites are supplied from the nearest store that has the goods', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 0, plank: 5, stone: 5 });
    const hq = { ...g.hq.stock };
    const site = placeBare(g, 'woodcutter', s.x + 3, s.y - 3);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(3);
    expect(g.hq.stock).toEqual(hq);
  });

  test('when the nearest store runs out, a farther one sends the rest', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 0, plank: 1, stone: 0 });
    const site = placeBare(g, 'woodcutter', s.x + 3, s.y - 3);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(0);
  });

  test('goods go to the nearest store on foot', () => {
    const g = flatGame();
    const s = placeBare(g, 'storehouse', g.hq.x + 8, g.hq.y);
    runUntil(g, () => s.built, 300);
    const cutter = placeBare(g, 'woodcutter', s.x + 3, s.y);
    Object.assign(cutter, { built: true, progress: 1 });
    cutter.out.log = 2;
    const hqLogs = g.hq.stock.log;
    runUntil(g, () => s.stock.log === 2, 120, () => expectIncomingConsistent(g));
    expect(g.hq.stock.log).toBe(hqLogs);
  });

  test('goods go to the store that is nearest on foot, not as the crow flies', () => {
    const g = flatGame();
    const s = placeBare(g, 'storehouse', g.hq.x + 10, g.hq.y);
    runUntil(g, () => s.built, 300);
    // The woodcutter is 4 tiles from the storehouse and 6 from the HQ, but water lies between it
    // and the storehouse, so the walk there is much longer.
    for (let y = s.y - 8; y <= s.y + 8; y++) g.world.at(s.x - 2, y).t = 'water';
    const cutter = placeBare(g, 'woodcutter', g.hq.x + 6, g.hq.y);
    Object.assign(cutter, { built: true, progress: 1 });
    cutter.out.log = 1;
    const hqLogs = g.hq.stock.log;
    runUntil(g, () => g.hq.stock.log === hqLogs + 1, 120);
    expect(s.stock.log).toBe(0);
  });

  test('the goods count adds up every store', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 1, plank: 2, stone: 3 });
    const { log, plank, stone, tool } = g.hq.stock;
    expect(g.stored).toEqual(bag({ log: log + 1, plank: plank + 2, stone: stone + 3, tool }));
  });

  test('an unfinished storehouse stores nothing', () => {
    const g = flatGame();
    const s = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    expect(g.isStore(s)).toBe(false);
  });

  test('save and load keep stored goods', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 1, plank: 2, stone: 3 });
    const h = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(h.buildings.get(s.id)).toMatchObject({ stock: s.stock, status: 'Storing goods' });
  });
});
