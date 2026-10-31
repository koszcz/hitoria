import { describe, expect, test } from 'bun:test';
import { YEAR_LENGTH, seasonAt, seasonLook, yearAt } from './year';

// Year fractions in the middle of each season.
const SPRING = 0.125, SUMMER = 0.375, AUTUMN = 0.625, WINTER = 0.875;

describe('year clock', () => {
  test('a year lasts 20 minutes of game time, then repeats', () => {
    expect(YEAR_LENGTH).toBe(20 * 60);
    expect(yearAt(77 + YEAR_LENGTH)).toBeCloseTo(yearAt(77), 9);
    expect(yearAt(YEAR_LENGTH / 4)).toBeCloseTo((yearAt(0) + 0.25) % 1, 9);
  });

  test('a new game starts in spring, after the snow has gone', () => {
    expect(seasonAt(yearAt(0))).toBe('spring');
    expect(seasonLook(yearAt(0)).snow).toBe(0);
  });

  test('the four seasons each take a quarter of the year, in order', () => {
    expect([SPRING, SUMMER, AUTUMN, WINTER].map(seasonAt)).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(seasonAt(0)).toBe('spring');
    expect(seasonAt(0.999)).toBe('winter');
  });
});

describe('season look', () => {
  test('in summer the leaves are green and there is no snow', () => {
    const l = seasonLook(SUMMER);
    expect(l.autumn).toBe(0);
    expect(l.bare).toBe(0);
    expect(l.snow).toBe(0);
    expect(l.snowfall).toBe(0);
  });

  test('in autumn the leaves turn orange and red, and grass dries', () => {
    const l = seasonLook(AUTUMN);
    expect(l.autumn).toBeGreaterThan(0.9);
    expect(l.snow).toBe(0);
    expect(l.dry).toBeGreaterThan(seasonLook(SUMMER).dry);
  });

  test('in winter leafy trees are bare, snow covers the ground and falls', () => {
    const l = seasonLook(WINTER);
    expect(l.bare).toBeGreaterThan(0.9);
    expect(l.snow).toBeGreaterThan(0.9);
    expect(l.snowfall).toBeGreaterThan(0.3);
    expect(l.flowers).toBe(false);
  });

  test('spring brings blossom, flowers and fresh green grass', () => {
    const l = seasonLook(SPRING);
    expect(l.blossom).toBe(true);
    expect(l.flowers).toBe(true);
    expect(l.dry).toBeLessThan(0);
    expect(seasonLook(SUMMER).blossom).toBe(false);
  });

  test('the look changes smoothly all year, with no jumps when the year starts again', () => {
    const steps = 4000;
    let prev = seasonLook(0);
    for (let i = 1; i <= steps; i++) {
      const l = seasonLook(i / steps);
      for (const k of ['autumn', 'bare', 'snow', 'snowfall', 'dry'] as const) expect(Math.abs(l[k] - prev[k])).toBeLessThan(0.02);
      prev = l;
    }
  });
});
