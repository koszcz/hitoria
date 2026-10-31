import { expect, test } from 'bun:test';
import { growVillage } from './village';

test('the README village is fully built, with every building on a road to the HQ', () => {
  const g = growVillage();
  const buildings = [...g.buildings.values()];
  expect(buildings.length).toBeGreaterThanOrEqual(14);
  for (const b of buildings) {
    expect(b.built).toBe(true);
    expect(g.linked(b)).toBe(true);
  }
});
