import { afterEach, describe, expect, test } from 'bun:test';
import { setLang } from '../i18n';
import { entryText } from './text';

afterEach(() => setLang('en'));

describe('chronicle lines', () => {
  test('each milestone reads as a dated line in English', () => {
    expect(entryText({ day: 3, what: 'born' })).toEqual({ day: 'Day 3', text: 'The first settler was born' });
    expect(entryText({ day: 1, what: 'built', type: 'woodcutter' }).text).toBe("The first Woodcutter's Hut was finished");
    expect(entryText({ day: 5, what: 'goal', goal: 'planks' }).text).toBe('Goal reached: Make 50 planks');
    expect(entryText({ day: 9, what: 'trade', n: 20 }).text).toBe('The 20th trade ship tied up');
  });

  test('and in Polish', () => {
    setLang('pl');
    expect(entryText({ day: 3, what: 'born' })).toEqual({ day: 'Dzień 3', text: 'Urodził się pierwszy osadnik' });
    expect(entryText({ day: 1, what: 'built', type: 'woodcutter' }).text).toBe('Ukończono pierwszy budynek: Chata drwala');
    expect(entryText({ day: 5, what: 'goal', goal: 'planks' }).text).toBe('Cel osiągnięty: Zrób 50 desek');
    expect(entryText({ day: 9, what: 'trade', n: 20 }).text).toBe('Przypłynął 20. statek kupiecki');
  });

  test('a goal that no longer exists still shows its id', () => {
    expect(entryText({ day: 2, what: 'goal', goal: 'houses' }).text).toBe('Goal reached: houses');
  });
});
