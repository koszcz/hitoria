// Saving a game and loading it back.
import { describe, expect, test } from 'bun:test';
import { Game, SAVE_VERSION, bag } from '.';
import { flatGame, runUntil, totalGoods, expectIncomingConsistent, placeLinked } from './test-helpers';

describe('save and load', () => {
  test('a JSON round trip keeps every good and settler', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'carrier' && s.carrying), 120);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(totalGoods(g2)).toEqual(before);
    expect(g2.population).toBe(18);
    expect(g2.settlers.size).toBe(0);
    expect(g2.roads.size).toBe(g.roads.size);
    expect(g2.flags.size).toBe(g.flags.size);
    expectIncomingConsistent(g2);
    // The loaded game carries on and finishes the job.
    const b2 = g2.buildings.get(b.id)!;
    runUntil(g2, () => b2.built, 300);
  });

  test('a good in a worker\'s hands is put back in their hut on save', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 3, b.y - 2).tree = 1;
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'woodcutter' && s.carrying), 300);
    const before = totalGoods(g);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(totalGoods(g2)).toEqual(before);
    expect(g2.buildings.get(b.id)!.out.log).toBe(1);
  });

  test('saving does not change the running game', () => {
    const g = flatGame();
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'carrier' && s.carrying), 120);
    const goods = totalGoods(g), settlers = g.settlers.size;
    g.save();
    expect(totalGoods(g)).toEqual(goods);
    expect(g.settlers.size).toBe(settlers);
  });

  test('keeps changes to the map, such as felled trees', () => {
    const g = flatGame();
    const t = { x: g.hq.x + 5, y: g.hq.y - 5 };
    g.world.at(t.x, t.y).tree = 1;
    g.world.at(t.x + 1, t.y).rock = 2;
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.world.at(t.x, t.y).tree).toBe(1);
    expect(g2.world.at(t.x + 1, t.y).rock).toBe(2);
  });

  test('a carrier\'s good goes back to where it came from on save', () => {
    const g = flatGame();
    const before = totalGoods(g);
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'carrier' && s.carrying), 120);
    const d = g.save();
    const hq = d.buildings.find((b) => b.id === g.hq.id)!;
    expect(hq.stock.plank + hq.stock.stone).toBeGreaterThan(g.hq.stock.plank + g.hq.stock.stone);
    for (const b of d.buildings) expect(b.incoming).toEqual(bag());
    expect(totalGoods(Game.load(d))).toEqual(before);
  });

  test('a version 2 save puts goods lying on flags into the HQ', () => {
    const g = flatGame();
    const site = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    const d = JSON.parse(JSON.stringify(g.save()));
    d.v = 2;
    const end = d.flags.find((f: { id: number }) => f.id !== g.hq.flag && f.id !== site.flag) ?? d.flags[0];
    end.items = [{ g: 'plank', dest: site.id }, { g: 'stone', dest: 0 }];
    for (const r of d.roads) r.carrier = 0;
    d.buildings.find((b: { id: number }) => b.id === site.id).incoming.plank = 1;
    const l = Game.load(d);
    expect(l.hq.stock.plank).toBe(g.hq.stock.plank + 1);
    expect(l.hq.stock.stone).toBe(g.hq.stock.stone + 1);
    expect(l.buildings.get(site.id)!.incoming.plank).toBe(0);
    expect([...l.flags.values()].some((f) => 'items' in f)).toBe(false);
    expect([...l.roads.values()].some((r) => 'carrier' in r)).toBe(false);
    runUntil(l, () => l.buildings.get(site.id)!.built, 300);
  });

  test('refuses a save from another version', () => {
    const d = new Game(1).save();
    expect(() => Game.load({ ...d, v: SAVE_VERSION + 1 })).toThrow();
  });
});
