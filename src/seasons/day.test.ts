import { describe, expect, test } from 'bun:test';
import { BEDTIME, DAY_LENGTH, WAKE, clock, dayNumber, isNight } from './day';

describe('day clock', () => {
  test('a new game starts in the morning', () => {
    expect(clock(0)).toBeGreaterThan(0.25);
    expect(clock(0)).toBeLessThan(0.5);
  });

  test('a day lasts 8 minutes of game time, then repeats', () => {
    expect(DAY_LENGTH).toBe(480);
    expect(clock(123 + DAY_LENGTH)).toBeCloseTo(clock(123), 9);
    expect(clock(DAY_LENGTH / 2)).toBeCloseTo((clock(0) + 0.5) % 1, 9);
  });
});

describe('day count', () => {
  test('a new game starts on day 1', () => {
    expect(dayNumber(0)).toBe(1);
  });

  test('the day count goes up at midnight, not when the game started', () => {
    const midnight = (1 - clock(0)) * DAY_LENGTH; // game time of the first midnight
    expect(dayNumber(midnight - 1)).toBe(1);
    expect(dayNumber(midnight + 1)).toBe(2);
    expect(dayNumber(midnight + DAY_LENGTH + 1)).toBe(3);
  });
});

describe('night', () => {
  // Game time of the next moment the clock shows day fraction `f`.
  const at = (f: number) => (((f - clock(0)) % 1) + 1) % 1 * DAY_LENGTH;

  test('a new game starts in the day', () => {
    expect(isNight(0)).toBe(false);
  });

  test('night starts at bedtime, after dusk, and ends at dawn', () => {
    expect(isNight(at(BEDTIME) - 1)).toBe(false);
    expect(isNight(at(BEDTIME) + 1)).toBe(true);
    expect(isNight(at(0))).toBe(true); // midnight
    expect(isNight(at(WAKE) - 1)).toBe(true);
    expect(isNight(at(WAKE) + 1)).toBe(false);
    expect(BEDTIME).toBeGreaterThan(0.75); // after dusk
    expect(WAKE).toBeLessThan(0.25); // by dawn
  });
});
