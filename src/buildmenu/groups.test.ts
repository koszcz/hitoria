import { describe, expect, test } from 'bun:test';
import { BUILDABLE } from '../game';
import { flatGame } from '../game/test-helpers';
import { GROUPS, canPay, keyFor } from './groups';

describe('build menu groups', () => {
  test('every building you can build is in exactly one group', () => {
    const listed = GROUPS.flatMap((g) => g.types);
    expect([...listed].sort()).toEqual([...BUILDABLE].sort());
  });

  test('the first nine buildings have number keys', () => {
    expect(keyFor(BUILDABLE[0])).toBe('1');
    expect(keyFor(BUILDABLE[8])).toBe('9');
    expect(keyFor(BUILDABLE[9])).toBe('');
    expect(keyFor('hq')).toBe('');
  });
});

describe('canPay', () => {
  test('is true only when every good in the cost is in store', () => {
    const g = flatGame();
    const stored = { ...g.stored, plank: 2, stone: 0 };
    expect(canPay(stored, 'woodcutter')).toBe(true);
    expect(canPay(stored, 'sawmill')).toBe(false);
    expect(canPay({ ...stored, stone: 2 }, 'sawmill')).toBe(true);
  });
});
