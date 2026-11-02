import { afterEach, describe, expect, test } from 'bun:test';
import { flatGame, placeLinked } from './game/test-helpers';
import { setLang } from './i18n';
import { stopRows } from './stopinfo';

afterEach(() => setLang('en'));

describe('stop work in the panel', () => {
  test('a finished hut shows Stop work, and Resume work once stopped', () => {
    const g = flatGame();
    const hut = placeLinked(g, 'sawmill', g.hq.x + 4, g.hq.y + 3);
    expect(stopRows(hut)).toBe('');
    Object.assign(hut, { built: true, progress: 1 });
    expect(stopRows(hut)).toContain('data-act="stop">⏸️ Stop work</button>');
    g.stopWork(hut);
    expect(stopRows(hut)).toContain('data-act="resume">▶️ Resume work</button>');
    setLang('pl');
    expect(stopRows(hut)).toContain('▶️ Wznów pracę');
  });

  test('stores and houses show no button', () => {
    const g = flatGame();
    expect(stopRows(g.hq)).toBe('');
    const house = placeLinked(g, 'house', g.hq.x + 4, g.hq.y + 3);
    Object.assign(house, { built: true, progress: 1 });
    expect(stopRows(house)).toBe('');
  });
});
