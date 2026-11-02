// Island themes in play: whichever island has the pine highlands, its dense pines and sea cliffs
// still leave room for coal and iron mines once settlers land there.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { W, H } from '../world';
import { harbourGame, inside, runUntil } from './test-helpers';
import { SAIL_CARGO, SAIL_CREW } from './voyage';

const colonies = (g: Game) => [...g.buildings.values()].filter((b) => b.landed);

// Sail to both islands, one after the other, and run until both crews have landed.
function settleBoth(seed: number) {
  const { g, h } = harbourGame(seed);
  expect(g.sail(h)).toBeNull();
  runUntil(g, () => colonies(g).length === 1 && g.ships[0].leg === 'moored', 400);
  g.pool += SAIL_CREW;
  for (const [k, n] of Object.entries(SAIL_CARGO)) g.hq.stock[k as keyof typeof SAIL_CARGO] += n;
  expect(g.sail(h)).toBeNull();
  runUntil(g, () => colonies(g).length === 2, 400);
  return g;
}

describe('island themes in play', () => {
  for (const seed of [1, 2, 3, 4, 5, 6])
    test(`seed ${seed}: coal and iron mines fit near the landing on the pine island`, () => {
      const g = settleBoth(seed);
      const pines = g.world.themes!.other === 'pines' ? 'other' : 'far';
      const colony = colonies(g).find((b) => g.world.isleAt(b.x, b.y) === pines)!;
      for (const type of ['coalmine', 'ironmine'] as const) {
        let fits = 0;
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++)
            if (inside(g, x, y) && Math.hypot(x - colony.x, y - colony.y) < 10 && !g.canPlace(type, x, y)) fits++;
        expect(fits).toBeGreaterThan(0);
      }
    });
});
