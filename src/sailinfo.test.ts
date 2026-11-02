// The harbour panel's sail rows: one Sail button for each island nobody has settled yet.
import { afterEach, describe, expect, test } from 'bun:test';
import { harbourGame, runUntil } from './game/test-helpers';
import { setLang } from './i18n';
import { sailRows } from './sailinfo';

afterEach(() => setLang('en'));

describe('sail buttons in the harbour panel', () => {
  test('a new map shows a button for the other island and one for the far island', () => {
    const { g, h } = harbourGame();
    const html = sailRows(g, h);
    expect(html).toContain('data-act="sail" data-isle="other">⛵ Sail to the other island</button>');
    expect(html).toContain('data-act="sail" data-isle="far">⛵ Sail to the far island</button>');
    expect(html).toContain('to the island you pick');
    expect(html).toContain('Coal and iron lie rich on the far island');
    setLang('pl');
    expect(sailRows(g, h)).toContain('⛵ Płyń na daleką wyspę');
  });

  test('once the far island is settled, only the other island is left', () => {
    const { g, h } = harbourGame();
    g.sail(h, 'far');
    runUntil(g, () => g.ships[0].leg === 'moored', 400);
    g.pool += 5;
    for (const [k, n] of Object.entries({ plank: 12, stone: 8, tool: 6 })) g.hq.stock[k as 'plank'] += n;
    const html = sailRows(g, h);
    expect(html).toContain('⛵ Sail to the other island</button>');
    expect(html).not.toContain('Sail to the far island');
    expect(html).toContain('to the other island. They build');
  });

  test('a shared reason shows once and turns off both buttons', () => {
    const { g, h } = harbourGame();
    g.pool = 0;
    const html = sailRows(g, h);
    expect(html.split('Needs more idle settlers').length).toBe(2);
    expect(html.split(' disabled>').length).toBe(3);
  });
});
