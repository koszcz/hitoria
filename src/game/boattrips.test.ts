// Boat trips: free boats fetch the goods a harbour wants from the other islands.
import { describe, expect, test } from 'bun:test';
import { Game } from './game'; // first, so the game's files load in their usual order
import { BOAT_PLANKS } from './boats';
import { BOAT_LOAD, LOAD_WAIT } from './boattrips';
import { storedOn } from './islandstock';
import { colonyGame, run, runUntil } from './test-helpers';

// A colony game where the home harbour has a boat, and all fish lie in the HQ.
function boatGame(fish = 30) {
  const { g, h, colony } = colonyGame();
  for (const b of g.buildings.values()) b.stock.fish = 0;
  g.hq.stock.fish = fish;
  h.boat = BOAT_PLANKS;
  return { g, h, colony };
}

describe('fetching goods by boat', () => {
  test('a boat carries at most 10 goods a trip, and waits at most 60 s to load', () => {
    expect(BOAT_LOAD).toBe(10);
    expect(LOAD_WAIT).toBe(60);
  });

  test('the home boat brings the fish the colony wants, which carriers first take to the home harbour', () => {
    const { g, h, colony } = boatGame();
    g.setWant(colony, 'fish', 10);
    run(g, 0.3);
    expect(h.trip).toMatchObject({ from: h.id, to: colony.id, g: 'fish', n: 10, leg: 'load' }); // it fetches from its own harbour, so it loads at once
    runUntil(g, () => h.trip?.leg === 'carry', 200);
    expect(h.trip!.load).toBe(10);
    expect(g.hq.stock.fish).toBe(20);
    runUntil(g, () => !h.trip, 300);
    expect(colony.stock.fish).toBe(10);
    expect(storedOn(g, 'home').fish).toBe(20);
  });

  test('no island sends goods below what its own harbour wants', () => {
    const { g, h, colony } = boatGame();
    g.setWant(h, 'fish', 25);
    g.setWant(colony, 'fish', 10);
    run(g, 0.3);
    expect(h.trip).toMatchObject({ g: 'fish', n: 5 });
    runUntil(g, () => !h.trip, 400);
    expect(colony.stock.fish).toBe(5);
    expect(storedOn(g, 'home').fish).toBe(25);
  });

  test('a boat keeps sailing until the colony has all it wants', () => {
    const { g, h, colony } = boatGame(40);
    g.setWant(colony, 'fish', 25);
    run(g, 0.3);
    expect(h.trip!.n).toBe(10);
    runUntil(g, () => colony.stock.fish === 25 && !h.trip, 1500);
    expect(storedOn(g, 'home').fish).toBe(15);
    run(g, 5);
    expect(h.trip).toBeUndefined();
  });

  test('without a boat, nothing sails', () => {
    const { g, h, colony } = boatGame();
    h.boat = undefined;
    g.setWant(colony, 'fish', 10);
    run(g, 30);
    expect(h.trip).toBeUndefined();
    expect(colony.stock.fish).toBe(0);
    expect(g.hq.stock.fish).toBe(30);
  });

  test('a boat does not sail when no other island can spare the good', () => {
    const { g, h, colony } = boatGame(0);
    g.setWant(colony, 'fish', 10);
    run(g, 5);
    expect(h.trip).toBeUndefined();
  });

  test("the colony's own boat fetches from home too", () => {
    const { g, h, colony } = boatGame();
    h.boat = undefined;
    colony.boat = BOAT_PLANKS;
    g.setWant(colony, 'fish', 10);
    run(g, 0.3);
    expect(colony.trip).toMatchObject({ from: h.id, to: colony.id, n: 10, leg: 'out' });
    runUntil(g, () => !colony.trip, 600);
    expect(colony.stock.fish).toBe(10);
  });

  test('a second free boat does not fetch goods another boat is already bringing', () => {
    const { g, h, colony } = boatGame();
    colony.boat = BOAT_PLANKS;
    g.setWant(colony, 'fish', 15);
    run(g, 0.3);
    expect(h.trip).toMatchObject({ g: 'fish', n: 10 });
    expect(colony.trip).toMatchObject({ g: 'fish', n: 5 });
    runUntil(g, () => !h.trip && !colony.trip, 600);
    expect(colony.stock.fish).toBe(15);
    expect(storedOn(g, 'home').fish).toBe(15);
  });

  test('a boat whose source harbour is gone sails home empty', () => {
    const { g, h, colony } = boatGame();
    h.boat = undefined;
    colony.boat = BOAT_PLANKS;
    g.setWant(colony, 'fish', 10);
    run(g, 0.3);
    g.buildings.delete(h.id);
    runUntil(g, () => !colony.trip, 600);
    expect(colony.stock.fish).toBe(0);
  });

  test('a trip under way is kept in a save', () => {
    const { g, h, colony } = boatGame();
    g.setWant(colony, 'fish', 10);
    runUntil(g, () => h.trip?.leg === 'carry', 200);
    run(g, 0.5);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    const h2 = g2.buildings.get(h.id)!, c2 = g2.buildings.get(colony.id)!;
    expect(h2.trip).toMatchObject({ leg: 'carry', load: 10, g: 'fish' });
    runUntil(g2, () => !h2.trip, 300);
    expect(c2.stock.fish).toBe(10);
  });
});
