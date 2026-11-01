// Sailing to settle: a ship takes settlers and goods from the harbour to the other island, where
// they build a harbour of their own that works like a second HQ.
import { describe, expect, test } from 'bun:test';
import { Game, GOODS, bag } from '.';
import { findPath } from '../path';
import { W } from '../world';
import { demolish } from './demolish';
import { landingSpot, lacking, SAIL_CARGO, SAIL_CREW } from './voyage';
import type { Building } from './types';
import { walkFrom } from './walking';
import { inside, placeBare, run, runUntil, totalGoods } from './test-helpers';

// A new game on a real map, with a finished harbour on the first shore spot that fits one.
function harbourGame(seed = 1, built = true) {
  const g = new Game(seed);
  for (let i = 0; i < W * W; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (g.canPlace('harbour', x, y)) continue;
    const h = placeBare(g, 'harbour', x, y);
    if (built) Object.assign(h, { built: true, progress: 1, status: 'Storing goods' });
    return { g, h };
  }
  throw new Error('no harbour spot');
}

const landed = (g: Game) => [...g.buildings.values()].find((b) => b.landed);

// Sail, and run until the settlers have built their harbour on the other island.
function settle(seed = 1) {
  const { g, h } = harbourGame(seed);
  expect(g.sail(h)).toBeNull();
  runUntil(g, () => !!landed(g), 200);
  return { g, h, colony: landed(g)! };
}

// Is there a way over land, ignoring trees and boulders, from a to b?
const byLand = (g: Game, a: { x: number; y: number }, b: { x: number; y: number }) =>
  !!findPath(a.x, a.y, b.x, b.y, (x, y) => g.world.at(x, y).t !== 'water', W * W);

describe('getting ready to sail', () => {
  test('needs a finished harbour', () => {
    const { g, h } = harbourGame(1, false);
    expect(g.canSail(h)).toBe('Build the harbour first');
  });

  test('is ready on a new game once the harbour stands', () => {
    const { g, h } = harbourGame();
    expect(g.canSail(h)).toBeNull();
  });

  test('needs enough idle settlers in the HQ', () => {
    const { g, h } = harbourGame();
    g.pool = SAIL_CREW - 1;
    expect(g.canSail(h)).toBe('Needs more idle settlers');
  });

  test('needs the goods in your stores, and says which are short', () => {
    const { g, h } = harbourGame();
    g.hq.stock.plank = 2;
    expect(g.canSail(h)).toBe('Needs more goods in your stores');
    expect(lacking(g, h)).toEqual({ plank: SAIL_CARGO.plank! - 2 });
  });

  test('lands on other land, across the water, on every new map', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, h } = harbourGame(seed);
      const spot = landingSpot(g, h);
      expect(spot).not.toBeNull();
      expect(byLand(g, g.hq, spot!.land)).toBe(false);
      expect(g.world.at(spot!.dock.x, spot!.dock.y).t).toBe('water');
    }
  });
});

describe('the voyage', () => {
  test('takes the settlers and goods on board', () => {
    const { g, h } = harbourGame();
    const before = { pool: g.pool, people: g.population, goods: totalGoods(g) };
    expect(g.sail(h)).toBeNull();
    expect(g.pool).toBe(before.pool - SAIL_CREW);
    expect(g.population).toBe(before.people);
    const ship = g.ships[0];
    expect(ship.crew).toBe(SAIL_CREW);
    expect(ship.cargo).toEqual(bag(SAIL_CARGO));
    for (const k of GOODS) expect(totalGoods(g)[k] + ship.cargo[k]).toBe(before.goods[k]);
  });

  test('sails over water only', () => {
    const { g, h } = harbourGame();
    g.sail(h);
    const ship = g.ships[0];
    run(g, 60, () => {
      if (ship.leg !== 'moored') expect(g.world.at(Math.round(ship.x), Math.round(ship.y)).t).toBe('water');
    });
  });

  test('lands, and the settlers build a harbour that keeps the rest of the goods', () => {
    const { g, colony } = settle();
    expect(colony.built).toBe(true);
    expect(g.poolOf(colony)).toBe(SAIL_CREW);
    expect(colony.stock.plank).toBe(SAIL_CARGO.plank! - 4);
    expect(colony.stock.stone).toBeGreaterThanOrEqual(SAIL_CARGO.stone! - 3);
    expect(g.isStore(colony)).toBe(true);
    expect(byLand(g, g.hq, colony)).toBe(false);
  });

  test('clears the trees and boulders around the new harbour, for logs and stone', () => {
    const { g, h } = harbourGame();
    const spot = landingSpot(g, h)!.land;
    const around: { tree: number; rock: number }[] = [];
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dy) <= 2.5) around.push(g.world.at(spot.x + dx, spot.y + dy));
    const trees = around.filter((t) => t.tree >= 1).length, rocks = around.filter((t) => t.rock).length;
    expect(trees).toBeGreaterThan(0);
    g.sail(h);
    runUntil(g, () => !!landed(g), 200);
    expect(landed(g)!.stock.log).toBe(trees);
    expect(landed(g)!.stock.stone).toBe(SAIL_CARGO.stone! - 3 + rocks);
    expect(around.every((t) => !t.tree && !t.rock)).toBe(true);
  });

  test('claims the land around the new harbour', () => {
    const { g, colony } = settle();
    expect(inside(g, colony.x, colony.y)).toBe(true);
    expect(inside(g, colony.x + 4, colony.y)).toBe(true);
  });

  test('sails home again and ties up at its harbour', () => {
    const { g, h } = settle();
    const ship = g.ships[0];
    runUntil(g, () => ship.leg === 'moored', 200);
    expect({ x: ship.x, y: ship.y }).toEqual(g.dock(h)!);
  });

  test('happens only once', () => {
    const { g, h } = harbourGame();
    g.sail(h);
    expect(g.canSail(h)).toBe('Your settlers have already sailed');
    expect(g.sail(h)).toBe('Your settlers have already sailed');
    expect(g.ships.length).toBe(1);
  });

  test('brings everyone and everything home if the landing spot is taken, ready to try again', () => {
    const { g, h } = harbourGame();
    const pool = g.pool;
    g.sail(h);
    const ship = g.ships[0];
    g.world.at(ship.land.x, ship.land.y).field = 999;
    runUntil(g, () => ship.leg === 'moored', 300);
    expect(landed(g)).toBeUndefined();
    expect(g.pool).toBe(pool);
    expect(h.stock.plank).toBe(SAIL_CARGO.plank!);
    expect(ship.crew).toBe(0);
    // The settlers may try again, and land somewhere else.
    expect(g.sail(h)).toBeNull();
    expect(g.ships.length).toBe(1);
  });

  test('keeps everyone counted the whole way', () => {
    const { g, h } = harbourGame();
    const people = g.population;
    g.sail(h);
    run(g, 120, () => expect(g.population).toBe(people));
  });
});

