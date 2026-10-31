// Building and removing roads and flags.
import { describe, expect, test } from 'bun:test';
import { flatGame, placeLinked, placeBare } from './test-helpers';

describe('roads and flags', () => {
  test('a road links a building to the HQ', () => {
    const g = flatGame();
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    expect(g.linked(b)).toBe(false);
    g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    expect(g.linked(b)).toBe(true);
    expect(g.roads.size).toBe(1);
    const r = [...g.roads.values()][0];
    // The road's inner tiles are marked; its end tiles are the two flags.
    for (const p of r.path.slice(1, -1)) expect(g.world.at(p.x, p.y).road).toBe(r.id);
    expect(g.flags.get(b.flag)!.roads).toEqual([r.id]);
    expect(g.flags.get(g.hq.flag)!.roads).toEqual([r.id]);
  });

  test('a long road gets flags only at its ends', () => {
    const g = flatGame();
    const end = g.buildRoad(g.hq.flag, { x: g.hq.x + 9, y: g.hq.y + 1 });
    expect(typeof end).not.toBe('string');
    expect(g.roads.size).toBe(1);
    expect(g.flags.size).toBe(2);
  });

  test('starting a road on an existing road splits it with a new flag', () => {
    const g = flatGame();
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    expect(g.roads.size).toBe(1);
    const mid = { x: g.hq.x + 2, y: g.hq.y + 1 };
    const f = g.startFlag(mid);
    expect(typeof f).not.toBe('string');
    expect(g.roads.size).toBe(2);
    expect(g.world.at(mid.x, mid.y).flag).toBeGreaterThan(0);
    expect(g.linked(b)).toBe(true);
  });

  test('refuses roads that go nowhere or end beside another flag', () => {
    const g = flatGame();
    const hf = g.flags.get(g.hq.flag)!;
    expect(g.planRoad(hf.id, hf)).toBeNull();
    g.buildRoad(hf.id, { x: hf.x + 6, y: hf.y });
    expect(g.planRoad(hf.id, { x: hf.x + 7, y: hf.y + 1 })).toBeNull();
    expect(g.buildRoad(hf.id, { x: hf.x + 7, y: hf.y + 1 })).toBe('No room for a road there');
  });

  test('removing a road unlinks the building', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const r = [...g.roads.values()][0];
    const p = r.path[1];
    expect(g.removeAt(p)).toBeNull();
    expect(g.roads.size).toBe(0);
    for (const q of r.path) expect(g.world.at(q.x, q.y).road).toBe(0);
    expect(g.linked(b)).toBe(false);
  });

  test('removing a flag removes its roads too', () => {
    const g = flatGame();
    const end = g.buildRoad(g.hq.flag, { x: g.hq.x + 4, y: g.hq.y + 1 });
    if (typeof end === 'string') throw new Error(end);
    expect(g.removeAt(end)).toBeNull();
    expect(g.flags.has(end.id)).toBe(false);
    expect(g.roads.size).toBe(0);
    expect(g.flags.get(g.hq.flag)!.roads).toEqual([]);
  });

  test("won't remove a building's flag", () => {
    const g = flatGame();
    expect(g.removeAt(g.flags.get(g.hq.flag)!)).toBe("A building's own flag can't be removed");
    expect(g.removeAt({ x: g.hq.x + 3, y: g.hq.y - 3 })).toBe('Nothing to remove here');
  });
});
