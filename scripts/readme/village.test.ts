import { expect, test } from 'bun:test';
import { growVillage } from './village';
import { clock } from '../../src/render/daylight';

test('the README village is shown at midday', () => {
  expect(clock(growVillage().time)).toBeCloseTo(0.5, 1);
});

test('the README village is fully built, and settlers can walk to every building', () => {
  const g = growVillage();
  const buildings = [...g.buildings.values()];
  expect(buildings.length).toBeGreaterThanOrEqual(14);
  for (const b of buildings) {
    expect(b.built).toBe(true);
    expect(g.linked(b)).toBe(true);
  }
});
