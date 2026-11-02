import { afterEach, describe, expect, test } from 'bun:test';
import { KEEPSAKES } from '../game';
import { setLang } from '../i18n';
import { KT } from './text';

afterEach(() => setLang('en'));

describe('keepsake words', () => {
  test('every keepsake has a name and says what it gives, in English and Polish', () => {
    for (const lang of ['en', 'pl'] as const) {
      setLang(lang);
      for (const k of KEEPSAKES) {
        expect(KT().keepsakes[k.id].name.length).toBeGreaterThan(0);
        expect(KT().keepsakes[k.id].gives.length).toBeGreaterThan(0);
      }
    }
  });

  test('what each keepsake gives matches the goods it adds', () => {
    expect(KT().keepsakes.crate.gives).toBe('20 planks and 10 stone');
    expect(KT().keepsakes.friends.gives).toBe('6 more settlers');
    expect(KT().keepsakes.larder.gives).toBe('20 fish and 10 bread');
    expect(KT().keepsakes.chest.gives).toBe('5 iron and 8 tools');
    expect(KEEPSAKES.map((k) => [k.id, k.goods, k.settlers])).toEqual([
      ['crate', { plank: 20, stone: 10 }, 0],
      ['friends', {}, 6],
      ['larder', { fish: 20, bread: 10 }, 0],
      ['chest', { iron: 5, tool: 8 }, 0],
    ]);
  });

  test('the toast names the keepsake', () => {
    expect(KT().brought('Iron chest')).toBe('Keepsake brought to your new island: Iron chest.');
  });
});
