import { afterEach, describe, expect, test } from 'bun:test';
import { foodHint } from './food';
import { setLang } from '../i18n';

afterEach(() => setLang('en'));

describe('food hint at the start', () => {
  test("says what workers eat and points at a Fisher's Hut", () => {
    expect(foodHint()).toBe("Your workers eat Fish, Meat or Bread, or they work at half speed. Build a Fisher's Hut near the shore early.");
  });

  test('speaks Polish', () => {
    setLang('pl');
    expect(foodHint()).toBe('Pracownicy jedzą ryby, mięso lub chleb, inaczej pracują o połowę wolniej. Wcześnie zbuduj Chatę rybaka blisko brzegu.');
  });
});
