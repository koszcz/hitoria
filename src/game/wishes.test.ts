// Village wishes: after the last goal, one wish at a time, granted or let pass by a season.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS, WISHES, WISH_MIN_TIME } from '.';
import { seasonAt, yearAt, YEAR_LENGTH } from '../seasons/year';
import { beginWish, wishChoices, wishUntil } from './wishes';
import { HOUSE_FOOD } from './defs';
import { trade } from './trade';
import { traderDeal } from './wants';
import { W } from '../world';
import { flatGame, harbourGame, placeBare, run, runUntil } from './test-helpers';

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
    expect(g.toasts).toEqual([`🌟 The village wishes: ${g.wishNow()!.text}`]);
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

  test('every growing wish can be met by the count it follows', () => {
    for (const w of WISHES.filter((x) => x.grow)) {
      const g = wishGame(w.id);
      g.wish!.base = -w.need; // as if the count had grown by the whole need
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

describe('fair wishes', () => {
  test('the trade wish asks for 1 trade ship', () => {
    const w = WISHES.find((x) => x.id === 'trade')!;
    expect(w.need).toBe(1);
    expect(w.text(w.need)).toBe('Welcome 1 trade ship');
  });

  test('a store wish asks for 40 when the stores hold little', () => {
    const g = doneGame();
    run(g, 0.3);
    g.hq.stock.stone = 10;
    beginWish(g, 'stone');
    expect(g.wishNow()).toMatchObject({ text: 'Store 40 stone', need: 40, have: 10 });
  });

  test('a store wish asks for 20 more than the stores hold, rounded up to ten', () => {
    const g = doneGame();
    run(g, 0.3);
    g.hq.stock.stone = 55;
    beginWish(g, 'stone');
    expect(g.wishNow()).toMatchObject({ text: 'Store 80 stone', need: 80, have: 55 });
    expect(g.toasts.at(-1)).toBe('🌟 The village wishes: Store 80 stone');
    g.hq.stock.stone = 80;
    run(g, 0.3);
    expect(g.wishesGranted).toBe(1);
    expect(g.toasts).toContain('🌟 Wish granted: Store 80 stone');
  });

  test('the food wish counts fish, meat and bread together', () => {
    const g = doneGame();
    run(g, 0.3);
    for (const k of HOUSE_FOOD) g.hq.stock[k] = 0;
    g.hq.stock.fish = 30;
    g.hq.stock.bread = 15;
    beginWish(g, 'food');
    expect(g.wishNow()).toMatchObject({ text: 'Store 70 fish, meat or bread', need: 70 });
  });

  test('a save keeps the need of a store wish', () => {
    const g = doneGame();
    run(g, 0.3);
    g.hq.stock.stone = 55;
    beginWish(g, 'stone');
    expect(Game.load(g.save()).wishNow()?.need).toBe(80);
  });
});

describe('late-game wishes', () => {
  const ids = (g: Game) => wishChoices(g).map((w) => w.id);

  test('they wait until you can grant them', () => {
    const g = doneGame();
    expect(ids(g)).not.toContain('iron');
    expect(ids(g)).not.toContain('upgrades');
    expect(ids(g)).not.toContain('wanted');
    expect(ids(g)).not.toContain('trade');
    expect(ids(g)).not.toContain('far');
    expect(ids(g)).toContain('planks');
  });

  test('"Make 10 iron" comes once a smelter is finished', () => {
    const g = doneGame();
    Object.assign(placeBare(g, 'smelter', g.hq.x + 4, g.hq.y), { built: true });
    expect(ids(g)).toContain('iron');
    beginWish(g, 'iron');
    g.made.iron += 10;
    expect(g.wishNow()).toMatchObject({ text: 'Make 10 iron', have: 10, need: 10 });
  });

  test('"Upgrade 2 buildings" comes once you have made iron, and counts upgraded buildings', () => {
    const g = doneGame();
    g.made.iron = 1;
    expect(ids(g)).toContain('upgrades');
    const a = Object.assign(placeBare(g, 'sawmill', g.hq.x + 4, g.hq.y), { built: true });
    const b = Object.assign(placeBare(g, 'house', g.hq.x - 4, g.hq.y), { built: true });
    beginWish(g, 'upgrades');
    a.level = 2;
    expect(g.wishNow()).toMatchObject({ text: 'Upgrade 2 buildings', have: 1, need: 2 });
    b.level = 2;
    expect(g.wishNow()?.have).toBe(2);
  });

  test('trade wishes come once a harbour is finished, and selling wanted goods counts', () => {
    const { g, h } = harbourGame();
    g.goal = GOALS.length;
    expect(ids(g)).toContain('trade');
    expect(ids(g)).toContain('wanted');
    runUntil(g, () => g.trader?.leg === 'docked', 200);
    beginWish(g, 'wanted');
    const t = g.trader!;
    t.wants = ['stone'];
    h.stock.stone = 20;
    expect(trade(g, h, 'stone', 'plank')).toBeNull();
    const deal = traderDeal(t, 'stone', 'plank');
    expect(g.wishNow()).toMatchObject({ text: 'Sell the trader 8 goods it wants', have: deal.give, need: 8 });
    expect(trade(g, h, 'plank', 'stone')).toBeNull(); // planks are not wanted
    expect(g.wishNow()?.have).toBe(deal.give);
  });

  test('"Land on the far island" comes on maps with a far island, until you land there', () => {
    const { g } = harbourGame();
    g.goal = GOALS.length;
    expect(g.world.far).toBeTruthy();
    expect(ids(g)).toContain('far');
    beginWish(g, 'far');
    expect(g.wishNow()).toMatchObject({ text: 'Land on the far island', have: 0, need: 1 });
    const [x, y] = farTile(g);
    Object.assign(placeBare(g, 'harbour', x, y), { built: true, landed: true });
    expect(g.wishNow()?.have).toBe(1);
    expect(ids(g)).not.toContain('far');
  });

  test('the village never wishes for something it cannot grant', () => {
    const g = doneGame();
    const bad = new Set(['iron', 'upgrades', 'wanted', 'trade', 'far']);
    run(g, 0.3);
    for (let i = 0; i < 100; i++) {
      g.time = g.wish!.until;
      run(g, 0.2);
      expect(bad.has(g.wish!.id)).toBe(false);
    }
  });
});

// A land tile on the far island.
function farTile(g: Game): [number, number] {
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) if (g.world.isleAt(x, y) === 'far' && g.world.at(x, y).t !== 'water') return [x, y];
  throw new Error('no far island');
}
