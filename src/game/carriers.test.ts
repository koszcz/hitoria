// Carriers: when they come out, and when they go home.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { expectIncomingConsistent, flatGame, run, runUntil, placeLinked, totalGoods } from './test-helpers';

describe('carriers', () => {
  const carriers = (g: Game) => [...g.settlers.values()].filter((s) => s.role === 'carrier');

  test('roads with nothing to carry get no carrier', () => {
    const g = flatGame();
    g.buildRoad(g.hq.flag, { x: g.hq.x + 9, y: g.hq.y + 1 });
    run(g, 10);
    expect(carriers(g)).toEqual([]);
    expect(g.pool).toBe(18);
  });

  test('carriers go back to the HQ once nothing is left to carry', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => carriers(g).length > 0, 60);
    runUntil(g, () => b.built, 300);
    runUntil(g, () => carriers(g).length === 0, 60);
    expect(g.population).toBe(18);
  });

  test('no more carriers are out than there are buildings', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => b.built, 300, () => expect(carriers(g).length).toBeLessThanOrEqual(g.buildings.size));
  });

  test('a carrier on the way home takes the next trip', () => {
    const g = flatGame();
    const a = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => carriers(g).some((s) => !s.job), 120);
    const free = carriers(g).find((s) => !s.job)!;
    const b = placeLinked(g, 'woodcutter', g.hq.x - 5, g.hq.y - 2);
    runUntil(g, () => !!free.job || !g.settlers.has(free.id), 30);
    runUntil(g, () => a.built && b.built, 300);
  });

  // A carrier whose walk fails gives up the trip; nothing is lost or left promised.
  for (const [when, holding] of [['before', false], ['after', true]] as const)
    test(`a trip given up ${when} the pickup loses no goods`, () => {
      const g = flatGame();
      const before = totalGoods(g);
      placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
      runUntil(g, () => carriers(g).some((s) => s.job && !!s.carrying === holding), 120);
      const s = carriers(g).find((s) => s.job && !!s.carrying === holding)!;
      s.onAbort!();
      expect(g.settlers.has(s.id)).toBe(false);
      expect(totalGoods(g)).toEqual(before);
      expectIncomingConsistent(g);
    });
});
