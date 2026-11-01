// Island riches in play: coal and iron mines go only by the second island's mountains, while
// old saves keep their ore at home.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { W, H } from '../world';
import type { Building } from './types';
import { harbourGame, inside, runUntil } from './test-helpers';

const ORE_MINES = ['coalmine', 'ironmine'] as const;

// Every spot in your land where a building of `type` may go.
function spots(g: Game, type: Parameters<Game['canPlace']>[0]) {
  const found: { x: number; y: number }[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(g, x, y) && !g.canPlace(type, x, y)) found.push({ x, y });
  return found;
}

const landed = (g: Game) => [...g.buildings.values()].find((b) => b.landed);

describe('island riches in play', () => {
  test('a new game has room for a stone mine at home, but for no coal or iron mine', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const g = new Game(seed);
      expect(spots(g, 'mine').length).toBeGreaterThan(0);
      for (const type of ORE_MINES) expect(spots(g, type)).toEqual([]);
    }
  });

  test('after settling the second island, coal and iron mines fit in its land', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, h } = harbourGame(seed);
      expect(g.sail(h)).toBeNull();
      runUntil(g, () => !!landed(g), 200);
      const colony: Building = landed(g)!;
      for (const type of ORE_MINES) {
        const near = spots(g, type).filter((p) => Math.hypot(p.x - colony.x, p.y - colony.y) < 10);
        expect(near.length).toBeGreaterThan(0);
      }
    }
  });

  test('a save from an older map keeps coal and iron in the home mountains', () => {
    const d = new Game(1).save();
    const old = Game.load({ ...d, map: 4 });
    expect(old.world.map).toBe(4);
    for (const type of ORE_MINES) expect(spots(old, type).length).toBeGreaterThan(0);
  });
});
