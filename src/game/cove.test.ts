// The hidden cove in play: a fisher who fishes from the lagoon's shore catches twice as many fish,
// and the other themes keep working on maps that have the cove.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { COVE_FROM } from '../land/cove';
import { drawThemes, isleWith } from '../land/themes';
import { clock } from '../seasons/day';
import { flatGame, placeLinked, run, runUntil } from './test-helpers';

// A flat game with a pool of water west of the HQ, 4 tiles from a fisher's hut. With `cove`, the
// pool is the cove's lagoon. With `far`, a second pool of plain sea lies 2 tiles east of the hut.
function fishingGame(cove: boolean, far = false) {
  const g = flatGame();
  const { x, y } = g.hq;
  for (let ty = y - 2; ty <= y + 2; ty++)
    for (let tx = x - 10; tx <= x - 9; tx++) {
      g.world.at(tx, ty).t = 'water';
      if (cove) g.world.cove[ty * g.world.w + tx] = 1;
    }
  if (far) for (let ty = y - 2; ty <= y + 2; ty++) g.world.at(x - 2, ty).t = 'water';
  const fisher = placeLinked(g, 'fisher', x - 5, y);
  runUntil(g, () => fisher.built && g.made.fish > 0, 300);
  // Fish from mid-morning, so nobody goes to sleep.
  while (clock(g.time) < 0.3 || clock(g.time) > 0.31) g.time += 1;
  return { g, fisher };
}

// Fish caught in 120 s.
function catchIn(g: Game) {
  const before = g.made.fish;
  run(g, 120);
  return g.made.fish - before;
}

describe('fishing in the hidden cove', () => {
  test('a fisher by the cove catches about twice as many fish', () => {
    const sea = catchIn(fishingGame(false).g), cove = catchIn(fishingGame(true).g);
    expect(sea).toBeGreaterThan(0);
    expect(cove).toBeGreaterThanOrEqual(Math.floor(sea * 1.7));
  });

  test('says it is fishing in the cove', () => {
    const { g, fisher } = fishingGame(true);
    runUntil(g, () => fisher.status === 'Fishing in the cove', 30);
  });

  test('goes to the cove even when the plain sea is nearer', () => {
    const { g, fisher } = fishingGame(true, true);
    runUntil(g, () => fisher.status === 'Fishing in the cove', 30);
    run(g, 60, () => expect(fisher.status).not.toBe('Fishing'));
  });

  test('fishes at the plain sea when no cove is in reach', () => {
    const { g, fisher } = fishingGame(false);
    runUntil(g, () => fisher.status === 'Fishing', 30);
  });
});

describe('the other themes on maps with the cove', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
  const withBoth = (a: 'pines' | 'meadow') =>
    seeds.find((s) => isleWith(drawThemes(s, COVE_FROM), a) && isleWith(drawThemes(s, COVE_FROM), 'cove'))!;

  test('a meadow island next to a cove island still gets more deer and hares', () => {
    const seed = withBoth('meadow'), g = new Game(seed);
    const meadow = isleWith(g.world.themes, 'meadow')!, cove = isleWith(g.world.themes, 'cove')!;
    const count = (isle: string) => [...g.animals.values()].filter((a) => a.kind !== 'fox' && g.world.isleAt(a.x, a.y) === isle).length;
    expect(count(meadow)).toBeGreaterThanOrEqual(6);
    expect(count(meadow)).toBeGreaterThan(count(cove));
  });

  test('a pine island next to a cove island still has sea cliffs', () => {
    const g = new Game(withBoth('pines'));
    const pines = isleWith(g.world.themes, 'pines')!;
    let cliffs = 0;
    for (let i = 0; i < g.world.cliff.length; i++)
      if (g.world.cliff[i]) {
        expect(g.world.isleAt(i % g.world.w, Math.floor(i / g.world.w))).toBe(pines);
        cliffs++;
      }
    expect(cliffs).toBeGreaterThanOrEqual(12);
  });
});
