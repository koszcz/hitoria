import { describe, expect, test } from 'bun:test';
import { BEDTIME, DAY_LENGTH, WAKE, clock } from '../seasons/day';
import { YEAR_LENGTH, seasonCount } from '../seasons/year';
import { AT_FEAST, FEAST_FOOD, FEAST_NEWCOMERS, feastOn } from './feast';
import { Game } from './game';
import { flatGame, placeLinked, run, runUntil, setClock } from './test-helpers';
import type { Building } from './types';

const built = (b: Building) => Object.assign(b, { built: true, progress: 1 });

// A game with a finished Feast Square and a sawmill that has its worker at work.
function feastGame() {
  const g = flatGame();
  const sq = built(placeLinked(g, 'square', g.hq.x + 4, g.hq.y + 3));
  const mill = built(placeLinked(g, 'sawmill', g.hq.x + 6, g.hq.y));
  mill.stock.log = 20;
  runUntil(g, () => g.settlers.get(mill.worker)?.inside === true, 60);
  return { g, sq, mill };
}

// Put all the feast food on the square, as if carriers had brought it.
const fill = (sq: Building) => {
  for (const k of ['fish', 'bread', 'meat'] as const) sq.stock[k] = FEAST_FOOD[k]!;
};

describe('ordering a wedding feast', () => {
  test('a finished square can order one, and then wants 10 fish, 10 bread and 10 meat', () => {
    const { g, sq } = feastGame();
    expect(g.canFeast(sq)).toBeNull();
    expect(g.orderFeast(sq)).toBeNull();
    expect(sq.feast).toEqual({});
    expect(FEAST_FOOD).toEqual({ fish: 10, bread: 10, meat: 10 });
    g.hq.stock.fish = 30;
    g.hq.stock.bread = 30;
    g.hq.stock.meat = 30;
    runUntil(g, () => sq.stock.fish === 10 && sq.stock.bread === 10 && sq.stock.meat === 10, 200);
    run(g, 20);
    expect([sq.stock.fish, sq.stock.bread, sq.stock.meat]).toEqual([10, 10, 10]); // no more than the feast needs
  });

  test('a square with no feast ordered wants no food', () => {
    const { g, sq } = feastGame();
    g.hq.stock.fish = 30;
    run(g, 30);
    expect(sq.stock.fish).toBe(0);
    expect(sq.status).toBe('Ready to hold a feast');
  });

  test('a square still being built cannot hold a feast', () => {
    const g = flatGame();
    const site = placeLinked(g, 'square', g.hq.x + 4, g.hq.y + 3);
    expect(g.orderFeast(site)).toBe('Finish building it first');
    expect(g.canFeast(g.hq)).toBe('Only a Feast Square can hold a feast');
  });

  test('only one feast can be planned at a time, even on another square', () => {
    const { g, sq } = feastGame();
    const other = built(placeLinked(g, 'square', g.hq.x - 4, g.hq.y + 3));
    g.orderFeast(sq);
    expect(g.canFeast(sq)).toBe('A feast is already planned');
    expect(g.canFeast(other)).toBe('A feast is already planned');
  });

  test('you can hold one feast each season', () => {
    const { g, sq } = feastGame();
    g.orderFeast(sq);
    sq.feast = undefined; // as if the feast were over
    expect(g.canFeast(sq)).toBe('You can hold one feast each season');
    const next = seasonCount(g.time) + 1;
    while (seasonCount(g.time) < next) g.time += 10;
    expect(g.canFeast(sq)).toBeNull();
  });
});

