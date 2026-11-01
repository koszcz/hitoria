// Food makers eat first: when food is short, farms, wells and mills get it before other huts,
// and houses get it last.
import { describe, expect, test } from 'bun:test';
import type { Game } from '.';
import { foodRank } from './foodrank';
import { flatGame, run, expectIncomingConsistent, placeLinked } from './test-helpers';

// A built building, so the test can skip waiting for builders.
function built(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  const b = placeLinked(g, type, x, y);
  Object.assign(b, { built: true, progress: 1 });
  return b;
}

// Fish that reached a building, is on its way there, or was eaten there.
const got = (b: ReturnType<typeof built>) =>
  b.stock.fish + b.incoming.fish + ((b.fed ?? 0) > 0 || b.busy ? 1 : 0);

function noFood(g: Game) {
  for (const b of g.buildings.values()) b.stock.fish = b.stock.bread = b.stock.meat = 0;
}

describe('food rank', () => {
  test('farms, wells and mills come first, other huts and mines next, houses last', () => {
    for (const t of ['farm', 'well', 'mill'] as const) expect(foodRank(t)).toBe(0);
    for (const t of ['woodcutter', 'sawmill', 'mine', 'smelter'] as const) expect(foodRank(t)).toBe(1);
    expect(foodRank('house')).toBe(2);
  });
});

describe('food makers eat first', () => {
  test('the HQ sends its last fish to a farm, not to a house built earlier', () => {
    const g = flatGame();
    noFood(g);
    const { x, y } = g.hq;
    const house = built(g, 'house', x + 3, y);
    const farm = built(g, 'farm', x - 6, y - 4);
    g.hq.stock.fish = 1;
    run(g, 5, () => expectIncomingConsistent(g));
    expect(got(farm)).toBe(1);
    expect(got(house)).toBe(0);
  });

  test('a mine gets the last fish before a house', () => {
    const g = flatGame();
    noFood(g);
    const { x, y } = g.hq;
    const house = built(g, 'house', x + 3, y);
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 8; xx <= x - 7; xx++) g.world.at(xx, yy).t = 'mountain';
    const mine = built(g, 'mine', x - 5, y);
    g.hq.stock.fish = 1;
    run(g, 5, () => expectIncomingConsistent(g));
    expect(got(mine)).toBe(1);
    expect(got(house)).toBe(0);
  });

  test("a fisher's catch goes to a farther farm before a nearer house", () => {
    const g = flatGame();
    noFood(g);
    const { x, y } = g.hq;
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x + 11; xx <= x + 12; xx++) g.world.at(xx, yy).t = 'water';
    const fisher = built(g, 'fisher', x + 8, y);
    const house = built(g, 'house', x + 5, y + 3);
    const farm = built(g, 'farm', x - 6, y - 4);
    fisher.out.fish = 2; // the fisher keeps one for itself
    run(g, 2, () => expectIncomingConsistent(g));
    expect(got(farm)).toBe(1);
    expect(got(house)).toBe(0);
  });
});
