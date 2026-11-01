import { describe, expect, test } from 'bun:test';
import { clock, isNight } from '../seasons/day';
import { seasonAt, yearAt } from '../seasons/year';
import { flatGame, placeLinked, run, runUntil } from './test-helpers';
import type { Game } from '.';

// Move the game clock to the next start of `season`, plus `into` seconds. If that falls at night,
// wait for the morning, because workers sleep at night.
function skipTo(g: Game, season: 'spring' | 'winter', into = 5) {
  while (seasonAt(yearAt(g.time)) === season) g.time += 1;
  while (seasonAt(yearAt(g.time)) !== season) g.time += 1;
  g.time += into;
  while (isNight(g.time)) g.time += 1;
}

const fieldsOf = (g: Game, id: number) => g.world.tiles.filter((t) => t.field === id);

describe('winter fields', () => {
  test('sown grain stops growing in winter and grows again in spring', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 5, y - 4);
    const tile = fieldsOf(g, farm.id)[0];
    skipTo(g, 'winter');
    tile.crop = 0.3;
    run(g, 30);
    expect(tile.crop).toBe(0.3);
    skipTo(g, 'spring');
    run(g, 10);
    expect(tile.crop).toBeGreaterThan(0.3);
  });

  test('a farmer does not sow in winter, and says the fields rest', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 5, y - 4);
    runUntil(g, () => farm.built, 120);
    skipTo(g, 'winter');
    for (const t of g.world.tiles) t.crop = 0;
    runUntil(g, () => farm.status === 'Fields rest in winter', 60);
    run(g, 60);
    expect(fieldsOf(g, farm.id).every((t) => t.crop === 0)).toBe(true);
  });

  test('a farmer still brings in grain that ripened before winter', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 5, y - 4);
    runUntil(g, () => farm.built, 120);
    skipTo(g, 'winter');
    for (const t of fieldsOf(g, farm.id)) t.crop = 1;
    const grain = g.stored.grain;
    runUntil(g, () => g.stored.grain + farm.out.grain > grain, 120);
  });

  test('farms sow again when spring comes', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 5, y - 4);
    runUntil(g, () => farm.built, 120);
    skipTo(g, 'winter');
    for (const t of g.world.tiles) t.crop = 0;
    run(g, 20);
    skipTo(g, 'spring');
    runUntil(g, () => fieldsOf(g, farm.id).some((t) => t.crop > 0), 60);
  });
});

describe('winter fishing', () => {
  // Fish a fisher catches in 120 s from the morning of the next `season`.
  function catchIn(season: 'spring' | 'winter') {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let ty = y - 2; ty <= y + 2; ty++) for (let tx = x - 9; tx <= x - 8; tx++) g.world.at(tx, ty).t = 'water';
    const fisher = placeLinked(g, 'fisher', x - 5, y);
    runUntil(g, () => fisher.built && g.made.fish > 0, 300);
    skipTo(g, season);
    while (clock(g.time) < 0.3 || clock(g.time) > 0.31) g.time += 1;
    const before = g.made.fish;
    run(g, 120);
    return g.made.fish - before;
  }

  test('a fisher catches about half as many fish in winter', () => {
    const spring = catchIn('spring'), winter = catchIn('winter');
    expect(winter).toBeGreaterThan(0);
    expect(winter).toBeLessThanOrEqual(Math.ceil(spring * 0.6));
  });
});
