// Saving a game and loading it back.
import { describe, expect, test } from 'bun:test';
import { Game, SAVE_VERSION, bag, type SaveData } from '.';
import { MAP_VERSION, World } from '../world';
import { HUGE_SIZE as W } from '../land/size';
import type { Building } from './types';
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
    expectIncomingConsistent(g2);
    // The loaded game carries on and finishes the job.
    const b2 = g2.buildings.get(b.id)!;
    runUntil(g2, () => b2.built, 300);
  });

  test('a good in a worker\'s hands is put back in their hut on save', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 3, b.y - 2).tree = 1;
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'woodcutter' && s.carrying === 'log'), 300);
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
    const d = withRoad(g, site);
    d.v = 2;
    d.flags![1].items = [{ g: 'plank' }, { g: 'stone' }];
    d.buildings.find((b: { id: number }) => b.id === site.id)!.incoming.plank = 1;
    const l = Game.load(d);
    expect(l.hq.stock.plank).toBe(g.hq.stock.plank + 1);
    expect(l.hq.stock.stone).toBe(g.hq.stock.stone + 1);
    expect(l.buildings.get(site.id)!.incoming.plank).toBe(0);
    runUntil(l, () => l.buildings.get(site.id)!.built, 300);
  });

  test('a save from before version 6 loads, and its roads and flags become worn paths', () => {
    const g = flatGame();
    const site = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    const d = withRoad(g, site);
    const l = Game.load(JSON.parse(JSON.stringify(d)));
    for (let x = g.hq.x; x <= site.x; x++) expect(l.wear[(g.hq.y + 1) * W + x]).toBe(1);
    expect(l.wear[(g.hq.y + 5) * W + g.hq.x]).toBe(0);
    for (const b of l.buildings.values()) expect(b).not.toHaveProperty('flag');
    expect(l).not.toHaveProperty('roads');
    // The tiles and buildings load where they were.
    expect(l.world.at(site.x, site.y).b).toBe(site.id);
    expect(l.save().tiles).toEqual(Game.load(JSON.parse(JSON.stringify(l.save()))).save().tiles);
    runUntil(l, () => l.buildings.get(site.id)!.built, 300);
  });

  test('a new save holds no roads or flags', () => {
    const d = flatGame().save();
    expect(d.v).toBe(SAVE_VERSION);
    expect(d).not.toHaveProperty('roads');
    expect(d).not.toHaveProperty('flags');
    expect(d.tiles[0]).toHaveLength(7);
  });

  test('records the map version, and a save from before map versions loads on the old map', () => {
    const d = new Game(1).save();
    expect(d.map).toBe(MAP_VERSION);
    // Saves from before map version 9 hold a 64 by 64 map.
    const small = new Game(1, 8).save();
    const old = { ...small, v: 2, map: undefined };
    expect(Game.load(old).world.tiles.map((t) => t.t)).toEqual(new World(1, 1).tiles.map((t) => t.t));
    // Version 3 saves came after the map changed, so they load on map 2.
    const v3 = { ...small, v: 3, map: undefined };
    expect(Game.load(v3).world.tiles.map((t) => t.t)).toEqual(new World(1, 2).tiles.map((t) => t.t));
    expect(Game.load(d).world.tiles.map((t) => t.t)).toEqual(new World(1).tiles.map((t) => t.t));
  });

  test('refuses a save from another version', () => {
    const d = new Game(1).save();
    expect(() => Game.load({ ...d, v: SAVE_VERSION + 1 })).toThrow();
  });
});

// The game saved as a version 5 save: each tile also holds a flag and a road, and a road runs
// from the HQ's flag east along the row in front of it to the flag of building `to`.
function withRoad(g: Game, to: Building): SaveData {
  const d = g.save();
  const y = g.hq.y + 1;
  const flags: { id: number; x: number; y: number; roads: number[]; building: number; items?: unknown[] }[] = [
    { id: 9001, x: g.hq.x, y, roads: [9003], building: g.hq.id },
    { id: 9002, x: to.x, y, roads: [9003], building: 0 },
  ];
  const path = [];
  for (let x = g.hq.x; x <= to.x; x++) path.push({ x, y });
  const tiles = (d.tiles as number[][]).map(([tree, conifer, rock, b, crop, field, wear], i) => {
    const tx = i % W, ty = Math.floor(i / W);
    const onRoad = ty === y && tx > g.hq.x && tx < to.x;
    const flag = flags.find((f) => f.x === tx && f.y === ty)?.id ?? 0;
    return [tree, conifer, rock, b, flag, onRoad ? 9003 : 0, crop, field, wear];
  });
  for (const b of d.buildings) Object.assign(b, { flag: b.id === g.hq.id ? 9001 : 9002 });
  return { ...d, v: 5, tiles, flags, roads: [{ id: 9003, a: 9001, b: 9002, path, carrier: 0 }] } as unknown as SaveData;
}
