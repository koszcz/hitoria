// The last goal: get through a whole winter with no hut worker or miner going hungry.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS, HUNGRY_AFTER } from '.';
import { seasonAt, yearAt } from '../seasons/year';
import { flatGame, placeLinked, run, runUntil } from './test-helpers';

const WINTER = GOALS.findIndex((x) => x.id === 'winter');

// Move the game clock to the next start of `season`, plus `into` seconds, then let the goal see it.
function skipTo(g: Game, season: 'spring' | 'winter', into = 2) {
  while (seasonAt(yearAt(g.time)) === season) g.time += 1;
  while (seasonAt(yearAt(g.time)) !== season) g.time += 1;
  g.time += into;
  run(g, 0.5);
}

// A game on the winter goal, in the autumn before a winter, with a finished house.
function onWinterGoal() {
  const g = flatGame();
  g.goal = WINTER;
  const house = placeLinked(g, 'house', g.hq.x + 4, g.hq.y - 3);
  runUntil(g, () => house.built, 200);
  skipTo(g, 'spring');
  return { g, house };
}

describe('survive winter goal', () => {
  test('it comes right after the monument', () => {
    expect(GOALS.map((x) => x.text).slice(WINTER - 1, WINTER + 1)).toEqual(['Build a monument', 'Get through a winter with no one hungry']);
  });

  test('before winter, the goal asks you to store food', () => {
    const { g } = onWinterGoal();
    expect(g.goalNow()).toMatchObject({ id: 'winter', have: 0, need: 1, note: 'Store food before winter comes' });
  });

  test('a winter where every house and mine is fed reaches the goal', () => {
    const { g, house } = onWinterGoal();
    skipTo(g, 'winter');
    expect(g.goalNow()?.note).toBe('Winter: no one has gone hungry yet');
    house.born = 4; // a full house eats nothing
    skipTo(g, 'spring');
    expect(g.goalNow()?.id).toBe('settle');
    expect(g.toasts).toContain('🏆 Goal reached: Get through a winter with no one hungry');
  });

  test('a house waiting for food in winter does not spoil it, because no one in it goes hungry', () => {
    const { g, house } = onWinterGoal();
    skipTo(g, 'winter');
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    run(g, HUNGRY_AFTER + 2);
    expect(house.status).toBe('Waiting for food');
    expect(g.goalNow()?.note).toBe('Winter: no one has gone hungry yet');
  });

  test('a hut worker with no food for too long in winter spoils that winter', () => {
    const { g, house } = onWinterGoal();
    house.born = 4;
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    const hut = placeLinked(g, 'forester', g.hq.x - 4, g.hq.y + 3);
    runUntil(g, () => hut.built && !!hut.hungry, 300);
    skipTo(g, 'winter');
    run(g, HUNGRY_AFTER + 2);
    expect(g.goalNow()?.note).toBe('Someone went hungry. Try again next winter');
    expect(g.toasts).toContain('🥶 A settler went hungry this winter');
    skipTo(g, 'spring');
    expect(g.goalNow()?.id).toBe('winter');
  });

  test('a short wait for a carrier does not count as hungry', () => {
    const { g, house } = onWinterGoal();
    skipTo(g, 'winter');
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    run(g, HUNGRY_AFTER - 5);
    g.hq.stock.fish = 20;
    runUntil(g, () => house.status !== 'Waiting for food', 60);
    house.born = 4;
    skipTo(g, 'spring');
    expect(g.goalNow()?.id).toBe('settle');
  });

  test('a mine waiting for food in winter counts as hungry too', () => {
    const { g, house } = onWinterGoal();
    house.born = 4;
    skipTo(g, 'winter');
    const mine = [...g.buildings.values()].find((b) => b.type === 'house')!;
    mine.type = 'mine';
    mine.status = 'Waiting for food';
    run(g, HUNGRY_AFTER + 2);
    expect(g.goalNow()?.note).toBe('Someone went hungry. Try again next winter');
  });

  test('hunger outside winter does not matter', () => {
    const { g, house } = onWinterGoal();
    for (const k of ['fish', 'bread', 'meat'] as const) g.hq.stock[k] = 0;
    run(g, HUNGRY_AFTER + 2);
    expect(house.status).toBe('Waiting for food');
    expect(g.goalNow()?.note).toBe('Store food before winter comes');
  });

  test('a winter already under way when the goal starts does not count', () => {
    const g = flatGame();
    g.goal = WINTER - 1;
    skipTo(g, 'winter');
    g.goal = WINTER;
    run(g, 1);
    expect(g.goalNow()?.note).toBe('Winter has begun. Get ready for the next one');
    skipTo(g, 'spring');
    expect(g.goalNow()?.id).toBe('winter');
    skipTo(g, 'winter');
    skipTo(g, 'spring');
    expect(g.goalNow()?.id).toBe('settle');
  });

  test('a saved game keeps how the winter is going', () => {
    const { g, house } = onWinterGoal();
    skipTo(g, 'winter');
    house.type = 'mine';
    house.status = 'Waiting for food';
    run(g, HUNGRY_AFTER + 2);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.goalNow()?.note).toBe('Someone went hungry. Try again next winter');
  });

  test('a save from before this goal waits for the next winter', () => {
    const { g } = onWinterGoal();
    skipTo(g, 'winter');
    const d = JSON.parse(JSON.stringify(g.save()));
    delete d.winter;
    const g2 = Game.load(d);
    expect(g2.goalNow()?.note).toBe('Winter has begun. Get ready for the next one');
  });
});
