// A new game, and where buildings may go.
import { describe, expect, test } from 'bun:test';
import { Game, BDEFS, bag } from '.';
import { W } from '../world';
import { flatGame, inside } from './test-helpers';

describe('a new game', () => {
  test('starts with a built HQ, its flag in front, and starting goods', () => {
    const g = new Game(1);
    expect(g.hq.built).toBe(true);
    const f = g.flags.get(g.hq.flag)!;
    expect(f).toMatchObject({ x: g.hq.x, y: g.hq.y + 1, building: g.hq.id });
    expect(g.hq.stock).toEqual(bag({ log: 6, plank: 24, stone: 14 }));
    expect(g.population).toBe(18);
    expect(g.settlers.size).toBe(0);
  });

  test('owns the land within the HQ radius only', () => {
    const g = new Game(1);
    const r = BDEFS.hq.radius;
    expect(inside(g, g.hq.x + r, g.hq.y)).toBe(true);
    expect(inside(g, g.hq.x + r + 1, g.hq.y)).toBe(false);
  });
});

describe('canPlace', () => {
  test('allows free grass inside your land', () => {
    const g = flatGame();
    expect(g.canPlace('woodcutter', g.hq.x + 4, g.hq.y)).toBeNull();
  });

  test('explains why a spot is not allowed', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.canPlace('woodcutter', 10, W - 1)).toBe('Outside the map');
    expect(g.canPlace('woodcutter', x, y)).toBe('Occupied');
    expect(g.canPlace('woodcutter', x + 12, y)).toBe('Outside your land');

    g.world.at(x + 4, y).t = 'sand';
    expect(g.canPlace('woodcutter', x + 4, y)).toBe('Needs flat grass');
    g.world.at(x - 4, y).tree = 1;
    expect(g.canPlace('woodcutter', x - 4, y)).toBe('A tree is in the way');
    g.world.at(x, y - 4).rock = 3;
    expect(g.canPlace('woodcutter', x, y - 4)).toBe('A boulder is in the way');
  });

  test('needs room for a flag in front of the door', () => {
    const g = flatGame();
    // The tile in front would be the HQ itself.
    expect(g.canPlace('woodcutter', g.hq.x, g.hq.y - 1)).toBe('No room for its flag in front');
    // The tile in front would sit right next to the HQ's flag.
    expect(g.canPlace('woodcutter', g.hq.x + 1, g.hq.y)).toBe('No room for its flag in front');
  });

  test('refuses spots settlers cannot walk to', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    for (let dy = -2; dy <= 3; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) === 2 || dy === -2 || dy === 3) g.world.at(bx + dx, by + dy).t = 'water';
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  // Ring the flag tile in front of (bx, by) with trees of the given size, leaving the building's own tile free.
  const wallFlag = (g: ReturnType<typeof flatGame>, bx: number, by: number, tree: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && (dx || dy !== -1)) g.world.at(bx + dx, by + 1 + dy).tree = tree;
  };

  test('refuses a spot whose flag is walled in by trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  test('saplings around the flag also block roads', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 0.1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  test('a road may reach the flag through a gap in the trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 1);
    g.world.at(bx, by + 2).tree = 0;
    expect(g.canPlace('woodcutter', bx, by)).toBeNull();
    const b = g.place('woodcutter', bx, by);
    expect(typeof g.buildRoad(b.flag, g.flags.get(g.hq.flag)!)).toBe('object');
    expect(g.linked(b)).toBe(true);
  });
});
