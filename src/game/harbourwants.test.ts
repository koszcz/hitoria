// Harbour wants: each harbour sets how many of each good its island should keep.
import { describe, expect, test } from 'bun:test';
import { Game } from './game';
import { COLONY_FOOD_NOTE, WANT_MAX, WANT_STEP, shortOn, spareOn, wantOf, wantOn } from './harbourwants';
import { colonyGame, harbourGame } from './test-helpers';

describe('setting a want', () => {
  test('a want goes up and down in steps of 5, up to 50', () => {
    expect(WANT_STEP).toBe(5);
    expect(WANT_MAX).toBe(50);
  });

  test('a finished harbour wants what you set, from 0 to 50', () => {
    const { g, h } = harbourGame();
    expect(wantOf(h, 'fish')).toBe(0);
    expect(g.setWant(h, 'fish', 10)).toBeNull();
    expect(wantOf(h, 'fish')).toBe(10);
    g.setWant(h, 'fish', 80);
    expect(wantOf(h, 'fish')).toBe(50);
    g.setWant(h, 'fish', -5);
    expect(wantOf(h, 'fish')).toBe(0);
    expect(h.wants).toEqual({});
  });

  test('only a finished harbour can want goods', () => {
    const { g, h } = harbourGame(1, false);
    expect(g.setWant(h, 'fish', 10)).toBe('Only a finished harbour can want goods');
    expect(g.setWant(g.hq, 'fish', 10)).toBe('Only a finished harbour can want goods');
    expect(h.wants).toBeUndefined();
    expect(g.hq.wants).toBeUndefined();
  });

  test('wants are kept in a save', () => {
    const { g, h } = harbourGame();
    g.setWant(h, 'plank', 20);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.buildings.get(h.id)!.wants).toEqual({ plank: 20 });
  });
});

describe('what an island lacks and can spare', () => {
  test('an island lacks what its harbours want beyond the goods stored there', () => {
    const { g, colony } = colonyGame();
    colony.stock.fish = 3;
    g.setWant(colony, 'fish', 10);
    expect(wantOn(g, 'other', 'fish')).toBe(10);
    expect(wantOn(g, 'home', 'fish')).toBe(0);
    expect(shortOn(g, 'other', 'fish')).toBe(7);
    expect(shortOn(g, 'home', 'fish')).toBe(0);
  });

  test('an island spares only what it stores beyond its own wants', () => {
    const { g, h } = colonyGame();
    for (const b of g.buildings.values()) b.stock.fish = 0;
    g.hq.stock.fish = 30;
    expect(spareOn(g, 'home', 'fish')).toBe(30);
    g.setWant(h, 'fish', 25);
    expect(spareOn(g, 'home', 'fish')).toBe(5);
    g.setWant(h, 'fish', 40);
    expect(spareOn(g, 'home', 'fish')).toBe(0);
  });
});

describe('landing', () => {
  test('when settlers land, a message says the colony needs food', () => {
    const { g } = colonyGame();
    expect(COLONY_FOOD_NOTE).toBe("🐟 Your new colony needs food. Build a Fisher's Hut there, or set its harbour to want fish and a boat brings it");
    expect(g.toasts).toContain(COLONY_FOOD_NOTE);
  });
});
