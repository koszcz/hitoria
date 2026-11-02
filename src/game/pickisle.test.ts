// Choosing where the ship sails: the harbour offers each island nobody has settled yet, and the
// ship lands on the island you pick.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { openIsles } from './isles';
import { landingSpot, SAIL_CARGO, SAIL_CREW } from './voyage';
import { harbourGame, runUntil } from './test-helpers';

const colonies = (g: Game) => [...g.buildings.values()].filter((b) => b.landed);

// Fill the HQ with what one more voyage needs.
function restock(g: Game) {
  g.pool += SAIL_CREW;
  for (const [k, n] of Object.entries(SAIL_CARGO)) g.hq.stock[k as keyof typeof SAIL_CARGO] += n;
}

// A new game on an older map, with no far island, and a finished harbour on its first shore spot.
function oldHarbour(seed: number) {
  const g = new Game(seed, 6), { w: W, h: H } = g.world;
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (g.canPlace('harbour', x, y)) continue;
    const h = g.place('harbour', x, y);
    Object.assign(h, { built: true, progress: 1, status: 'Storing goods' });
    return { g, h };
  }
  throw new Error('no harbour spot');
}

describe('the islands you can pick', () => {
  test('a new map offers the other island and the far island', () => {
    const { g } = harbourGame();
    expect(openIsles(g)).toEqual(['other', 'far']);
  });

  test('an island drops off the list once settlers land there', () => {
    const { g, h } = harbourGame();
    expect(g.sail(h, 'far')).toBeNull();
    runUntil(g, () => colonies(g).length === 1, 400);
    expect(openIsles(g)).toEqual(['other']);
  });

  test('older maps, with no far island, name no islands', () => {
    const { g } = oldHarbour(1);
    expect(openIsles(g)).toEqual([]);
  });
});

describe('sailing to the island you pick', () => {
  test('the landing spot lies on the island you pick', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const { g, h } = harbourGame(seed);
      const far = landingSpot(g, h, 'far')!.land, other = landingSpot(g, h, 'other')!.land;
      expect(g.world.isleAt(far.x, far.y)).toBe('far');
      expect(g.world.isleAt(other.x, other.y)).toBe('other');
    }
  });

  test('the first ship can sail straight to the far island and land there', () => {
    const { g, h } = harbourGame();
    expect(g.canSail(h, 'far')).toBeNull();
    expect(g.sail(h, 'far')).toBeNull();
    expect(g.toasts).toContain('⛵ A ship sets sail for the far island');
    runUntil(g, () => colonies(g).length === 1, 400);
    const c = colonies(g)[0];
    expect(g.world.isleAt(c.x, c.y)).toBe('far');
    expect(g.toasts).toContain('⚓ Your settlers have landed on the far island');
  });

  test('after the far island, the next ship goes to the other island', () => {
    const { g, h } = harbourGame();
    g.sail(h, 'far');
    runUntil(g, () => colonies(g).length === 1 && g.ships[0].leg === 'moored', 400);
    restock(g);
    expect(g.canSail(h, 'far')).toBe('Settlers already live on that island');
    expect(g.sail(h, 'far')).toBe('Settlers already live on that island');
    expect(g.sail(h, 'other')).toBeNull();
    runUntil(g, () => colonies(g).length === 2, 400);
    const c = colonies(g)[1];
    expect(g.world.isleAt(c.x, c.y)).toBe('other');
  });

  test('with no island picked, the ship sails to the nearest, as before', () => {
    const { g, h } = harbourGame();
    expect(g.sail(h)).toBeNull();
    expect(g.toasts).toContain('⛵ A ship sets sail for the other island');
  });

  test('says when the far island has no free shore', () => {
    const { g, h } = harbourGame();
    const { land } = landingSpot(g, h, 'far')!;
    // Fill the far island's land with mountain, so no shore is left to build on.
    for (let y = 0; y < g.world.h; y++)
      for (let x = 0; x < g.world.w; x++) {
        const t = g.world.at(x, y);
        if (t.t !== 'water' && g.world.isleAt(x, y) === 'far') t.t = 'mountain';
      }
    expect(g.world.isleAt(land.x, land.y)).toBe('far');
    expect(g.canSail(h, 'far')).toBe('No free shore on the far island');
    expect(g.canSail(h, 'other')).toBeNull();
  });

  test('older maps ignore the pick and sail to the land across the water', () => {
    const { g, h } = oldHarbour(1);
    expect(g.canSail(h, 'far')).toBeNull();
    expect(g.sail(h, 'other')).toBeNull();
  });
});
