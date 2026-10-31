// Peaceful goals: the goods the settlement has made, and the goals the player works through in order.
import { describe, expect, test } from 'bun:test';
import { Game, GOALS } from '.';
import { flatGame, run, runUntil, placeLinked } from './test-helpers';

describe('goods made', () => {
  test('a new game has made nothing yet', () => {
    const g = flatGame();
    expect(g.made.plank).toBe(0);
    expect(g.made.log).toBe(0);
  });

  test('a sawmill counts each plank it makes', () => {
    const g = flatGame();
    const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.built, 200);
    runUntil(g, () => b.out.plank + b.stock.log < 6 && g.made.plank >= 2, 300);
    expect(g.made.plank).toBeGreaterThanOrEqual(2);
    expect(g.made.log).toBe(0);
  });

  test('a woodcutter counts each log it brings home', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 2, b.y - 2).tree = 1;
    runUntil(g, () => b.out.log + g.hq.stock.log > 6, 300);
    expect(g.made.log).toBe(1);
  });
});

describe('goals', () => {
  test('the first goal is to make 50 planks', () => {
    const g = flatGame();
    expect(g.goalNow()).toEqual({ id: 'planks', text: 'Make 50 planks', have: 0, need: 50 });
  });

  test('progress follows the planks made, not the planks stored', () => {
    const g = flatGame();
    g.hq.stock.plank = 80;
    g.made.plank = 12;
    expect(g.goalNow()?.have).toBe(12);
  });

  test('a reached goal shows a toast, then the next goal starts', () => {
    const g = flatGame();
    g.made.plank = 50;
    run(g, 1);
    expect(g.toasts).toContain('🏆 Goal reached: Make 50 planks');
    expect(g.goalNow()).toEqual({ id: 'bread', text: 'Bake 20 bread', have: 0, need: 20 });
  });

  test('progress never shows more than the goal needs', () => {
    const g = flatGame();
    g.made.bread = 5;
    g.goal = 1;
    g.made.bread = 25;
    expect(g.goalNow()?.have).toBe(20);
  });

  test('the goals come in a fixed order', () => {
    expect(GOALS.map((x) => x.text)).toEqual([
      'Make 50 planks', 'Bake 20 bread', 'Grow to 30 settlers', 'Build 3 houses', 'Build a monument',
    ]);
  });

  test('settlers count those in the HQ and those out working', () => {
    const g = flatGame();
    g.goal = 2;
    expect(g.goalNow()?.have).toBe(18);
    g.pool = 30;
    run(g, 1);
    expect(g.goalNow()?.id).toBe('houses');
  });

  test('only finished houses count', () => {
    const g = flatGame();
    g.goal = 3;
    const h = placeLinked(g, 'house', g.hq.x + 4, g.hq.y - 3);
    expect(g.goalNow()?.have).toBe(0);
    runUntil(g, () => h.built, 200);
    expect(g.goalNow()?.have).toBe(1);
  });

  test('several goals reached at once are passed one after the other', () => {
    const g = flatGame();
    g.made.plank = 50;
    g.made.bread = 20;
    run(g, 1);
    expect(g.goalNow()?.id).toBe('settlers');
    expect(g.toasts.filter((t) => t.startsWith('🏆')).length).toBe(2);
  });

  test('after the last goal there is nothing left to do', () => {
    const g = flatGame();
    g.goal = GOALS.length;
    expect(g.goalNow()).toBeNull();
    run(g, 1);
    expect(g.goal).toBe(GOALS.length);
  });
});

describe('monument', () => {
  test('a monument is built from planks and stone, and does no work', () => {
    const g = flatGame();
    g.hq.stock.plank = 30;
    g.hq.stock.stone = 30;
    const m = placeLinked(g, 'monument', g.hq.x + 5, g.hq.y - 3);
    runUntil(g, () => m.built, 400);
    expect(g.hq.stock.plank).toBe(20);
    expect(g.hq.stock.stone).toBe(14);
    run(g, 30);
    expect(m.worker).toBe(0);
  });

  test('finishing a monument reaches the last goal', () => {
    const g = flatGame();
    g.goal = GOALS.length - 1;
    g.hq.stock.stone = 30;
    const m = placeLinked(g, 'monument', g.hq.x + 5, g.hq.y - 3);
    runUntil(g, () => m.built, 400);
    run(g, 1);
    expect(g.goalNow()).toBeNull();
    expect(g.toasts).toContain('🏆 Goal reached: Build a monument');
  });
});

describe('saving goals', () => {
  test('a saved game keeps its goods made and its goal', () => {
    const g = flatGame();
    g.made.plank = 50;
    g.made.bread = 7;
    run(g, 1);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.goal).toBe(1);
    expect(g2.made.bread).toBe(7);
    expect(g2.goalNow()?.have).toBe(7);
  });

  test('a save from before goals starts at the first goal with nothing made', () => {
    const g = flatGame();
    const d = JSON.parse(JSON.stringify(g.save()));
    delete d.made;
    delete d.goal;
    const g2 = Game.load(d);
    expect(g2.goal).toBe(0);
    expect(g2.made.plank).toBe(0);
  });
});
