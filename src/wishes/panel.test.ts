// The wish panel and the wish toasts, in English and Polish.
import { afterEach, describe, expect, test } from 'bun:test';
import { setLang, tr } from '../i18n';
import { wishHtml } from './panel';

afterEach(() => setLang('en'));

const now = { id: 'food', text: 'Store 40 fish, meat or bread', have: 12, need: 40, before: 'winter' as const, granted: 0 };

describe('the wish panel', () => {
  test('shows the wish, its progress and the season it must be met before', () => {
    expect(wishHtml(now)).toBe(
      '<div class="head">🌟 Village wish</div><div class="text">Store 40 fish, meat or bread</div>' +
        '<div class="bar"><i style="width:30%"></i></div><div class="count">12 / 40 · before the first snow</div>',
    );
  });

  test('shows how many wishes were granted, once there is one', () => {
    expect(wishHtml({ ...now, granted: 2 })).toStartWith('<div class="head">🌟 Village wish <span class="granted">· 2 granted</span></div>');
  });

  test('speaks Polish', () => {
    setLang('pl');
    const html = wishHtml({ ...now, before: 'summer', granted: 1 });
    expect(html).toContain('Życzenie wioski <span class="granted">· spełnione: 1</span>');
    expect(html).toContain('Zgromadź 40 ryb, porcji mięsa lub bochenków chleba');
    expect(html).toContain('12 / 40 · przed latem');
  });
});

describe('wish toasts in Polish', () => {
  test('each wish toast names the wish in Polish', () => {
    setLang('pl');
    expect(tr('🌟 The village wishes: Make 40 planks')).toBe('🌟 Wioska ma życzenie: Zrób 40 desek');
    expect(tr('🌟 Wish granted: Catch 20 fish')).toBe('🌟 Życzenie spełnione: Złów 20 ryb');
    expect(tr('🍂 The wish passed: Make 5 tools')).toBe('🍂 Życzenie minęło: Zrób 5 narzędzi');
  });
});
