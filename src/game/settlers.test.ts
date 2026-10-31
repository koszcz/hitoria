// Settlers who cannot walk to where they are sent.
import { describe, expect, test } from 'bun:test';
import { flatGame, run, runUntil, placeLinked } from './test-helpers';

describe('settlers who cannot get there', () => {
  test('a worker who cannot reach their hut goes back inside and tries again later', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y - 3);
    runUntil(g, () => b.built, 120);
    // Water all around the hut, so nobody can walk to its door.
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.world.at(b.x + dx, b.y + dy).t = 'water';
    runUntil(g, () => b.status === 'Unreachable, retrying soon', 30);
    expect(b.worker).toBe(0);
  });

  test('a woodcutter skips a tree they cannot reach', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y - 3);
    const tree = { x: b.x + 3, y: b.y - 3 };
    g.world.at(tree.x, tree.y).tree = 1;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.world.at(tree.x + dx, tree.y + dy).t = 'water';
    runUntil(g, () => b.status === 'No grown trees in range', 200);
    run(g, 10);
    expect(g.world.at(tree.x, tree.y).tree).toBe(1);
  });
});
