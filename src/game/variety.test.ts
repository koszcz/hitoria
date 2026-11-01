// Mixed food: a house or worker that gets a new kind of food grows settlers faster or eats less often.
import { describe, expect, test } from 'bun:test';
import { HOUSE_GROW } from './defs';
import { raise } from './houses';
import { feed, MEAL } from './meals';
import { MIXED_GROW, MIXED_MEAL } from './variety';
import { flatGame, placeBare, placeLinked, runUntil } from './test-helpers';
import type { Building, Task } from './types';

const work = (t: number): Task[] => [{ k: 'work', t }];

// Seconds of work one meal lasts, eaten from what is in the hut's stock now.
function mealLength(b: Building) {
  b.fed = 0;
  feed(b, work(1));
  return (b.fed ?? 0) + 1;
}

describe('mixed meals for workers', () => {
  test('a meal of a new kind lasts longer than the same food again', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', 1, 1);
    b.stock.fish = 1;
    expect(mealLength(b)).toBe(MEAL); // the first meal has nothing to differ from
    b.stock.fish = 1;
    expect(mealLength(b)).toBe(MEAL);
    b.stock.bread = 1;
    expect(mealLength(b)).toBe(MEAL * MIXED_MEAL);
    b.stock.bread = 1;
    expect(mealLength(b)).toBe(MEAL);
  });

  test('a worker picks a different food from last time when it can', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', 1, 1);
    b.stock.fish = 1;
    mealLength(b);
    b.stock.fish = 1;
    b.stock.meat = 1;
    mealLength(b);
    expect(b.stock).toMatchObject({ fish: 1, meat: 0 });
  });

  test('a saved game remembers what each worker ate last', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', g.hq.x - 4, g.hq.y);
    b.stock.fish = 1;
    mealLength(b);
    const g2 = (g.constructor as typeof import('.').Game).load(JSON.parse(JSON.stringify(g.save())));
    const b2 = g2.buildings.get(b.id)!;
    b2.stock.bread = 1;
    expect(mealLength(b2)).toBe(MEAL * MIXED_MEAL);
  });
});

describe('mixed food for houses', () => {
  // Seconds until the house's next settler, right after it eats what is in its stock.
  function growTime(g: ReturnType<typeof flatGame>, house: Building) {
    raise(g, house, 0);
    return house.grow;
  }

  test('a house grows a settler faster from a new kind of food', () => {
    const g = flatGame();
    const house = placeBare(g, 'house', g.hq.x + 4, g.hq.y - 3);
    house.built = true;
    house.stock.fish = 1;
    expect(growTime(g, house)).toBe(HOUSE_GROW);
    raise(g, house, HOUSE_GROW);
    house.stock.fish = 1;
    expect(growTime(g, house)).toBe(HOUSE_GROW);
    raise(g, house, HOUSE_GROW);
    house.stock.meat = 1;
    expect(growTime(g, house)).toBe(HOUSE_GROW * MIXED_GROW);
  });
});

describe('mixed food for miners', () => {
  test('a miner digs more stone from a new kind of food', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let ty = y - 1; ty <= y + 1; ty++) for (let tx = x + 7; tx <= x + 8; tx++) g.world.at(tx, ty).t = 'mountain';
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    const mine = placeLinked(g, 'mine', x + 5, y);
    runUntil(g, () => mine.built && mine.worker > 0, 300);
    mine.stock.fish = 2;
    runUntil(g, () => mine.stock.fish === 0 && !mine.busy, 120);
    const same = g.made.stone;
    mine.stock.bread = 1;
    runUntil(g, () => mine.stock.bread === 0 && !mine.busy, 120);
    expect(same).toBe(4);
    expect(g.made.stone - same).toBe(3);
  });
});
