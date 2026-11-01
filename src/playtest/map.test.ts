import { describe, expect, test } from 'bun:test';
import { flatGame } from '../game/test-helpers';
import { mapText, spots } from './map';

describe('playtest map', () => {
  test('shows the HQ at its own coordinates', () => {
    const g = flatGame();
    const rows = mapText(g, g.hq.x, g.hq.y, 3).split('\n');
    const row = rows.find((r) => r.startsWith(String(g.hq.y).padStart(3) + ' '))!;
    expect(row.slice(4)[3]).toBe('H');
    expect(rows[1].slice(4)[3]).toBe(String(g.hq.x % 10));
  });

  test('lists only places the game accepts, nearest first', () => {
    const g = flatGame();
    const found = spots(g, 'woodcutter', 4);
    expect(found.length).toBe(4);
    for (const s of found) expect(g.canPlace('woodcutter', s.x, s.y)).toBeNull();
    expect(found.map((s) => s.dist)).toEqual([...found.map((s) => s.dist)].sort((a, b) => a - b));
  });

  test('a placed building takes its spot off the list', () => {
    const g = flatGame();
    const [first] = spots(g, 'house', 1);
    g.place('house', first.x, first.y);
    expect(spots(g, 'house', 1)[0]).not.toEqual(first);
  });
});
