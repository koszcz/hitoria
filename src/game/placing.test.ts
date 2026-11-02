// A new game, and where buildings may go.
import { describe, expect, test } from 'bun:test';
import { Game, BDEFS, bag } from '.';
import { BIG_SIZE as W } from '../land/size';
import { flatGame, inside, placeBare, placeLinked, runUntil } from './test-helpers';
import { START_TOOLS } from './tools';

describe('a new game', () => {
  test('starts with a built HQ and starting goods, and no roads or flags', () => {
    const g = new Game(1);
    expect(g.hq.built).toBe(true);
    expect(g.hq).not.toHaveProperty('flag');
    expect(g).not.toHaveProperty('roads');
    expect(g).not.toHaveProperty('flags');
    expect(g.hq.stock).toEqual(bag({ log: 6, plank: 24, stone: 14, tool: START_TOOLS }));
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

  test('needs open ground in front of its door', () => {
    const g = flatGame();
    // The tile in front would be the HQ itself.
    expect(g.canPlace('woodcutter', g.hq.x, g.hq.y - 1)).toBe('No room in front of its door');
    g.world.at(g.hq.x + 4, g.hq.y + 1).tree = 1;
    expect(g.canPlace('woodcutter', g.hq.x + 4, g.hq.y)).toBe('No room in front of its door');
    g.world.at(g.hq.x - 4, g.hq.y + 1).t = 'water';
    expect(g.canPlace('woodcutter', g.hq.x - 4, g.hq.y)).toBe('No room in front of its door');
  });

  test("never goes on another building's doorstep", () => {
    const g = flatGame();
    expect(g.canPlace('woodcutter', g.hq.x, g.hq.y + 1)).toBe('In front of the door of another building');
  });

  test('may stand right beside another building', () => {
    const g = flatGame();
    expect(g.canPlace('woodcutter', g.hq.x + 1, g.hq.y)).toBeNull();
  });

  test('refuses spots settlers cannot walk to', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    for (let dy = -2; dy <= 3; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) === 2 || dy === -2 || dy === 3) g.world.at(bx + dx, by + dy).t = 'water';
    expect(g.canPlace('woodcutter', bx, by)).toBe('Settlers cannot walk there');
  });

  // Ring the doorstep in front of (bx, by) with trees of the given size, leaving the building's own tile free.
  const wallDoor = (g: ReturnType<typeof flatGame>, bx: number, by: number, tree: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && (dx || dy !== -1)) g.world.at(bx + dx, by + 1 + dy).tree = tree;
  };

  test('refuses a spot whose door is walled in by trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallDoor(g, bx, by, 1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('Settlers cannot walk there');
  });

  test('saplings around the door also wall it in, because they grow into trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallDoor(g, bx, by, 0.1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('Settlers cannot walk there');
  });

  test('settlers may reach the door through a gap in the trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallDoor(g, bx, by, 1);
    g.world.at(bx, by + 2).tree = 0;
    expect(g.canPlace('woodcutter', bx, by)).toBeNull();
    const b = g.place('woodcutter', bx, by);
    expect(g.linked(b)).toBe(true);
  });
});

describe("mines on the mountain's edge", () => {
  // A block of mountain from (x0, y0) to (x1, y1).
  const mountain = (g: ReturnType<typeof flatGame>, x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.world.at(x, y).t = 'mountain';
  };

  test('a mine may stand on a mountain tile with open ground in front of its door', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 4, y - 4, x + 6, y - 2);
    expect(g.canPlace('mine', x + 5, y - 2)).toBeNull();
  });

  test('other buildings still need flat grass', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 4, y - 4, x + 6, y - 2);
    expect(g.canPlace('woodcutter', x + 5, y - 2)).toBe('Needs flat grass');
    expect(g.canPlace('geologist', x + 5, y - 2)).toBe('Needs flat grass');
  });

  test('a mine deeper in the mountain has no room in front of its door', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 4, y - 4, x + 6, y - 2);
    expect(g.canPlace('mine', x + 5, y - 3)).toBe('No room in front of its door');
  });

  test('a mine on the edge reaches a rich spot that no mine on grass can reach', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    g.rich.fill(0);
    mountain(g, x + 2, y - 7, x + 8, y - 2);
    g.rich[(y - 4) * W + x + 5] = 1; // 3 tiles from the nearest grass
    expect(g.richAt('mine', x + 5, y - 1)).toBe(false);
    expect(g.richAt('mine', x + 5, y - 2)).toBe(true);
  });

  test('a mine on the edge gets built, and its miner digs stone', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    mountain(g, x + 4, y - 4, x + 6, y - 2);
    const mine = placeLinked(g, 'mine', x + 5, y - 2);
    runUntil(g, () => mine.built, 150);
    g.hq.stock.bread = 20;
    const start = g.made.stone;
    runUntil(g, () => g.made.stone > start, 300);
    expect(g.world.at(x + 5, y - 2).t).toBe('mountain');
  });
});
