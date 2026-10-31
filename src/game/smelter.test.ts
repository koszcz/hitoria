import { describe, expect, test } from 'bun:test';
import { Game, PILE } from '.';
import { BDEFS, BUILDABLE, GOODS, RECIPES } from './defs';
import { flatGame, placeLinked, run, runUntil, expectIncomingConsistent } from './test-helpers';

describe('smelter', () => {
  test('iron is a good, and you can build a smelter that a smelter works', () => {
    expect(GOODS).toContain('iron');
    expect(BUILDABLE).toContain('smelter');
    expect(BDEFS.smelter.worker).toBe('smelter');
  });

  test('a smelter turns 1 iron ore and 1 coal into 1 iron', () => {
    const rc = RECIPES.smelter!;
    expect(rc.from).toEqual(['ore']);
    expect(rc.with).toBe('coal');
    expect(rc.to).toBe('iron');
    expect(rc.n).toBe(1);
  });

  test('a smelter with ore but no coal waits for coal', () => {
    const g = flatGame();
    const smelter = placeLinked(g, 'smelter', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => smelter.built, 150);
    g.hq.stock.ore = 3;
    runUntil(g, () => smelter.stock.ore >= 3, 60);
    runUntil(g, () => smelter.status === 'Waiting for coal', 30);
    run(g, 20);
    expect(g.made.iron).toBe(0);
  });

  test('a smelter with coal but no ore waits for iron ore', () => {
    const g = flatGame();
    const smelter = placeLinked(g, 'smelter', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => smelter.built, 150);
    g.hq.stock.coal = 3;
    runUntil(g, () => smelter.stock.coal >= 3, 60);
    runUntil(g, () => smelter.status === 'Waiting for iron ore', 30);
    expect(g.made.iron).toBe(0);
  });

  test('a smelter uses 1 ore and 1 coal for each iron, and carriers take the iron to the HQ', () => {
    const g = flatGame();
    const smelter = placeLinked(g, 'smelter', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => smelter.built, 150);
    Object.assign(g.hq.stock, { ore: 3, coal: 2 });
    runUntil(g, () => g.stored.iron >= 2, 150, () => expectIncomingConsistent(g));
    run(g, 30);
    expect(g.made.iron).toBe(2);
    expect(g.stored.ore + smelter.stock.ore).toBe(1);
    expect(g.stored.coal + smelter.stock.coal).toBe(0);
  });

  test('a smelter keeps at most 4 ore and 4 coal', () => {
    const g = flatGame();
    const smelter = placeLinked(g, 'smelter', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => smelter.built, 150);
    Object.assign(g.hq.stock, { ore: 10, coal: 10 });
    let ore = 0, coal = 0;
    run(g, 60, () => {
      ore = Math.max(ore, smelter.stock.ore + smelter.incoming.ore);
      coal = Math.max(coal, smelter.stock.coal + smelter.incoming.coal);
    });
    expect(ore).toBe(PILE);
    expect(coal).toBe(PILE);
  });

  test('saving while a smelter works puts its ore and coal back', () => {
    const g = flatGame();
    const smelter = placeLinked(g, 'smelter', g.hq.x + 4, g.hq.y + 3);
    runUntil(g, () => smelter.built, 150);
    Object.assign(smelter.stock, { ore: 1, coal: 1 });
    runUntil(g, () => smelter.busy, 30);
    const saved = g.save().buildings.find((b) => b.id === smelter.id)!;
    expect(saved.stock.ore).toBe(1);
    expect(saved.stock.coal).toBe(1);
  });

  test('a save from before iron loads with no iron', () => {
    const g = flatGame();
    const d = g.save();
    for (const b of d.buildings) delete (b.stock as Partial<typeof b.stock>).iron;
    delete (d.made as Partial<typeof g.made>).iron;
    const l = Game.load(JSON.parse(JSON.stringify(d)));
    expect(l.hq.stock.iron).toBe(0);
    expect(l.made.iron).toBe(0);
  });
});
