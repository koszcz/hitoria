import { describe, expect, test } from 'bun:test';
import { DAY_LENGTH, WAKE, clock } from '../seasons/day';
import { BLESSED_SPEED, blessed } from './blessing';
import { FEAST_FOOD, FEAST_TEXT, feastOn } from './feast';
import { Game } from './game';
import { RECIPES } from './defs';
import { flatGame, placeLinked, runUntil, setClock } from './test-helpers';
import type { Building } from './types';
import { idle } from './work';

const built = (b: Building) => Object.assign(b, { built: true, progress: 1 });

// A game with a finished Feast Square and a sawmill that has its worker at work.
function feastGame() {
  const g = flatGame();
  const sq = built(placeLinked(g, 'square', g.hq.x + 4, g.hq.y + 3));
  const mill = built(placeLinked(g, 'sawmill', g.hq.x + 6, g.hq.y));
  mill.stock.log = 20;
  mill.stock.fish = 20;
  runUntil(g, () => g.settlers.get(mill.worker)?.inside === true, 60);
  return { g, sq, mill };
}

const fill = (sq: Building) => {
  for (const k of ['fish', 'bread', 'meat'] as const) sq.stock[k] = FEAST_FOOD[k]!;
};

// Hold a religious feast at square `sq` and run the game to the dawn after it.
function holdReligious(g: Game, sq: Building) {
  expect(g.orderFeast(sq, 'religious')).toBeNull();
  fill(sq);
  g.update(0.3);
  g.time = sq.feast!.at!;
  g.update(0.3);
  setClock(g, WAKE);
  g.update(0.3);
}

// How long the sawmill worker's next piece of sawing takes.
function sawTime(g: Game, mill: Building) {
  const s = g.settlers.get(mill.worker)!;
  s.tasks = [];
  idle(g, s);
  return s.tasks.find((t) => t.k === 'work')!.t;
}

describe('ordering a religious feast', () => {
  test('it needs the same food as a wedding feast and begins at the next dusk', () => {
    const { g, sq } = feastGame();
    expect(g.orderFeast(sq, 'religious')).toBeNull();
    expect(sq.feast).toEqual({ kind: 'religious' });
    g.hq.stock.fish = 30;
    g.hq.stock.bread = 30;
    g.hq.stock.meat = 30;
    runUntil(g, () => sq.feast?.at !== undefined, 200);
    expect([sq.stock.fish, sq.stock.bread, sq.stock.meat]).toEqual([10, 10, 10]);
    expect(sq.status).toBe('The feast begins at dusk');
  });

  test('it uses up the feast for the season, like a wedding', () => {
    const { g, sq } = feastGame();
    g.orderFeast(sq, 'religious');
    expect(g.canFeast(sq)).toBe('A feast is already planned');
    sq.feast = undefined;
    expect(g.canFeast(sq)).toBe('You can hold one feast each season');
  });
});

describe('the religious feast night', () => {
  test('workers gather at the square, and the square says which feast is on', () => {
    const { g, sq, mill } = feastGame();
    g.orderFeast(sq, 'religious');
    fill(sq);
    g.update(0.3);
    g.time = sq.feast!.at!;
    g.update(0.3);
    expect(feastOn(g)).toBe(sq);
    expect(sq.status).toBe('The religious feast is on');
    expect(g.toasts).toContain('🕯️ The religious feast has begun');
    const s = g.settlers.get(mill.worker)!;
    runUntil(g, () => s.feast === sq.id, 60);
    expect(mill.status).toBe(FEAST_TEXT.religious.at);
    setClock(g, 0.001);
    g.update(0.3);
    expect(sq.status).toBe('The blessing comes at dawn');
  });

  test('at dawn it brings no settlers, but blesses the village until midnight', () => {
    const { g, sq } = feastGame();
    const before = g.population;
    expect(blessed(g)).toBe(false);
    holdReligious(g, sq);
    expect(g.population).toBe(before);
    expect(sq.feast).toBeUndefined();
    expect(sq.status).toBe('Ready to hold a feast');
    expect(g.toasts).toContain('🙏 The village is blessed: everyone works 25% faster today');
    expect(g.chronicle.some((e) => e.what === 'feast')).toBe(false);
    expect(blessed(g)).toBe(true);
    expect(g.blessedUntil - g.time).toBeCloseTo((1 - WAKE) * DAY_LENGTH, 0);
    setClock(g, 0.999);
    expect(blessed(g)).toBe(true);
    setClock(g, 0.001);
    expect(clock(g.time)).toBeCloseTo(0.001, 5);
    expect(blessed(g)).toBe(false);
  });
});

describe('the blessing', () => {
  test('a blessed worker works 25% faster', () => {
    const { g, sq, mill } = feastGame();
    setClock(g, 0.4);
    expect(sawTime(g, mill)).toBe(RECIPES.sawmill!.t);
    holdReligious(g, sq);
    setClock(g, 0.4);
    expect(BLESSED_SPEED).toBe(1.25);
    expect(sawTime(g, mill)).toBeCloseTo(RECIPES.sawmill!.t / 1.25, 5);
  });

  test('a blessed builder builds 25% faster', () => {
    const { g, sq } = feastGame();
    holdReligious(g, sq);
    setClock(g, 0.4);
    const site = placeLinked(g, 'sawmill', g.hq.x - 5, g.hq.y);
    site.stock.plank = 2;
    site.stock.stone = 2;
    runUntil(g, () => g.settlers.get(site.builder)?.atWork === true, 120);
    const start = site.progress;
    for (let i = 0; i < 10; i++) g.update(0.1);
    expect(site.progress - start).toBeCloseTo((1 * 1.25) / 9, 5);
  });

  test('the blessing survives a save', () => {
    const { g, sq } = feastGame();
    holdReligious(g, sq);
    const h = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(h.blessedUntil).toBe(g.blessedUntil);
    expect(blessed(h)).toBe(true);
  });

  test('a planned religious feast survives a save', () => {
    const { g, sq } = feastGame();
    g.orderFeast(sq, 'religious');
    const h = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(h.buildings.get(sq.id)!.feast).toEqual({ kind: 'religious' });
  });
});
