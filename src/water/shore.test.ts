import { describe, expect, test } from 'bun:test';
import { FAR, landDistance, shoreBand, type Shoreland } from './shore';

// A map drawn in text: '#' is land, '.' is water.
function map(rows: string[]): Shoreland & { w: number; h: number } {
  const h = rows.length, w = rows[0].length;
  return {
    w, h,
    inside: (x, y) => x >= 0 && y >= 0 && x < w && y < h,
    at: (x, y) => ({ t: rows[y][x] === '#' ? 'grass' : 'water' }),
  };
}

describe('landDistance', () => {
  test('counts steps to the nearest land, diagonals included', () => {
    const m = map(['#....', '.....', '.....']);
    const d = landDistance(m, m.w, m.h);
    expect(d[0]).toBe(0);
    expect(d[1]).toBe(1);
    expect(d[m.w + 1]).toBe(1); // one diagonal step
    expect(d[2 * m.w + 4]).toBe(4);
  });

  test('stops counting at FAR', () => {
    const m = map(['#' + '.'.repeat(FAR + 4)]);
    const d = landDistance(m, m.w, m.h);
    expect(d[m.w - 1]).toBe(FAR);
  });

  test('a map with no land is all open sea', () => {
    const m = map(['...', '...']);
    expect([...landDistance(m, m.w, m.h)].every((v) => v === FAR)).toBe(true);
  });
});

describe('shoreBand', () => {
  test('holds the tiles on both sides of the shore line', () => {
    const m = map(['.....', '.###.', '.###.', '.###.', '.....']);
    const band = new Set(shoreBand(m, m.w, m.h));
    expect(band.has(0)).toBe(true); // water by the land
    expect(band.has(m.w + 1)).toBe(true); // land by the water
    expect(band.has(2 * m.w + 2)).toBe(false); // the middle of the land
  });

  test('land at the edge of the map touches the sea off the map', () => {
    const m = map(['##', '##']);
    expect(shoreBand(m, m.w, m.h).length).toBe(4);
  });

  test('leaves open sea out', () => {
    const m = map(['#....']);
    expect(shoreBand(m, m.w, m.h)).toEqual([0, 1]);
  });
});
