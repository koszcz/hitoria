import { describe, expect, test } from 'bun:test';
import { parseBacklog, parseIdea, readBacklog } from './parse';
import { blockers, render } from './build';

describe('backlog dashboard', () => {
  test('reads the title, text, scores and needs of an idea', () => {
    expect(parseIdea('- **Smelter**: turns ore into iron. *Fun 2 · Effort S · Needs: Coal mines, Wood*')).toEqual({
      title: 'Smelter',
      text: 'turns ore into iron.',
      fun: 2,
      effort: 'S',
      needs: ['Coal mines', 'Wood'],
    });
  });

  test('reads the date of a done idea and keeps text without scores', () => {
    expect(parseIdea('- **Save**: one slot. *2026-10-30*')).toMatchObject({ text: 'one slot.', date: '2026-10-30' });
    expect(parseIdea('- **Idea**: it is *really good*')).toEqual({ title: 'Idea', text: 'it is *really good*', needs: [] });
    expect(parseIdea('Not an idea')).toBeUndefined();
  });

  test('groups ideas by section and ignores lines outside ideas', () => {
    const b = parseBacklog('# Backlog\n- **Stray**: x\n## Next\nAt most 3.\n- **A**: a\n## Inbox\n*Empty.*\n');
    expect(Object.keys(b)).toEqual(['Next', 'Inbox']);
    expect(b.Next.map((i) => i.title)).toEqual(['A']);
    expect(b.Inbox).toEqual([]);
  });

  test('an idea is blocked only by needs that are not done', () => {
    const b = parseBacklog('## Done\n- **Wood**: w. *2026-10-30*\n## Later\n- **Mill**: m. *Fun 1 · Effort S · Needs: Wood, Grain*\n');
    expect(blockers(b.Later[0], b)).toEqual(['Grain']);
  });

  test('renders the project backlog with every idea and escapes text', () => {
    const b = readBacklog();
    expect(b.Next.length).toBeLessThanOrEqual(3);
    const html = render(b);
    for (const idea of [...b.Next, ...b.Later, ...b.Done]) expect(html).toContain(idea.title.replace(/&/g, '&amp;'));
    expect(render(parseBacklog('## Inbox\n- **<b>**: `x`\n'))).toContain('&lt;b&gt;');
  });
});
