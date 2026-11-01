// Village wishes: after the last goal, one wish at a time, granted or let pass by a season.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS, WISHES, WISH_MIN_TIME } from '.';
import { seasonAt, yearAt, YEAR_LENGTH } from '../seasons/year';
import { wishUntil } from './wishes';
import { flatGame, run } from './test-helpers';

// A game with every goal reached, so the village starts wishing at the next check.
function doneGame() {
  const g = flatGame();
  g.goal = GOALS.length;
  return g;
}

// A game whose wish is `id`, begun now.
function wishGame(id: string) {
  const g = doneGame();
  run(g, 0.3);
  const w = WISHES.find((x) => x.id === id)!;
  g.wish = { id, base: w.count(g), until: wishUntil(g.time) };
  g.toasts = [];
  return g;
}

describe('when wishes start', () => {
  test('the village makes no wish while goals remain', () => {
    const g = flatGame();
    run(g, 1);
    expect(g.wish).toBe(null);
    expect(g.wishNow()).toBe(null);
  });

  test('once every goal is reached, the village makes a wish with a toast', () => {
    const g = doneGame();
    run(g, 0.3);
    const w = WISHES.find((x) => x.id === g.wish!.id)!;
    expect(g.toasts).toEqual([`🌟 The village wishes: ${w.text}`]);
    expect(g.wishNow()?.text).toBe(w.text);
  });

  test('reaching the last goal starts the first wish', () => {
    const g = flatGame();
    g.goal = GOALS.length - 1;
    g.made.iron = 10;
    run(g, 0.3);
    expect(g.toasts[0]).toBe('🏆 Goal reached: Make 10 iron');
    expect(g.toasts[1]).toStartWith('🌟 The village wishes: ');
  });
});

describe('when a wish ends', () => {
  test('a wish ends at the start of a season', () => {
    for (const time of [0, 100, 250, 700, 1999]) {
      const until = wishUntil(time);
      const into = yearAt(until) * 4;
      expect(Math.abs(into - Math.round(into))).toBeLessThan(1e-9);
    }
  });

  test('a wish lasts at least the shortest time, and never more than a season longer', () => {
    for (let time = 0; time < YEAR_LENGTH * 2; time += 37) {
      const left = wishUntil(time) - time;
      expect(left).toBeGreaterThanOrEqual(WISH_MIN_TIME);
      expect(left).toBeLessThan(WISH_MIN_TIME + YEAR_LENGTH / 4);
    }
  });

  test('the wish names the season it must be met before', () => {
    const g = wishGame('food');
    expect(g.wishNow()?.before).toBe(seasonAt(yearAt(g.wish!.until + 1)));
  });

  test('a new game in spring is asked for its wish before autumn', () => {
    // A new game starts early in spring, so summer is less than the shortest wish away.
    const g = wishGame('food');
    expect(g.wishNow()?.before).toBe('autumn');
  });
});

describe('meeting a wish', () => {
  test('a growing wish counts only what is made after it began', () => {
    const g = doneGame();
    g.made.plank = 300;
    run(g, 0.3);
    g.wish = { id: 'planks', base: 300, until: wishUntil(g.time) };
    g.made.plank = 312;
    expect(g.wishNow()?.have).toBe(12);
  });

  test('a store wish counts what is in the stores now', () => {
    const g = wishGame('stone');
    g.hq.stock.stone = 25;
    expect(g.wishNow()?.have).toBe(25);
    expect(g.wishNow()?.need).toBe(40);
  });

  test('progress never shows more than the wish needs', () => {
    const g = wishGame('stone');
    g.hq.stock.stone = 90;
    expect(g.wishNow()?.have).toBe(40);
  });

  test('a met wish is granted with a toast, counted, and a different wish follows', () => {
    const g = wishGame('planks');
    g.made.plank += 40;
    run(g, 0.3);
    expect(g.toasts[0]).toBe('🌟 Wish granted: Make 40 planks');
    expect(g.toasts[1]).toStartWith('🌟 The village wishes: ');
    expect(g.wishesGranted).toBe(1);
    expect(g.wishNow()?.granted).toBe(1);
    expect(g.wish!.id).not.toBe('planks');
  });

  test('a missed wish passes with a gentle toast, counts nothing, and a different wish follows', () => {
    const g = wishGame('planks');
    g.time = g.wish!.until;
    run(g, 0.3);
    expect(g.toasts[0]).toBe('🍂 The wish passed: Make 40 planks');
    expect(g.toasts[1]).toStartWith('🌟 The village wishes: ');
    expect(g.wishesGranted).toBe(0);
    expect(g.wish!.id).not.toBe('planks');
    expect(g.wish!.until - g.time).toBeGreaterThanOrEqual(WISH_MIN_TIME - 0.3);
  });

  test('every wish can be met by the count it follows', () => {
    for (const w of WISHES) {
      const g = wishGame(w.id);
      g.wish!.base = -w.need; // as if the count had grown by the whole need
      if (!w.grow) g.hq.stock.stone = g.hq.stock.fish = 40;
      expect(g.wishNow()?.have).toBe(w.need);
    }
  });
});

describe('saving', () => {
  test('a save keeps the wish and the wishes granted', () => {
    const g = wishGame('bread');
    g.wishesGranted = 3;
    const back = Game.load(g.save());
    expect(back.wish).toEqual(g.wish);
    expect(back.wishesGranted).toBe(3);
  });

  test('a save from before wishes starts a wish once every goal is reached', () => {
    const g = doneGame();
    const d = g.save();
    delete d.wish;
    delete d.wishesGranted;
    const back = Game.load(d);
    expect(back.wish).toBe(null);
    expect(back.wishesGranted).toBe(0);
    run(back, 0.3);
    expect(WISHES.map((w) => w.id)).toContain(back.wish!.id);
  });
});
