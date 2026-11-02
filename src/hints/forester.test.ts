import { afterEach, describe, expect, test } from 'bun:test';
import { foresterRoomHint } from './forester';
import { setLang, tr } from '../i18n';
import { TREES_LOW_NOTE } from '../game';

afterEach(() => setLang('en'));

describe('forester hints', () => {
  test('the placement hint says the building takes room from a forester', () => {
    expect(foresterRoomHint()).toBe("🌱 Takes room from a Forester's Hut. It plants fewer trees here");
  });

  test('the placement hint speaks Polish', () => {
    setLang('pl');
    expect(foresterRoomHint()).toBe('🌱 Zabiera miejsce Chacie leśnika. Posadzi tu mniej drzew');
  });

  test('the low trees warning speaks Polish', () => {
    setLang('pl');
    expect(tr(TREES_LOW_NOTE)).toBe('🌲 Chacie drwala zostały najwyżej 3 drzewa. Zbuduj obok Chatę leśnika');
  });
});
