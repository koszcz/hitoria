import { describe, expect, test } from 'bun:test';
import { flatGame } from './test-helpers';
import { placeSite } from './construction';
import { CUTS_OFF, walkersGoAround } from './cutoff';
import { spots } from '../playtest/map';

// A pocket of grass above the HQ, walled in by water. Its bottom wall has gaps at the given
// offsets from the HQ's column. A woodcutter site stands inside, so settlers must walk through a gap.
function pocket(gaps: number[]) {
  const g = flatGame();
  const { x: hx, y: hy } = g.hq;
  for (let y = hy - 10; y <= hy - 4; y++)
    for (let x = hx - 3; x <= hx + 3; x++) {
      const wall = y === hy - 10 || y === hy - 4 || x === hx - 3 || x === hx + 3;
      if (wall && !(y === hy - 4 && gaps.includes(x - hx))) g.world.at(x, y).t = 'water';
    }
  const inside = placeSite(g, 'woodcutter', hx, hy - 7);
  return { g, hx, gy: hy - 4, inside };
}

describe('placing a building that cuts off another', () => {
  test('refuses the only gap the settlers walk through', () => {
    const { g, hx, gy } = pocket([0]);
    expect(g.canPlace('woodcutter', hx, gy)).toBe(CUTS_OFF);
  });

  test('allows a gap when another gap is still open', () => {
    const { g, hx, gy } = pocket([0, 2]);
    expect(g.canPlace('woodcutter', hx, gy)).toBeNull();
  });

  test('counts a building placed a moment ago, even while the game is paused', () => {
    const { g, hx, gy } = pocket([0, 2]);
    expect(g.canPlace('woodcutter', hx, gy)).toBeNull();
    placeSite(g, 'woodcutter', hx + 2, gy);
    expect(g.canPlace('woodcutter', hx, gy)).toBe(CUTS_OFF);
  });

  test('allows the gap when nothing stands behind it', () => {
    const { g, hx, gy, inside } = pocket([0]);
    g.buildings.delete(inside.id);
    g.world.at(inside.x, inside.y).b = 0;
    expect(g.canPlace('woodcutter', hx, gy)).toBeNull();
  });

  test('a building that settlers already cannot reach does not count', () => {
    const { g, hx, gy } = pocket([0]);
    // Water just inside the gap seals the pocket, so no one can walk to the site in it.
    for (let x = hx - 2; x <= hx + 2; x++) g.world.at(x, gy - 1).t = 'water';
    expect(g.canPlace('woodcutter', hx, gy)).toBeNull();
  });

  test('the build spots skip the gap', () => {
    const { g, hx, gy } = pocket([0]);
    const found = spots(g, 'woodcutter', 400);
    expect(found.some((s) => s.x === hx && s.y === gy)).toBe(false);
    expect(found.length).toBeGreaterThan(0);
  });
});

describe('the quick test for a way around a tile', () => {
  test('finds a way around a tile in open grass', () => {
    const g = flatGame();
    expect(walkersGoAround(g, g.hq.x + 5, g.hq.y)).toBe(true);
  });

  test('finds no way around the only gap in a wall', () => {
    const { g, hx, gy } = pocket([0]);
    expect(walkersGoAround(g, hx, gy)).toBe(false);
  });

  test('finds no way when a building beside the tile can step only onto it', () => {
    const g = flatGame();
    const x = g.hq.x + 5, y = g.hq.y;
    placeSite(g, 'woodcutter', x + 1, y);
    // Water on every other side of the site, so the tile at (x, y) is its only way out.
    for (const [dx, dy] of [[1, -1], [2, -1], [2, 0], [2, 1], [1, 1], [0, -1], [0, 1]]) g.world.at(x + dx, y + dy).t = 'water';
    expect(walkersGoAround(g, x, y)).toBe(false);
  });
});
