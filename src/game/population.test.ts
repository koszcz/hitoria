import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { flatGame, run, runUntil, expectIncomingConsistent } from './test-helpers';

function placeLinked(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = g.place(type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  return b;
}

describe('population', () => {
  test('a house turns food into a new settler', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.hq.stock.fish = 2;
    const house = placeLinked(g, 'house', x + 4, y - 3);
    runUntil(g, () => house.built, 120);
    const before = g.population;
    runUntil(g, () => house.status === 'A settler will be born soon', 60);
    run(g, 39);
    expect(g.population).toBe(before);
    run(g, 1.5);
    expect(g.population).toBe(before + 1);
    expect(g.toasts).toContain('👶 A new settler was born');
  });

  test('a house with no food adds no one', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const house = placeLinked(g, 'house', x + 4, y - 3);
    runUntil(g, () => house.built, 120);
    const before = g.population;
    run(g, 200);
    expect(g.population).toBe(before);
    expect(house.status).toBe('Waiting for fish or bread');
  });

  test('a house adds 4 settlers, then stops taking food', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.hq.stock.fish = 3;
    g.hq.stock.bread = 5;
    const house = placeLinked(g, 'house', x + 4, y - 3);
    runUntil(g, () => house.built, 120);
    const before = g.population;
    runUntil(g, () => house.status === 'House is full', 400, () => expectIncomingConsistent(g));
    run(g, 100);
    expect(g.population).toBe(before + 4);
    // Fish or bread, the house eats one food per settler and leaves the rest in the HQ.
    expect(g.stored.fish + g.stored.bread).toBe(4);
    expect(house.stock.fish + house.stock.bread).toBe(0);
  });

  test('a save keeps how far each house has got', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.hq.stock.fish = 2;
    const house = placeLinked(g, 'house', x + 4, y - 3);
    runUntil(g, () => house.born === 1, 200);
    runUntil(g, () => house.busy && house.grow < 30, 60);
    const pop = g.population;
    const l = Game.load(g.save());
    const h = l.buildings.get(house.id)!;
    expect(l.population).toBe(pop);
    expect(h.born).toBe(1);
    // The settler on the way is born after the time that was left, not from scratch.
    runUntil(l, () => l.population === pop + 1, 31);
  });

  test('a save from before houses still loads', () => {
    const g = flatGame();
    const d = g.save();
    for (const b of d.buildings) {
      delete (b as Partial<typeof b>).born;
      delete (b as Partial<typeof b>).grow;
    }
    const l = Game.load(d);
    expect(l.hq.born).toBe(0);
    expect(l.hq.grow).toBe(0);
  });
});
