// The harbour: it stands on the shore by open water, keeps a dock for ships, and stores goods.
import { describe, expect, test } from 'bun:test';
import { Game, BUILDABLE, DOCK_REACH } from '.';
import { BIG_SIZE as W } from '../land/size';
import { dockAt } from './harbour';
import { flatGame, placeLinked, runUntil } from './test-helpers';

// Turn a block of tiles into water.
function pool(g: Game, x0: number, y0: number, w: number, h: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) Object.assign(g.world.at(x, y), { t: 'water', h: 0.2 });
}

describe('harbour placing', () => {
  test('is in the build menu', () => {
    expect(BUILDABLE).toContain('harbour');
  });

  test('needs open water close by', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.canPlace('harbour', x + 4, y)).toBe('Must be on the shore by open water');
  });

  test('may stand on grass next to water that is wide enough for a ship', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 6, y - 2, 3, 5);
    expect(g.canPlace('harbour', x + 4, y)).toBeNull();
    expect(dockAt(g, x + 4, y)).toEqual({ x: x + 7, y });
  });

  test('does not count a narrow stream as open water', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 6, y - 2, 2, 5);
    expect(g.canPlace('harbour', x + 4, y)).toBe('Must be on the shore by open water');
  });

  test('does not count open water further than the dock reaches', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 4 + DOCK_REACH, y - 2, 3, 5);
    expect(g.canPlace('harbour', x + 4, y)).toBe('Must be on the shore by open water');
  });

  test('picks the closest dock spot', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 6, y - 2, 4, 5);
    expect(dockAt(g, x + 4, y)).toEqual({ x: x + 7, y });
  });

  test('has a spot by the bay on every new map', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const g = new Game(seed);
      let found = false;
      for (let i = 0; i < W * W && !found; i++) found = g.canPlace('harbour', i % W, Math.floor(i / W)) === null;
      expect(found).toBe(true);
    }
  });
});

describe('a harbour', () => {
  test('stores goods once built, like a storehouse', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 6, y - 2, 3, 5);
    const h = placeLinked(g, 'harbour', x + 4, y);
    expect(g.isStore(h)).toBe(false);
    runUntil(g, () => h.built, 400);
    expect(g.isStore(h)).toBe(true);
    expect(h.status).toBe('Storing goods');
  });

  test('knows where its dock is', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    pool(g, x + 6, y - 2, 3, 5);
    const h = placeLinked(g, 'harbour', x + 4, y);
    expect(g.dock(h)).toEqual({ x: x + 7, y });
  });
});
