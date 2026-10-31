import { describe, expect, test } from 'bun:test';
import { parseEntry, readEntries } from './entries';
import { render } from './build';

const entry = (front: string, body = 'What changed.') => `---\n${front}\n---\n${body}\n`;

describe('changelog entries', () => {
  test('reads the front matter and the body', () => {
    const e = parseEntry(
      'x',
      entry(`title: Storehouse
date: '2026-10-30 22:36'
commit: '0416748'
kind: dev
shots:
  - name: start
    steps:
      - key: Control+s
      - click: [10, -20]`),
    );
    expect(e).toMatchObject({ title: 'Storehouse', date: '2026-10-30 22:36', kind: 'dev', commit: '0416748', body: 'What changed.' });
    expect(e.shots[0].steps).toEqual([{ key: 'Control+s' }, { click: [10, -20] }]);
  });

  test('defaults to a game change with no shots', () => {
    const e = parseEntry('not-committed', entry(`title: T\ndate: '2026-10-30'`));
    expect(e.kind).toBe('game');
    expect(e.shots).toEqual([]);
    expect(e.commit).toBeUndefined();
  });

  test('rejects an entry without a title, a date or front matter', () => {
    expect(() => parseEntry('x', entry(`date: '2026-10-30'`))).toThrow('no title');
    expect(() => parseEntry('x', entry('title: T'))).toThrow('no date');
    expect(() => parseEntry('x', 'Just text')).toThrow('no front matter');
  });

  test('every entry in the project is valid and the newest comes first', () => {
    const all = readEntries();
    expect(all.length).toBeGreaterThan(0);
    const dates = all.map((e) => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('changelog page', () => {
  test('shows each entry, escapes titles and marks behind-the-scenes changes', () => {
    const html = render([
      parseEntry('a', entry(`title: Roads <and> flags\ndate: '2026-10-30 21:55'\ncommit: 'abcdef1234'`, '- **Press R**')),
      parseEntry('b', entry(`title: Tests\ndate: '2026-10-30 22:08'\nkind: dev`)),
    ]);
    expect(html).toContain('Roads &lt;and&gt; flags');
    expect(html).toContain('<strong>Press R</strong>');
    expect(html).toContain('<code>abcdef1</code>');
    expect(html).toContain('<article class="dev" id="b">');
    expect(html).toContain('30 October 2026');
  });

  test('says when a screenshot is missing', () => {
    const html = render([parseEntry('none', entry(`title: T\ndate: '2026-10-30'\nshots:\n  - name: start`))]);
    expect(html).toContain('No screenshot');
  });
});
