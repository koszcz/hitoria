// The trade ship's hours: it sets out in the morning, once a day, and casts off before sunset.
import { describe, expect, test } from 'bun:test';
import { DAY_LENGTH, clock, isNight } from '../seasons/day';
import { CAST_OFF, SAIL_BY, SAIL_FROM, maySail, untilCastOff, untilSail } from './tradeday';
import { harbourGame, run, runUntil, setClock } from './test-helpers';

// The game time at day fraction `f` on day `day`. A new game starts at 0.3 on day 1.
const at = (day: number, f: number) => (day - 1 + f - 0.3) * DAY_LENGTH;

describe('the hours', () => {
  test('a ship may set out only in the morning', () => {
    expect(maySail(at(2, SAIL_FROM - 0.01), 0)).toBe(false);
    expect(maySail(at(2, SAIL_FROM + 0.001), 0)).toBe(true);
    expect(maySail(at(2, SAIL_BY - 0.01), 0)).toBe(true);
    expect(maySail(at(2, SAIL_BY + 0.001), 0)).toBe(false);
  });

  test('only one ship sets out each day', () => {
    expect(maySail(at(2, 0.3), 2)).toBe(false);
    expect(maySail(at(3, 0.3), 2)).toBe(true);
  });

  test('counts down to the next dawn', () => {
    expect(untilSail(at(2, 0.3), 0)).toBe(0);
    expect(untilSail(at(2, 0.3), 2)).toBeCloseTo(0.95 * DAY_LENGTH);
    expect(untilSail(at(2, 0.1), 1)).toBeCloseTo(0.15 * DAY_LENGTH);
  });

  test('a ship tied up in the day stays until it casts off', () => {
    expect(untilCastOff(at(2, 0.3))).toBeCloseTo((CAST_OFF - 0.3) * DAY_LENGTH);
    expect(untilCastOff(at(2, CAST_OFF + 0.001))).toBe(0);
    expect(untilCastOff(at(2, 0.1))).toBe(0);
  });

  test('it casts off before night', () => {
    expect(isNight(at(2, CAST_OFF))).toBe(false);
  });
});

describe('a visit', () => {
  test('a harbour finished in the afternoon waits for the next morning', () => {
    const { g } = harbourGame();
    setClock(g, 0.55);
    run(g, (SAIL_FROM + 1 - 0.55) * DAY_LENGTH - 2, undefined, 0.5);
    expect(g.trader).toBeNull();
    runUntil(g, () => g.trader !== null, 5, undefined, 0.5);
    expect(clock(g.time)).toBeCloseTo(SAIL_FROM, 2);
  });

  test('the ship ties up in the morning and sails off before sunset', () => {
    const { g } = harbourGame();
    runUntil(g, () => g.trader?.leg === 'docked', 200, undefined, 0.5);
    expect(clock(g.time)).toBeLessThan(SAIL_BY);
    runUntil(g, () => g.trader?.leg === 'out', DAY_LENGTH, undefined, 0.5);
    expect(clock(g.time)).toBeCloseTo(CAST_OFF, 2);
    expect(isNight(g.time)).toBe(false);
  });

  test('the next ship comes the next morning', () => {
    const { g } = harbourGame();
    runUntil(g, () => g.trader?.leg === 'out', DAY_LENGTH, undefined, 0.5);
    runUntil(g, () => g.trader === null, 300, undefined, 0.5);
    runUntil(g, () => g.trader !== null, DAY_LENGTH, undefined, 0.5);
    expect(clock(g.time)).toBeCloseTo(SAIL_FROM, 2);
    expect(g.traderDay).toBe(2);
  });
});
