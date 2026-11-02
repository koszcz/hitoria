// Keepsakes: a new island may bring one reward, earned by a goal, from the island the player leaves.
import { describe, expect, test } from 'bun:test';
import { GOALS, Game, START_TOOLS } from '.';
import { bringKeepsake, earnedKeepsakes } from './keepsakes';

const goalIndex = (id: string) => GOALS.findIndex((g) => g.id === id);
const ids = (g: Game) => earnedKeepsakes(g).map((k) => k.id);

describe('keepsakes', () => {
  test('a new island has earned no keepsake', () => {
    expect(ids(new Game(1))).toEqual([]);
  });

  test('each keepsake is earned by reaching its goal', () => {
    const g = new Game(1);
    g.goal = goalIndex('planks') + 1;
    expect(ids(g)).toEqual(['crate']);
    g.goal = goalIndex('settlers') + 1;
    expect(ids(g)).toEqual(['crate', 'friends']);
    g.goal = goalIndex('winter') + 1;
    expect(ids(g)).toEqual(['crate', 'friends', 'larder']);
    g.goal = GOALS.length;
    expect(ids(g)).toEqual(['crate', 'friends', 'larder', 'chest']);
  });

  test('every keepsake names a real goal', () => {
    const g = new Game(1);
    g.goal = GOALS.length;
    for (const k of earnedKeepsakes(g)) expect(goalIndex(k.goal)).toBeGreaterThanOrEqual(0);
  });

  test("the builder's crate adds planks and stone to the new HQ", () => {
    const g = new Game(2);
    bringKeepsake(g, 'crate', 1);
    expect(g.hq.stock.plank).toBe(24 + 20);
    expect(g.hq.stock.stone).toBe(14 + 10);
    expect(g.pool).toBe(18);
  });

  test('old friends add 6 settlers to the new HQ', () => {
    const g = new Game(2);
    bringKeepsake(g, 'friends', 1);
    expect(g.pool).toBe(18 + 6);
    expect(g.population).toBe(18 + 6);
  });

  test('the full larder adds fish and bread', () => {
    const g = new Game(2);
    bringKeepsake(g, 'larder', 1);
    expect(g.hq.stock.fish).toBe(20);
    expect(g.hq.stock.bread).toBe(10);
  });

  test('the iron chest adds iron and tools', () => {
    const g = new Game(2);
    bringKeepsake(g, 'chest', 1);
    expect(g.hq.stock.iron).toBe(5);
    expect(g.hq.stock.tool).toBe(START_TOOLS + 8);
  });

  test('the chronicle notes the keepsake and the island it came from, and keeps it in the save', () => {
    const g = new Game(2);
    bringKeepsake(g, 'chest', 77);
    expect(g.chronicle).toEqual([{ day: 1, what: 'keepsake', id: 'chest', from: 77 }]);
    const back = Game.load(g.save());
    expect(back.chronicle).toEqual([{ day: 1, what: 'keepsake', id: 'chest', from: 77 }]);
    expect(back.hq.stock.iron).toBe(5);
  });

  test('an unknown keepsake is refused', () => {
    expect(() => bringKeepsake(new Game(2), 'gold' as never, 1)).toThrow('No keepsake called gold');
  });
});
