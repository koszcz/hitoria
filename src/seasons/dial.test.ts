import { describe, expect, test } from 'bun:test';
import { dialAt } from './dial';
import { DAY_LENGTH, clock } from './day';
import { YEAR_LENGTH } from './year';

// Game time when the day fraction reaches f, on the day after the start.
const at = (f: number) => ((f - clock(0) + 1) % 1) * DAY_LENGTH + DAY_LENGTH;

describe('day and season dial', () => {
  test('the hand points up at midday and down at midnight', () => {
    expect(dialAt(at(0.5)).angle).toBeCloseTo(0, 6);
    expect(Math.abs(dialAt(at(0)).angle)).toBeCloseTo(180, 6);
  });

  test('the hand turns clockwise through the day: left at dawn, right at dusk', () => {
    expect(dialAt(at(0.25)).angle).toBeCloseTo(-90, 6);
    expect(dialAt(at(0.75)).angle).toBeCloseTo(90, 6);
  });

  test('the dial shows the sun by day and the moon by night', () => {
    expect(dialAt(at(0.5)).night).toBe(false);
    expect(dialAt(at(0.3)).night).toBe(false);
    expect(dialAt(at(0.1)).night).toBe(true);
    expect(dialAt(at(0.9)).night).toBe(true);
  });

  test('a new game shows day 1 in spring, in the morning', () => {
    const d = dialAt(0);
    expect(d.day).toBe(1);
    expect(d.season).toBe('spring');
    expect(d.night).toBe(false);
  });

  test('the season follows the year', () => {
    expect(dialAt(YEAR_LENGTH * 0.3).season).toBe('summer');
    expect(dialAt(YEAR_LENGTH * 0.55).season).toBe('autumn');
    expect(dialAt(YEAR_LENGTH * 0.8).season).toBe('winter');
    expect(dialAt(YEAR_LENGTH * 1.0).season).toBe('spring');
  });

  test('the season bar fills from 0 to 1 through each season', () => {
    const start = dialAt(0).seasonPart;
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start).toBeLessThan(0.5);
    expect(dialAt(YEAR_LENGTH * 0.1).seasonPart).toBeGreaterThan(start);
    for (let t = 0; t < YEAR_LENGTH; t += 7) {
      const p = dialAt(t).seasonPart;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});
