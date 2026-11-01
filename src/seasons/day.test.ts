import { describe, expect, test } from 'bun:test';
import { DAY_LENGTH, clock, dayNumber } from './day';

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
