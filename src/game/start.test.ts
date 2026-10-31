import { describe, expect, test } from 'bun:test';
import { Game } from './index';
import type { BType } from './defs';

// Every new map lets you build a stone mine and a fisher in the HQ's land from the start,
// with a few spots to choose from.
const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];

function spots(g: Game, type: BType) {
  let n = 0;
  for (let y = g.hq.y - 10; y <= g.hq.y + 10; y++)
    for (let x = g.hq.x - 10; x <= g.hq.x + 10; x++) if (!g.canPlace(type, x, y)) n++;
  return n;
}

describe('start near a mountain and shore', () => {
  for (const seed of SEEDS) {
    test(`seed ${seed} has spots for a stone mine`, () => {
      expect(spots(new Game(seed), 'mine')).toBeGreaterThanOrEqual(3);
    });

    test(`seed ${seed} has spots for a fisher`, () => {
      expect(spots(new Game(seed), 'fisher')).toBeGreaterThanOrEqual(3);
    });
  }
});
