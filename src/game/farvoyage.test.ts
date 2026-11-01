// Sailing to the far island: once settlers have landed on one island, the ship can take a second
// crew to the island nobody has settled yet. The far island's ore is rich, so its mines dig faster.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { W, H } from '../world';
import { isRich } from './geology';
import { landingSpot, SAIL_CARGO, SAIL_CREW } from './voyage';
import { harbourGame, runUntil } from './test-helpers';

const colonies = (g: Game) => [...g.buildings.values()].filter((b) => b.landed);

// Fill the HQ with what one more voyage needs.
function restock(g: Game) {
  g.pool += SAIL_CREW;
  for (const [k, n] of Object.entries(SAIL_CARGO)) g.hq.stock[k as keyof typeof SAIL_CARGO] += n;
}

// Sail once, and run until the settlers have landed and the ship is back at its dock.
function settleOnce(seed = 1, map?: number) {
  const { g, h } = map ? harbourOn(seed, map) : harbourGame(seed);
  expect(g.sail(h)).toBeNull();
  runUntil(g, () => colonies(g).length === 1 && g.ships[0].leg === 'moored', 400);
  restock(g);
  return { g, h };
}

// A new game on an older map, with a finished harbour on the first shore spot that fits one.
function harbourOn(seed: number, map: number) {
  const g = new Game(seed, map);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (g.canPlace('harbour', x, y)) continue;
    const h = g.place('harbour', x, y);
    Object.assign(h, { built: true, progress: 1, status: 'Storing goods' });
    return { g, h };
  }
  throw new Error('no harbour spot');
}

describe('sailing to the far island', () => {
  test('the first ship lands on the second island, nearest by sea', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, h } = harbourGame(seed);
      const spot = landingSpot(g, h)!;
      expect(g.world.isleAt(spot.land.x, spot.land.y)).toBe('other');
    }
  });

  test('once the first settlers have landed, the ship can sail again, to the far island', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, h } = settleOnce(seed);
      expect(g.canSail(h)).toBeNull();
      const spot = landingSpot(g, h)!;
      expect(g.world.isleAt(spot.land.x, spot.land.y)).toBe('far');
    }
  });

  test('the second crew lands on the far island and builds a harbour there', () => {
    const { g, h } = settleOnce();
    g.toasts.length = 0;
    expect(g.sail(h)).toBeNull();
    expect(g.toasts).toContain('⛵ A ship sets sail for the far island');
    runUntil(g, () => colonies(g).length === 2, 400);
    const far = colonies(g)[1];
    expect(g.world.isleAt(far.x, far.y)).toBe('far');
    expect(g.poolOf(far)).toBe(SAIL_CREW);
    expect(g.toasts).toContain('⚓ Your settlers have landed on the far island');
  });

  test('waits while the ship is at sea', () => {
    const { g, h } = settleOnce();
    g.sail(h);
    restock(g);
    expect(g.canSail(h)).toBe('Your settlers have already sailed');
  });

  test('after both islands are settled, no ship sails to settle again', () => {
    const { g, h } = settleOnce();
    g.sail(h);
    runUntil(g, () => colonies(g).length === 2 && g.ships[0].leg === 'moored', 400);
    restock(g);
    expect(g.canSail(h)).toBe('Your settlers have already sailed');
  });

  test('on older maps, with no far island, settlers sail only once', () => {
    const { g, h } = settleOnce(1, 6);
    expect(g.world.far).toBeNull();
    expect(g.canSail(h)).toBe('Your settlers have already sailed');
  });
});

describe('the far island riches', () => {
  test('every ore tile on the far island is a rich spot', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const g = new Game(seed);
      let n = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!g.world.hasOre(x, y) || g.world.isleAt(x, y) !== 'far') continue;
          expect(isRich(g, x, y)).toBe(true);
          n++;
        }
      expect(n).toBeGreaterThanOrEqual(6);
    }
  });
});
