// Saving a game and loading it back.
import { describe, expect, test } from 'bun:test';
import { Game, SAVE_VERSION } from '.';
import { MAP_VERSION, World } from '../world';
import { flatGame, runUntil, totalGoods, expectIncomingConsistent, placeLinked } from './test-helpers';

describe('save and load', () => {
  test('a JSON round trip keeps every good and settler', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
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
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
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

  test('records the map version, and a save from before map versions loads on the old map', () => {
    const d = new Game(1).save();
    expect(d.map).toBe(MAP_VERSION);
    const old = { ...d, v: 2, map: undefined };
    expect(Game.load(old).world.tiles.map((t) => t.t)).toEqual(new World(1, 1).tiles.map((t) => t.t));
    expect(Game.load(d).world.tiles.map((t) => t.t)).toEqual(new World(1).tiles.map((t) => t.t));
  });

  test('refuses a save from another version', () => {
    const d = new Game(1).save();
    expect(() => Game.load({ ...d, v: SAVE_VERSION + 1 })).toThrow();
  });
});
