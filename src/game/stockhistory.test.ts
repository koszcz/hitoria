// The goods chart's record: how much of each good the stores held, every few seconds.
import { describe, expect, test } from 'bun:test';
import { Game } from './game';
import { HISTORY_EVERY, HISTORY_KEEP } from './stockhistory';
import { run } from './test-helpers';

describe('the stock history', () => {
  test('a new game notes the stores as soon as it starts', () => {
    const g = new Game(1);
    run(g, 0.3);
    expect(g.stockHistory.length).toBe(1);
    expect(g.stockHistory[0].stock.plank).toBe(24);
    expect(g.stockHistory[0].stock.stone).toBe(14);
  });

  test('it notes the stores once every few seconds', () => {
    const g = new Game(1);
    run(g, HISTORY_EVERY * 3 + 0.5);
    expect(g.stockHistory.length).toBe(4);
    expect(g.stockHistory.map((s) => Math.floor(s.t / HISTORY_EVERY))).toEqual([0, 1, 2, 3]);
  });

  test('a note keeps what the stores held then, not what they hold later', () => {
    const g = new Game(1);
    run(g, 0.3);
    g.hq.stock.plank = 3;
    run(g, HISTORY_EVERY);
    expect(g.stockHistory[0].stock.plank).toBe(24);
    expect(g.stockHistory[1].stock.plank).toBe(3);
  });

  test('it forgets the oldest notes once it holds an hour of them', () => {
    const g = new Game(1);
    run(g, HISTORY_EVERY * (HISTORY_KEEP + 5), undefined, 0.25);
    expect(g.stockHistory.length).toBe(HISTORY_KEEP);
    const span = g.stockHistory.at(-1)!.t - g.stockHistory[0].t;
    expect(Math.round(span / HISTORY_EVERY)).toBe(HISTORY_KEEP - 1);
  });

  test('a loaded game starts a fresh record', () => {
    const g = new Game(1);
    run(g, HISTORY_EVERY * 2);
    const back = Game.load(g.save());
    expect(back.stockHistory.length).toBe(0);
  });
});
