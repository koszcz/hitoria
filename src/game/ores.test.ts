import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { BDEFS, BUILDABLE, GOODS, RECIPES, type BType } from './defs';
import { flatGame, runUntil, expectIncomingConsistent, placeBare } from './test-helpers';

const ORE_MINES = [['coalmine', 'coal'], ['ironmine', 'ore']] as const;

function placeLinked(g: Game, type: BType, x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = placeBare(g, type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  return b;
}

function mountain(g: Game, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.world.at(x, y).t = 'mountain';
}

describe('coal and iron mines', () => {
  test('coal and iron ore are goods', () => {
    expect(GOODS).toContain('coal');
    expect(GOODS).toContain('ore');
  });

  test('you can build both mines, and a miner works them', () => {
    for (const [type] of ORE_MINES) {
      expect(BUILDABLE).toContain(type);
      expect(BDEFS[type].worker).toBe('miner');
    }
  });

  test('each mine digs its good from fish or bread, like the stone mine', () => {
    for (const [type, good] of ORE_MINES) {
      const rc = RECIPES[type]!;
      expect(rc.to).toBe(good);
      expect(rc.from).toEqual(RECIPES.mine!.from);
    }
  });

  test('the mines go only next to a mountain', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (const [type] of ORE_MINES) expect(g.canPlace(type, x + 5, y)).toBe('Must be next to a mountain');
    mountain(g, x + 7, y - 1, x + 8, y + 1);
    for (const [type] of ORE_MINES) expect(g.canPlace(type, x + 5, y)).toBeNull();
  });

  for (const [type, good] of ORE_MINES)
    test(`a ${type} eats food and sends its ${good} to the HQ`, () => {
      const g = flatGame();
      const { x, y } = g.hq;
      mountain(g, x + 7, y - 1, x + 8, y + 1);
      const mine = placeLinked(g, type, x + 5, y);
      runUntil(g, () => mine.built, 120);
      runUntil(g, () => mine.status === 'Waiting for fish or bread', 30);
      expect(g.stored[good]).toBe(0);
      g.hq.stock.bread = 2;
      runUntil(g, () => g.stored[good] >= 4, 300, () => expectIncomingConsistent(g));
      expect(g.made[good]).toBeGreaterThanOrEqual(4);
      expect(g.stored.stone).toBe(flatGame().stored.stone);
    });

  test('a save from before coal and ore still loads, with none of either', () => {
    const g = flatGame();
    const d = g.save();
    for (const b of d.buildings) {
      const { coal: _c, ore: _o, ...rest } = b.stock;
      b.stock = rest as typeof b.stock;
    }
    const { coal: _c, ore: _o, ...made } = d.made!;
    d.made = made as typeof d.made;
    const l = Game.load(d);
    expect(l.hq.stock.coal).toBe(0);
    expect(l.made.ore).toBe(0);
  });
});
