// Road carriers: when they come out, and when they go home.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { flatGame, run, runUntil, placeLinked } from './test-helpers';

describe('carriers', () => {
  const carriers = (g: Game) => [...g.settlers.values()].filter((s) => s.role === 'carrier');

  test('a road with nothing to carry gets no carrier', () => {
    const g = flatGame();
    g.buildRoad(g.hq.flag, { x: g.hq.x + 9, y: g.hq.y + 1 });
    run(g, 10);
    for (const r of g.roads.values()) expect(r.carrier).toBe(0);
    expect(g.pool).toBe(18);
  });

  test('carriers go back to the HQ once their road has nothing to carry', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => carriers(g).length > 0, 60);
    runUntil(g, () => b.built, 300);
    runUntil(g, () => carriers(g).length === 0, 60);
    for (const r of g.roads.values()) expect(r.carrier).toBe(0);
    expect(g.population).toBe(18);
  });

  test('many empty roads do not use up the settlers a building site needs', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    // Rows of roads across your land, each split into short roads by its flags.
    for (const [dy, w] of [[3, 8], [5, 7], [7, 5], [-5, 7], [-7, 5]]) {
      const start = g.startFlag({ x: x - w, y: y + dy });
      if (typeof start === 'string') throw new Error(start);
      const end = g.buildRoad(start.id, { x: x + w, y: y + dy });
      if (typeof end === 'string') throw new Error(end);
    }
    expect(g.roads.size).toBeGreaterThanOrEqual(18);
    const b = placeLinked(g, 'woodcutter', x + 4, y - 3);
    runUntil(g, () => b.built, 300);
  });
});
