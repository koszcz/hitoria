// Farms keep their own fields: where a farm may go, which tiles it takes, and what may not use them.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { W } from '../world';
import { flatGame, placeBare, placeLinked, run, runUntil } from './test-helpers';

const fieldsOf = (g: Game, id: number) => g.world.tiles.flatMap((t, i) => (t.field === id ? [i] : []));
const at = (i: number) => ({ x: i % W, y: Math.floor(i / W) });

describe('farm fields', () => {
  test('a farm needs room for its fields', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const fx = x + 6, fy = y - 5;
    expect(g.canPlace('farm', fx, fy)).toBeNull();
    // Sand on every tile 2 or 3 steps away leaves no grass to sow, though roads still cross it.
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2) g.world.at(fx + dx, fy + dy).t = 'sand';
    expect(g.canPlace('farm', fx, fy)).toBe('No room for its fields');
    // Other buildings don't need fields.
    expect(g.canPlace('mill', fx, fy)).toBeNull();
  });

  test('a new farm takes its 6 fields right away, and no building may go on them', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 6, y - 5);
    const fields = fieldsOf(g, farm.id).map(at);
    expect(fields).toHaveLength(6);
    for (const p of fields) {
      expect(Math.hypot(p.x - farm.x, p.y - farm.y)).toBeLessThanOrEqual(3);
      expect(g.canPlace('woodcutter', p.x, p.y)).toBe('This is a farm field');
    }
  });

  test('roads and flags go around fields', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeBare(g, 'farm', x, y - 4); // no road of its own in the way
    const fields = fieldsOf(g, farm.id).map(at);
    expect(g.buildRoad(g.hq.flag, fields[0])).toBe('No room for a road there');
    // A road from one side of the farm to the other walks round its fields.
    const west = g.startFlag({ x: farm.x - 5, y: farm.y });
    if (typeof west === 'string') throw new Error(west);
    const end = g.buildRoad(west.id, { x: farm.x + 5, y: farm.y });
    if (typeof end === 'string') throw new Error(end);
    for (const r of g.roads.values()) for (const p of r.path) expect(g.world.at(p.x, p.y).field).toBe(0);
  });

  test('a farmer sows only its own fields, and a forester never plants on them', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 6, y - 5);
    const forester = placeLinked(g, 'forester', x + 3, y - 7);
    runUntil(g, () => farm.built && forester.built, 200);
    const sown = () => g.world.tiles.filter((t) => t.crop > 0);
    runUntil(g, () => sown().length >= 6, 200);
    run(g, 60);
    for (const t of sown()) expect(t.field).toBe(farm.id);
    for (const t of g.world.tiles) if (t.field) expect(t.tree).toBe(0);
    expect(g.world.tiles.some((t) => t.tree > 0 && t.tree < 1)).toBe(true); // the forester did plant elsewhere
  });

  test('a save keeps every farm\'s fields', () => {
    const g = flatGame();
    const farm = placeLinked(g, 'farm', g.hq.x + 6, g.hq.y - 5);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(fieldsOf(g2, farm.id)).toEqual(fieldsOf(g, farm.id));
  });

  test('a farm from a save made before fields gets its fields on load, keeping its grain', () => {
    const g = flatGame();
    const farm = placeLinked(g, 'farm', g.hq.x + 6, g.hq.y - 5);
    const fields = fieldsOf(g, farm.id);
    g.world.tiles[fields[0]].crop = 0.5;
    const d = g.save();
    d.tiles = d.tiles.map(([tree, conifer, rock, b, flag, road, crop]) => [tree, conifer, rock, b, flag, road, crop]);
    const g2 = Game.load(JSON.parse(JSON.stringify(d)));
    expect(fieldsOf(g2, farm.id)).toEqual(fields);
    expect(g2.world.tiles[fields[0]].crop).toBe(0.5);
  });

  test('before you place a farm, the game shows its fields and a road that keeps off them', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.planFields('mill', x, y + 5)).toEqual([]);
    const planned = g.planFields('farm', x, y + 5);
    expect(planned).toHaveLength(6);
    // The farm sits south of the HQ, so its fields lie on the short way round the farm to the HQ.
    const road = g.planAutoRoad('farm', x, y + 5)!;
    for (const p of road) expect(planned).not.toContainEqual(p);
    const farm = g.place('farm', x, y + 5);
    const byTile = (ps: { x: number; y: number }[]) => ps.map((p) => p.y * W + p.x).sort((a, b) => a - b);
    expect(fieldsOf(g, farm.id)).toEqual(byTile(planned));
  });
});
