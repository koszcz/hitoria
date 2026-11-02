import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { TREES_LOW, TREES_LOW_NOTE, grownTrees, takesForesterRoom, watchTrees } from './forestry';
import { flatGame, placeBare } from './test-helpers';

// A finished hut, placed without checks. The test lays out the trees around it.
function finished(g: Game, type: Parameters<Game['place']>[0], dx: number, dy: number) {
  const b = placeBare(g, type, g.hq.x + dx, g.hq.y + dy);
  Object.assign(b, { built: true, progress: 1 });
  return b;
}

// Grow `n` trees in a row just above the building, inside its reach.
function plantRow(g: Game, b: { x: number; y: number }, n: number, grown = 1) {
  for (let i = 0; i < n; i++) g.world.at(b.x - 2 + i, b.y - 3).tree = grown;
}

describe('warn before trees run out', () => {
  test('counts only grown trees within the woodcutter’s reach', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 0);
    plantRow(g, hut, 3);
    g.world.at(hut.x + 1, hut.y + 2).tree = 0.5; // a sapling is not grown yet
    g.world.at(hut.x + 7, hut.y).tree = 1; // out of reach
    expect(grownTrees(g, hut)).toBe(3);
  });

  test(`warns once when a woodcutter with no forester has ${TREES_LOW} or fewer grown trees`, () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 0);
    plantRow(g, hut, TREES_LOW + 1);
    watchTrees(g);
    expect(g.toasts).toEqual([]);
    g.world.at(hut.x - 2, hut.y - 3).tree = 0;
    watchTrees(g);
    expect(g.toasts).toEqual([TREES_LOW_NOTE]);
    watchTrees(g);
    expect(g.toasts).toEqual([TREES_LOW_NOTE]);
  });

  test('warns again after the trees grew back and ran low again', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 0);
    plantRow(g, hut, TREES_LOW);
    watchTrees(g);
    plantRow(g, hut, TREES_LOW + 1);
    watchTrees(g);
    g.world.at(hut.x - 2, hut.y - 3).tree = 0;
    watchTrees(g);
    expect(g.toasts).toEqual([TREES_LOW_NOTE, TREES_LOW_NOTE]);
  });

  test('two woodcutters running low at once give one message', () => {
    const g = flatGame();
    finished(g, 'woodcutter', 6, 0);
    finished(g, 'woodcutter', -6, 0);
    watchTrees(g);
    expect(g.toasts).toEqual([TREES_LOW_NOTE]);
  });

  test('says nothing while a forester plants within the woodcutter’s reach, even a forester still being built', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 0);
    placeBare(g, 'forester', hut.x + 11, hut.y); // its planting ground just touches the woodcutter's reach
    watchTrees(g);
    expect(g.toasts).toEqual([]);
  });

  test('a forester too far away does not count', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 0);
    placeBare(g, 'forester', hut.x + 12, hut.y);
    watchTrees(g);
    expect(g.toasts).toEqual([TREES_LOW_NOTE]);
  });

  test('a woodcutter still being built does not warn', () => {
    const g = flatGame();
    placeBare(g, 'woodcutter', g.hq.x + 6, g.hq.y);
    watchTrees(g);
    expect(g.toasts).toEqual([]);
  });

  test('the game watches the trees as it runs', () => {
    const g = flatGame();
    finished(g, 'woodcutter', 6, 0);
    g.update(0.3);
    expect(g.toasts).toContain(TREES_LOW_NOTE);
  });
});

describe('placing on a forester’s planting ground', () => {
  test('a building on free ground near a forester takes room from it', () => {
    const g = flatGame();
    const f = finished(g, 'forester', 6, 0);
    expect(takesForesterRoom(g, 'sawmill', f.x, f.y + 4)).toBe(true);
  });

  test('a building far from every forester takes no room', () => {
    const g = flatGame();
    const f = finished(g, 'forester', 6, 0);
    expect(takesForesterRoom(g, 'sawmill', f.x - 12, f.y)).toBe(false);
  });

  test('a building whose tiles a forester could not plant on anyway takes no room', () => {
    const g = flatGame();
    const f = finished(g, 'forester', 6, 0);
    const x = f.x, y = f.y + 4;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) g.world.at(x + dx, y + dy).tree = 1;
    expect(takesForesterRoom(g, 'sawmill', x, y)).toBe(false);
  });

  test('the edge of the building’s reach counts: it blocks planting on the tiles beside it', () => {
    const g = flatGame();
    const f = finished(g, 'forester', 6, 0);
    // The building stands one tile outside the planting ground, but the tile beside it is inside.
    expect(takesForesterRoom(g, 'sawmill', f.x, f.y + 6)).toBe(true);
    expect(takesForesterRoom(g, 'sawmill', f.x, f.y + 7)).toBe(false);
  });

  test('a farm takes room with its fields', () => {
    const g = flatGame();
    const f = finished(g, 'forester', 6, 0);
    // The farm and the tiles beside it lie outside the planting ground, but its nearest field is inside.
    expect(takesForesterRoom(g, 'sawmill', f.x, f.y + 7)).toBe(false);
    expect(takesForesterRoom(g, 'farm', f.x, f.y + 7)).toBe(true);
  });
});
