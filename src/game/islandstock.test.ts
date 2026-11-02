// The goods on each island: the stock bar and build menu count only the stores on the island the
// camera looks at, while goals still count every island.
import { describe, expect, test } from 'bun:test';
import { GOODS } from './defs';
import { isleOf, storeIsles, storedOn, viewedIsle } from './islandstock';
import { harbourGame, runUntil } from './test-helpers';

// A game where settlers have landed on the second island and built their harbour store there.
function settled() {
  const { g, h } = harbourGame(1);
  expect(g.sail(h)).toBeNull();
  runUntil(g, () => [...g.buildings.values()].some((b) => b.landed && b.built), 400);
  const colony = [...g.buildings.values()].find((b) => b.landed)!;
  for (const b of [g.hq, h, colony]) for (const k of GOODS) b.stock[k] = 0;
  return { g, h, colony };
}

describe('goods per island', () => {
  test('the HQ stands on the home island', () => {
    const { g } = harbourGame(1);
    expect(isleOf(g, g.hq.x, g.hq.y)).toBe('home');
  });

  test('only the home island has stores before anyone sails', () => {
    const { g } = harbourGame(1);
    expect(storeIsles(g)).toEqual(['home']);
  });

  test('each island counts only the goods in its own stores', () => {
    const { g, h, colony } = settled();
    expect(isleOf(g, colony.x, colony.y)).toBe('other');
    g.hq.stock.plank = 7;
    h.stock.plank = 2;
    colony.stock.plank = 3;
    colony.stock.fish = 4;
    expect(storedOn(g, 'home').plank).toBe(9);
    expect(storedOn(g, 'home').fish).toBe(0);
    expect(storedOn(g, 'other').plank).toBe(3);
    expect(storedOn(g, 'other').fish).toBe(4);
    expect(storedOn(g, 'far').plank).toBe(0);
  });

  test('goals still count the goods on every island', () => {
    const { g, colony } = settled();
    g.hq.stock.stone = 5;
    colony.stock.stone = 6;
    expect(g.stored.stone).toBe(11);
  });

  test('a landing adds its island to the islands with stores, after home', () => {
    const { g } = settled();
    expect(storeIsles(g)).toEqual(['home', 'other']);
  });

  test('the camera over a settled island shows that island', () => {
    const { g, colony } = settled();
    expect(viewedIsle(g, colony.x, colony.y)).toBe('other');
    expect(viewedIsle(g, g.hq.x, g.hq.y)).toBe('home');
  });

  test('the camera over an island with no store, or over open sea, shows the home island', () => {
    const { g } = settled();
    const far = g.world.far!;
    expect(isleOf(g, far.x, far.y)).toBe('far');
    expect(viewedIsle(g, far.x, far.y)).toBe('home');
    expect(viewedIsle(g, 0, 0)).toBe('home');
  });
});
