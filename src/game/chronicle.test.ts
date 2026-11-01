// The chronicle: a dated list of the island's milestones, kept with the save.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS } from '.';
import { DAY_LENGTH } from '../seasons/day';
import { seasonAt, yearAt } from '../seasons/year';
import { SAIL_CARGO, SAIL_CREW } from './voyage';
import { beginWish } from './wishes';
import { flatGame, harbourGame, placeBare, placeLinked, run, runUntil } from './test-helpers';

const of = (g: Game, what: string) => g.chronicle.filter((e) => e.what === what);

// Move the clock to the next start of `season`, then let the game see it.
function skipTo(g: Game, season: 'spring' | 'winter') {
  while (seasonAt(yearAt(g.time)) === season) g.time += 1;
  while (seasonAt(yearAt(g.time)) !== season) g.time += 1;
  g.time += 2;
  run(g, 0.5);
}

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

describe('more milestones', () => {
  test('it notes the first wish granted and every fifth after it', () => {
    const g = flatGame();
    g.goal = GOALS.length;
    run(g, 0.3);
    const grant = () => {
      beginWish(g, 'planks');
      g.made.plank += 40;
      run(g, 0.3);
    };
    for (let i = 0; i < 10; i++) grant();
    expect(g.wishesGranted).toBe(10);
    expect(of(g, 'wish').map((e) => (e as { n: number }).n)).toEqual([1, 5, 10]);
  });

  test('it notes the first upgrade only', () => {
    const g = flatGame();
    g.made.iron = 1;
    Object.assign(g.hq.stock, { iron: 10, tool: 20 });
    const a = Object.assign(placeBare(g, 'sawmill', g.hq.x + 4, g.hq.y), { built: true });
    const b = Object.assign(placeBare(g, 'house', g.hq.x - 4, g.hq.y), { built: true });
    expect(g.upgrade(a)).toBeNull();
    expect(g.upgrade(b)).toBeNull();
    expect(of(g, 'upgrade')).toEqual([{ day: 1, what: 'upgrade' }]);
  });

  test('it notes each landing, with the island', () => {
    const { g, h } = harbourGame();
    expect(g.sail(h)).toBeNull();
    runUntil(g, () => g.ships[0].leg === 'moored', 400);
    g.pool += SAIL_CREW;
    for (const [k, n] of Object.entries(SAIL_CARGO)) g.hq.stock[k as keyof typeof SAIL_CARGO] += n;
    expect(g.sail(h)).toBeNull();
    runUntil(g, () => of(g, 'landed').length === 2, 600);
    expect(of(g, 'landed').map((e) => (e as { isle: string }).isle)).toEqual(['other', 'far']);
  });

  test('it notes 50 and 100 settlers, once each', () => {
    const g = flatGame();
    g.pool = 49;
    run(g, 0.5);
    expect(of(g, 'settlers')).toEqual([]);
    g.pool = 60;
    run(g, 0.5);
    g.pool = 120;
    run(g, 0.5);
    g.pool = 60;
    run(g, 0.5);
    g.pool = 120;
    run(g, 0.5);
    expect(of(g, 'settlers').map((e) => (e as { n: number }).n)).toEqual([50, 100]);
  });

  test('it notes each winter with no one hungry, on any goal', () => {
    const g = flatGame();
    skipTo(g, 'winter');
    skipTo(g, 'spring');
    expect(of(g, 'winter').length).toBe(1);
    skipTo(g, 'winter');
    skipTo(g, 'spring');
    expect(of(g, 'winter').length).toBe(2);
  });

  test('a winter where a worker went hungry is not noted', () => {
    const g = flatGame();
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    const hut = placeLinked(g, 'forester', g.hq.x - 4, g.hq.y + 3);
    runUntil(g, () => hut.built && !!hut.hungry, 300);
    skipTo(g, 'winter');
    run(g, DAY_LENGTH, () => { hut.hungry = true; }, 0.5);
    skipTo(g, 'spring');
    expect(of(g, 'winter')).toEqual([]);
  });

  test('a winter already under way when the island loads is not noted', () => {
    const g = flatGame();
    skipTo(g, 'winter');
    const d = JSON.parse(JSON.stringify(g.save()));
    delete d.winters;
    const l = Game.load(d);
    skipTo(l, 'spring');
    expect(of(l, 'winter')).toEqual([]);
  });
});
