import { describe, expect, test } from 'bun:test';
import { FAST_NIGHT, FastNights, nightSpeed } from './fastnight';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('night speed', () => {
  test('the clock runs at the chosen speed while anyone is awake', () => {
    expect(nightSpeed(1, true, false)).toBe(1);
    expect(nightSpeed(4, true, false)).toBe(4);
  });

  test('the clock runs fast once everyone is asleep', () => {
    expect(nightSpeed(1, true, true)).toBe(FAST_NIGHT);
    expect(FAST_NIGHT).toBeGreaterThan(4);
  });

  test('fast nights never slow down a faster chosen speed', () => {
    expect(nightSpeed(2, true, true)).toBeGreaterThanOrEqual(FAST_NIGHT);
    expect(nightSpeed(4, true, true)).toBeGreaterThanOrEqual(FAST_NIGHT);
  });

  test('fast nights stay within a speed the game can keep up with', () => {
    expect(nightSpeed(4, true, true)).toBeLessThanOrEqual(16);
  });

  test('turned off, the clock keeps the chosen speed all night', () => {
    expect(nightSpeed(1, false, true)).toBe(1);
    expect(nightSpeed(2, false, true)).toBe(2);
  });
});

describe('fast nights setting', () => {
  test('it is on by default', () => {
    expect(new FastNights(memory()).on).toBe(true);
  });

  test('turning it off is remembered for the next visit', () => {
    const store = memory();
    const f = new FastNights(store);
    expect(f.toggle()).toBe(false);
    expect(new FastNights(store).on).toBe(false);
    expect(f.toggle()).toBe(true);
    expect(new FastNights(store).on).toBe(true);
  });

  test('blocked storage leaves it on', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    const f = new FastNights({ getItem: fail, setItem: fail });
    expect(f.on).toBe(true);
    expect(f.toggle()).toBe(false);
  });
});
