// Placing a building lays its road to the nearest flag or road that is already joined to the HQ.
import { describe, expect, test } from 'bun:test';
import { flatGame } from './test-helpers';

// The road that ends at flag `fid`, laid last.
const lastRoad = (g: ReturnType<typeof flatGame>, fid: number) => {
  const roads = g.flags.get(fid)!.roads;
  return g.roads.get(roads[roads.length - 1])!;
};

describe('auto road for new buildings', () => {
  test('a building placed near the HQ gets a road to it', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    expect(g.linked(b)).toBe(true);
    expect(g.roads.size).toBe(1);
  });

  test('joins an existing road instead of running beside it', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.buildRoad(g.hq.flag, { x: x + 8, y: y + 1 });
    const b = g.place('woodcutter', x + 5, y - 2);
    expect(g.linked(b)).toBe(true);
    // Its flag is at y - 1, two steps above the road along y + 1.
    const path = lastRoad(g, b.flag).path;
    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ x: x + 5, y: y - 1 });
    expect(path[2].y).toBe(y + 1);
    expect(g.world.at(path[2].x, path[2].y).flag).toBeGreaterThan(0);
  });

  test('ignores roads that are not joined to the HQ', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const lone = g.startFlag({ x: x + 6, y: y - 5 });
    if (typeof lone === 'string') throw new Error(lone);
    g.buildRoad(lone.id, { x: x + 6, y: y - 1 });
    // The lone road is two steps away. The HQ's flag is further, but joined.
    const b = g.place('woodcutter', x + 4, y - 3);
    expect(g.linked(b)).toBe(true);
  });

  test('a flag that lands on a joined road needs no new road', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.buildRoad(g.hq.flag, { x: x + 4, y: y + 1 });
    expect(g.roads.size).toBe(1);
    // The flag in front of this building splits the road in two.
    const b = g.place('woodcutter', x + 2, y);
    expect(g.linked(b)).toBe(true);
    expect(g.roads.size).toBe(2);
  });

  test('a long road gets no flags along the way', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x, g.hq.y - 8);
    expect(g.linked(b)).toBe(true);
    expect(g.roads.size).toBe(1);
    expect(g.flags.size).toBe(2);
  });

  test('a building no road can reach stays without one', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    for (let dy = -2; dy <= 3; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) === 2 || dy === -2 || dy === 3) g.world.at(bx + dx, by + dy).t = 'water';
    const b = g.place('woodcutter', bx, by);
    expect(g.linked(b)).toBe(false);
    expect(g.roads.size).toBe(0);
  });

  test('the planned road shown while placing is the road the building gets', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.buildRoad(g.hq.flag, { x: x + 8, y: y + 1 });
    const plan = g.planAutoRoad('woodcutter', x + 6, y - 4);
    expect(plan?.length).toBeGreaterThan(1);
    const b = g.place('woodcutter', x + 6, y - 4);
    const flags = new Set([...g.flags.values()].map((f) => `${f.x},${f.y}`));
    const tiles = new Set([...g.roads.values()].flatMap((r) => r.path.map((p) => `${p.x},${p.y}`)));
    for (const p of plan!) expect(tiles.has(`${p.x},${p.y}`) || flags.has(`${p.x},${p.y}`)).toBe(true);
    const f = g.flags.get(b.flag)!;
    expect(plan![0]).toEqual({ x: f.x, y: f.y });
  });
});
