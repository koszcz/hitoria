// The chronicle: a dated list of the island's milestones, kept with the save.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS } from '.';
import { DAY_LENGTH } from '../seasons/day';
import { flatGame, harbourGame, placeLinked, run, runUntil } from './test-helpers';

describe('the chronicle', () => {
  test('a new island has an empty chronicle', () => {
    expect(flatGame().chronicle).toEqual([]);
  });

  test('it notes the first birth, with the day, and no later births', () => {
    const g = flatGame();
    g.time = DAY_LENGTH * 2; // day 3
    g.hq.stock.fish = 20;
    const house = placeLinked(g, 'house', g.hq.x + 4, g.hq.y - 3);
    runUntil(g, () => house.born >= 2, 400);
    expect(g.chronicle.filter((e) => e.what === 'born')).toEqual([{ day: 3, what: 'born' }]);
  });

  test('it notes the first building of each kind, but not the second', () => {
    const g = flatGame();
    const a = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y + 3);
    const b = placeLinked(g, 'woodcutter', g.hq.x - 4, g.hq.y + 3);
    runUntil(g, () => a.built && b.built, 300);
    expect(g.chronicle).toEqual([{ day: 1, what: 'built', type: 'woodcutter' }]);
  });

  test('it notes each goal reached', () => {
    const g = flatGame();
    g.made.plank = 50;
    run(g, 0.5);
    expect(g.chronicle).toContainEqual({ day: 1, what: 'goal', goal: GOALS[0].id });
  });

  test('it notes every tenth trade ship', () => {
    const { g } = harbourGame();
    g.tradeVisits = 8;
    runUntil(g, () => g.trader?.leg === 'docked', 200);
    expect(g.tradeVisits).toBe(9);
    expect(g.chronicle.some((e) => e.what === 'trade')).toBe(false);
    runUntil(g, () => !g.trader, DAY_LENGTH, undefined, 0.5);
    runUntil(g, () => g.trader?.leg === 'docked', DAY_LENGTH, undefined, 0.5);
    expect(g.chronicle.filter((e) => e.what === 'trade')).toEqual([{ day: expect.any(Number), what: 'trade', n: 10 }]);
  });

  test('a saved game keeps its chronicle and trade count', () => {
    const g = flatGame();
    g.made.plank = 50;
    g.tradeVisits = 4;
    run(g, 0.5);
    const l = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(l.chronicle).toEqual(g.chronicle);
    expect(l.tradeVisits).toBe(4);
  });

  test('a save from before the chronicle loads with an empty one', () => {
    const d = JSON.parse(JSON.stringify(flatGame().save()));
    delete d.chronicle;
    delete d.tradeVisits;
    const l = Game.load(d);
    expect(l.chronicle).toEqual([]);
    expect(l.tradeVisits).toBe(0);
  });
});