// A free spot for a building of `type` in the land around the landing harbour.
function spotNear(g: Game, colony: Building, type: Parameters<Game['place']>[0]) {
  for (let r = 2; r <= 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (!g.canPlace(type, colony.x + dx, colony.y + dy)) return { x: colony.x + dx, y: colony.y + dy };
  throw new Error(`no room for a ${type}`);
}

describe('the new settlement', () => {
  test('can build in its land, with builders and workers from the landing harbour', () => {
    const { g, colony } = settle();
    const at = spotNear(g, colony, 'woodcutter');
    const hut = g.place('woodcutter', at.x, at.y);
    const hqPool = g.pool;
    runUntil(g, () => hut.built && !!hut.worker, 120);
    expect(g.settlers.get(hut.worker)!.base).toBe(colony.id);
    expect(g.linked(hut)).toBe(true);
    expect(g.pool).toBe(hqPool);
  });

  test('takes its building goods from the landing harbour, and stores its own goods there', () => {
    const { g, colony } = settle();
    const at = spotNear(g, colony, 'woodcutter');
    const hut = g.place('woodcutter', at.x, at.y);
    runUntil(g, () => hut.built, 120);
    expect(colony.stock.plank).toBe(SAIL_CARGO.plank! - 4 - 2);
    runUntil(g, () => colony.stock.log > 0, 300);
  });

  test('never sends a settler across the sea', () => {
    const { g, colony } = settle();
    const at = spotNear(g, colony, 'woodcutter');
    g.place('woodcutter', at.x, at.y);
    g.place('woodcutter', g.hq.x + 3, g.hq.y - 3);
    run(g, 200, () => {
      for (const s of g.settlers.values()) {
        const base = g.buildings.get(s.base)!;
        expect(walkFrom(g, base)[Math.round(s.y) * W + Math.round(s.x)]).toBeLessThan(Infinity);
      }
    });
  });

  test('its harbour cannot be demolished', () => {
    const { g, colony } = settle();
    expect(demolish(g, colony)).toBe('A landing harbour cannot be demolished');
  });

  test('a new settler from a house there moves into the landing harbour', () => {
    const { g, colony } = settle();
    const at = spotNear(g, colony, 'house');
    const house = g.place('house', at.x, at.y);
    colony.stock.fish = 2;
    runUntil(g, () => house.born > 0, 300);
    run(g, 5);
    expect(g.poolOf(colony) + [...g.settlers.values()].filter((s) => s.base === colony.id).length).toBe(SAIL_CREW + 1);
  });
});

describe('saving', () => {
  test('keeps a ship at sea, with its crew and cargo', () => {
    const { g, h } = harbourGame();
    g.sail(h);
    run(g, 3);
    const l = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(l.ships).toEqual(g.ships);
    expect(l.population).toBe(g.population);
    runUntil(l, () => !!landed(l), 200);
  });

  test('keeps the new settlers in their own harbour', () => {
    const { g, colony } = settle();
    const at = spotNear(g, colony, 'woodcutter');
    g.place('woodcutter', at.x, at.y);
    run(g, 30);
    const l = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(l.population).toBe(g.population);
    expect(l.poolOf(l.buildings.get(colony.id)!)).toBe(SAIL_CREW);
    expect(inside(l, colony.x, colony.y)).toBe(true);
  });
});
