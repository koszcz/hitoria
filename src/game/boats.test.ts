// Harbour boats: a harbour builds one boat from planks that carriers bring, and the boat ties up at its dock.
import { describe, expect, test } from 'bun:test';
import { BOAT_PLANKS } from './boats';
import { Game } from './game';
import { harbourGame, run, runUntil } from './test-helpers';

const landed = (g: Game) => [...g.buildings.values()].find((b) => b.landed);

describe('ordering a boat', () => {
  test('a boat costs 6 planks', () => {
    expect(BOAT_PLANKS).toBe(6);
  });

  test('only a finished harbour can build a boat', () => {
    const { g, h } = harbourGame(1, false);
    expect(g.canBuildBoat(h)).toBe('Finish building it first');
    expect(g.canBuildBoat(g.hq)).toBe('Only a harbour can build a boat');
    expect(g.orderBoat(g.hq)).toBe('Only a harbour can build a boat');
    expect(g.hq.boat).toBeUndefined();
  });

  test('a finished harbour orders one boat, and no second', () => {
    const { g, h } = harbourGame();
    expect(g.canBuildBoat(h)).toBeNull();
    expect(g.orderBoat(h)).toBeNull();
    expect(h.boat).toBe(0);
    expect(g.orderBoat(h)).toBe('A boat is already being built');
    expect(h.boat).toBe(0);
  });
});

describe('building the boat', () => {
  test('carriers bring the planks from the HQ, and no more than the boat needs', () => {
    const { g, h } = harbourGame();
    h.stock.plank = 0;
    const before = g.hq.stock.plank;
    g.orderBoat(h);
    runUntil(g, () => h.boat === BOAT_PLANKS, 300);
    run(g, 20);
    expect(h.boat).toBe(BOAT_PLANKS);
    expect(h.stock.plank).toBe(0);
    expect(h.incoming.plank).toBe(0);
    expect(g.hq.stock.plank).toBe(before - BOAT_PLANKS);
  });

  test('planks already in the harbour go into the boat first', () => {
    const { g, h } = harbourGame();
    h.stock.plank = 10;
    g.orderBoat(h);
    run(g, 0.5);
    expect(h.boat).toBe(BOAT_PLANKS);
    expect(h.stock.plank).toBe(4);
  });

  test('planks a carrier is coming to fetch stay in the harbour', () => {
    const { g, h } = harbourGame();
    for (const b of g.buildings.values()) if (b !== h) b.stock.plank = 0;
    h.stock.plank = 4;
    h.sending.plank = 3;
    g.orderBoat(h);
    g.update(0.3);
    expect(h.boat).toBe(1);
    expect(h.stock.plank).toBe(3);
  });

  test('once the planks are in, the boat ties up and a message says so', () => {
    const { g, h } = harbourGame();
    h.stock.plank = BOAT_PLANKS;
    g.orderBoat(h);
    run(g, 0.5);
    expect(g.toasts).toContain('⛵ A boat ties up at the harbour');
    expect(g.canBuildBoat(h)).toBe('This harbour already has a boat');
    expect(g.orderBoat(h)).toBe('This harbour already has a boat');
    expect(h.boat).toBe(BOAT_PLANKS);
  });

  test('the boat and its planks so far are kept in a save', () => {
    const { g, h } = harbourGame();
    h.stock.plank = 2;
    for (const b of g.buildings.values()) if (b !== h) b.stock.plank = 0;
    g.orderBoat(h);
    run(g, 0.5);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.buildings.get(h.id)!.boat).toBe(2);
  });
});

describe('a boat for a colony', () => {
  function colonyGame() {
    const { g, h } = harbourGame();
    expect(g.sail(h)).toBeNull();
    runUntil(g, () => !!landed(g), 200);
    const colony = landed(g)!;
    runUntil(g, () => colony.built, 300);
    return { g, h, colony };
  }

  test('the colony harbour builds its own boat from its own planks', () => {
    const { g, colony } = colonyGame();
    expect(g.canBuildBoat(colony)).toBeNull();
    colony.stock.plank = BOAT_PLANKS;
    expect(g.orderBoat(colony)).toBeNull();
    run(g, 0.5);
    expect(colony.boat).toBe(BOAT_PLANKS);
  });

  test('carriers do not bring planks across the sea', () => {
    const { g, colony } = colonyGame();
    colony.stock.plank = 0;
    g.hq.stock.plank = 30;
    g.orderBoat(colony);
    run(g, 60);
    expect(colony.boat).toBe(0);
    expect(g.hq.stock.plank).toBe(30);
  });
});
