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

  test('the newer milestones read well in English', () => {
    const t = (e: Parameters<typeof entryText>[0]) => entryText(e).text;
    expect(t({ day: 1, what: 'wish', n: 1 })).toBe('The first village wish was granted');
    expect(t({ day: 1, what: 'wish', n: 10 })).toBe('10 village wishes granted');
    expect(t({ day: 1, what: 'upgrade' })).toBe('The first building was upgraded');
    expect(t({ day: 1, what: 'landed', isle: 'other' })).toBe('Settlers landed on the other island');
    expect(t({ day: 1, what: 'landed', isle: 'far' })).toBe('Settlers landed on the far island');
    expect(t({ day: 1, what: 'winter' })).toBe('A whole winter passed with no one hungry');
    expect(t({ day: 1, what: 'settlers', n: 50 })).toBe('The island reached 50 settlers');
  });

  test('and in Polish', () => {
    setLang('pl');
    const t = (e: Parameters<typeof entryText>[0]) => entryText(e).text;
    expect(t({ day: 1, what: 'wish', n: 1 })).toBe('Spełniono pierwsze życzenie wioski');
    expect(t({ day: 1, what: 'wish', n: 10 })).toBe('Spełnione życzenia wioski: 10');
    expect(t({ day: 1, what: 'upgrade' })).toBe('Ulepszono pierwszy budynek');
    expect(t({ day: 1, what: 'landed', isle: 'other' })).toBe('Osadnicy wylądowali na drugiej wyspie');
    expect(t({ day: 1, what: 'landed', isle: 'far' })).toBe('Osadnicy wylądowali na dalekiej wyspie');
    expect(t({ day: 1, what: 'winter' })).toBe('Minęła cała zima i nikt nie był głodny');
    expect(t({ day: 1, what: 'settlers', n: 50 })).toBe('Wyspa ma już 50 osadników');
  });

  test('a goal that no longer exists still shows its id', () => {
    expect(entryText({ day: 2, what: 'goal', goal: 'houses' }).text).toBe('Goal reached: houses');
  });
});
