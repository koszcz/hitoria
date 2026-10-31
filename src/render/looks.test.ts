import { describe, expect, test } from 'bun:test';
import { BDEFS, BType } from '../game';
import { colourGap, LOOKS } from './looks';
import { grade } from './kit';

const types = Object.keys(BDEFS) as BType[];
const pairs = types.flatMap((a, i) => types.slice(i + 1).map((b) => [a, b] as const));

describe('building looks', () => {
  test('every building has a look', () => {
    for (const t of types) expect(LOOKS[t]).toBeDefined();
  });

  test('no two buildings share a body shape', () => {
    const bodies = types.map((t) => LOOKS[t].body);
    expect(new Set(bodies).size).toBe(types.length);
  });

  test('every two roofs are clearly different colours, after the palette grade', () => {
    const close = pairs.filter(([a, b]) => colourGap(grade(LOOKS[a].roof), grade(LOOKS[b].roof)) < 12);
    expect(close).toEqual([]);
  });
});

describe('colourGap', () => {
  test('is zero for the same colour', () => {
    expect(colourGap('#8a3a2a', '#8a3a2a')).toBe(0);
  });

  test('is about 100 between black and white', () => {
    expect(colourGap('#000000', '#ffffff')).toBeCloseTo(100, 0);
  });

  test('sees a hue change that keeps the brightness', () => {
    expect(colourGap('#8a3a2a', '#2a3a8a')).toBeGreaterThan(40);
  });

  test('barely sees a tiny change', () => {
    expect(colourGap('#8a3a2a', '#8b3a2a')).toBeLessThan(1);
  });
});