describe('the feast night', () => {
  test('once the food is in, the feast begins at the next dusk', () => {
    const { g, sq } = feastGame();
    setClock(g, 0.4);
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    expect(sq.status).toBe('The feast begins at dusk');
    expect(clock(sq.feast!.at!)).toBeCloseTo(BEDTIME, 5);
    expect(sq.feast!.at! - g.time).toBeCloseTo((BEDTIME - 0.4) * DAY_LENGTH, 0);
  });

  test('food that comes in after dusk waits for the next evening', () => {
    const { g, sq } = feastGame();
    setClock(g, 0.8);
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    expect(sq.feast!.at! - g.time).toBeCloseTo((1 - 0.8 + BEDTIME) * DAY_LENGTH, 0);
  });

  test('without all the food, the feast waits', () => {
    const { g, sq } = feastGame();
    g.orderFeast(sq);
    sq.stock.fish = 10;
    sq.stock.bread = 10;
    sq.stock.meat = 9;
    run(g, 2);
    expect(sq.feast!.at).toBeUndefined();
    expect(sq.status).toBe('Waiting for the feast food');
  });

  test('at dusk the food is eaten and every worker gathers at the square instead of going to bed', () => {
    const { g, sq, mill } = feastGame();
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    g.time = sq.feast!.at! - 0.1;
    g.update(0.3);
    expect(feastOn(g)).toBe(sq);
    expect(sq.stock.fish + sq.stock.bread + sq.stock.meat).toBe(0);
    expect(g.toasts).toContain('🎉 The wedding feast has begun');
    const s = g.settlers.get(mill.worker)!;
    runUntil(g, () => s.feast === sq.id, 60);
    expect(Math.abs(s.x - sq.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(s.y - sq.y)).toBeLessThanOrEqual(2);
    expect(s.inside).toBe(false);
    expect(s.asleep).toBeUndefined();
    expect(mill.status).toBe(AT_FEAST);
    expect(g.allAsleep()).toBe(false);
    run(g, 20);
    expect(s.feast).toBe(sq.id); // they stay until midnight
    expect(s.asleep).toBeUndefined();
  });

  test('at midnight the guests go to bed, and two new settlers arrive at dawn', () => {
    const { g, sq, mill } = feastGame();
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    g.time = sq.feast!.at!;
    const s = g.settlers.get(mill.worker)!;
    runUntil(g, () => s.feast === sq.id, 60);
    setClock(g, 0.001); // just past midnight
    runUntil(g, () => !!s.asleep, 60);
    expect(s.feast).toBeUndefined();
    expect(feastOn(g)).toBeNull();
    expect(sq.status).toBe('The newlyweds arrive at dawn');
    const before = g.population;
    setClock(g, WAKE);
    g.update(0.3);
    expect(g.population).toBe(before + FEAST_NEWCOMERS);
    expect(sq.feast).toBeUndefined();
    expect(g.toasts).toContain('💍 Two newlyweds joined your village');
    expect(g.chronicle.filter((e) => e.what === 'feast').length).toBe(1);
  });

  test('a worker who cannot walk to the square goes to bed as usual', () => {
    const { g, sq, mill } = feastGame();
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    g.time = sq.feast!.at!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.world.at(sq.x + dx, sq.y + dy).t = 'water';
    g.walks.clear();
    g.ground = null;
    const s = g.settlers.get(mill.worker)!;
    runUntil(g, () => !!s.asleep, 60);
    expect(s.feast).toBeUndefined();
  });
});

describe('saving a feast', () => {
  test('a planned feast and the season it was ordered in survive a save', () => {
    const { g, sq } = feastGame();
    g.orderFeast(sq);
    fill(sq);
    g.update(0.3);
    const at = sq.feast!.at;
    const h = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(h.buildings.get(sq.id)!.feast).toEqual({ at });
    expect(h.feastSeason).toBe(g.feastSeason);
    expect(h.canFeast(h.buildings.get(sq.id)!)).toBe('A feast is already planned');
  });
});

test('a loaded square says it is ready for a feast before the game runs', () => {
  const { g, sq } = feastGame();
  const h = Game.load(JSON.parse(JSON.stringify(g.save())));
  expect(h.buildings.get(sq.id)!.status).toBe('Ready to hold a feast');
});

describe('season count', () => {
  test('counts every season since the first spring', () => {
    expect(seasonCount(0)).toBe(0);
    expect(seasonCount(YEAR_LENGTH)).toBe(4);
    expect(seasonCount(YEAR_LENGTH * 0.25)).toBe(1);
  });
});
