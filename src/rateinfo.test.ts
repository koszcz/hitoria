import { afterEach, describe, expect, test } from 'bun:test';
import { noteMade, noteUsed } from './game/rates';
import { flatGame, placeLinked } from './game/test-helpers';
import { setLang } from './i18n';
import { rateRows } from './rateinfo';

afterEach(() => setLang('en'));

const finished = (g: ReturnType<typeof flatGame>, type: 'sawmill' | 'lookout') => {
  const b = placeLinked(g, type, g.hq.x + 4, g.hq.y + 3);
  Object.assign(b, { built: true, progress: 1 });
  return b;
};

describe('rates in the panel', () => {
  test('shows what the building made and used in the last minute', () => {
    const g = flatGame();
    const b = finished(g, 'sawmill');
    noteUsed(g, b, 'log', 3);
    noteMade(g, b, 'plank', 3);
    expect(rateRows(g, b)).toBe(
      '<div class="trade-label">In the last minute:</div>' +
        '<div>Made <span class="good plank"></span>3 Planks</div>' +
        '<div>Used <span class="good log"></span>3 Logs</div>',
    );
    setLang('pl');
    expect(rateRows(g, b)).toContain('W ostatniej minucie:');
  });

  test('says so when a hut made and used nothing', () => {
    const g = flatGame();
    expect(rateRows(g, finished(g, 'sawmill'))).toBe('<p class="desc">Nothing made or used in the last minute.</p>');
  });

  test('a building that never makes or uses goods shows no rates', () => {
    const g = flatGame();
    expect(rateRows(g, finished(g, 'lookout'))).toBe('');
  });
});
