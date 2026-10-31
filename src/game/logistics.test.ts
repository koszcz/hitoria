// Goods finding their way to the buildings that need them, and storehouses.
import { describe, expect, test } from 'bun:test';
import { Game, bag } from '.';
import { flatGame, run, runUntil, totalGoods, expectIncomingConsistent, placeLinked } from './test-helpers';

describe('logistics', () => {
  test('cutting a road mid-delivery loses no goods', () => {
    const g = flatGame();
    const before = totalGoods(g);
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
    const r = [...g.roads.values()].find((r) => g.settlers.get(r.carrier)?.item)!;
    const item = g.settlers.get(r.carrier)!.item!;
    g.removeAt(r.path[1]);
    // The carrier drops the good on the nearer flag, where it waits for a new route.
    expect([r.a, r.b].some((id) => g.flags.get(id)!.items.includes(item))).toBe(true);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
    run(g, 60, () => {
      expect(totalGoods(g)).toEqual(before);
      expect(g.population).toBe(18);
      expectIncomingConsistent(g);
    });
  });

  test('removing a flag with goods on it sends them back to the HQ', () => {
    const g = flatGame();
    const before = totalGoods(g);
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    const loaded = () => [...g.flags.values()].find((f) => !f.building && f.items.length);
    runUntil(g, () => !!loaded(), 120);
    const f = loaded()!;
    const stock = { ...g.hq.stock };
    expect(g.removeAt(f)).toBeNull();
    expect(g.hq.stock.plank + g.hq.stock.stone).toBeGreaterThan(stock.plank + stock.stone);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
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
  // A finished storehouse east of the HQ, joined to it by road.
  function storehouse(g: Game) {
    const s = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    runUntil(g, () => s.built, 300);
    expect(s.status).toBe('Storing goods');
    return s;
  }

  test('spare goods go to the nearest store, not the HQ', () => {
    const g = flatGame();
    const s = storehouse(g);
    // The woodcutter's only road runs through the storehouse's flag.
    const cutter = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(cutter.flag, g.flags.get(s.flag)!);
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
    const site = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(site.flag, g.flags.get(s.flag)!);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(3);
    expect(g.hq.stock).toEqual(hq);
  });

  test('when the nearest store runs out, a farther one sends the rest', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 0, plank: 1, stone: 0 });
    const site = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(site.flag, g.flags.get(s.flag)!);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(0);
  });

  test('the goods count adds up every store', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 1, plank: 2, stone: 3 });
    const { log, plank, stone } = g.hq.stock;
    expect(g.stored).toEqual(bag({ log: log + 1, plank: plank + 2, stone: stone + 3 }));
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
