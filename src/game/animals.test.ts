// Wild animals: deer, hares and foxes that roam the meadows and step aside for settlers.
import { describe, expect, test } from 'bun:test';
import { ANIMAL, Game, ROAM } from '.';
import { takeSettler } from './settlers';
import { flatGame, run } from './test-helpers';

describe('wild animals', () => {
  test('a new game has deer, hares and foxes on open grass, away from the HQ', () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const g = new Game(seed);
      const kinds = [...g.animals.values()].map((a) => a.kind);
      expect(kinds).toContain('deer');
      expect(kinds).toContain('hare');
      expect(kinds).toContain('fox');
      for (const a of g.animals.values()) {
        expect(g.world.at(a.x, a.y).t).toBe('grass');
        expect(g.passable(a.x, a.y)).toBe(true);
        expect(Math.hypot(a.x - g.hq.x, a.y - g.hq.y)).toBeGreaterThanOrEqual(6);
      }
    }
  });

  test('the same seed always puts the animals in the same places', () => {
    const where = (g: Game) => [...g.animals.values()].map((a) => `${a.kind}@${a.x},${a.y}`);
    expect(where(new Game(9))).toEqual(where(new Game(9)));
  });

  test('animals roam but stay near their home spot, on ground they can stand on', () => {
    const g = new Game(1);
    const start = new Map([...g.animals.values()].map((a) => [a.id, `${a.x},${a.y}`]));
    run(g, 120, () => {
      for (const a of g.animals.values()) {
        expect(Math.hypot(a.x - a.home.x, a.y - a.home.y)).toBeLessThanOrEqual(ROAM + 3);
        expect(g.passable(Math.round(a.x), Math.round(a.y))).toBe(true);
      }
    });
    const moved = [...g.animals.values()].filter((a) => start.get(a.id) !== `${a.x},${a.y}`);
    expect(moved.length).toBeGreaterThan(g.animals.size / 2);
  });

  test('animal footsteps do not wear paths into the grass', () => {
    const g = new Game(1);
    g.pool = 0; // no settlers walk out, so any wear would come from the animals
    run(g, 120);
    expect(g.wear.some((w) => w > 0)).toBe(false);
  });

  // A flat game with one resting hare, 8 tiles east of the HQ, and a settler standing still beside it.
  function hareAndSettler() {
    const g = flatGame();
    g.animals.clear();
    const x = g.hq.x + 8, y = g.hq.y;
    g.animals.set(1, { id: 1, kind: 'hare', x, y, home: { x, y }, path: null, wait: 999, fleeing: false, facing: 1 });
    g.pool = 1;
    const s = takeSettler(g, 'carrier')!;
    Object.assign(s, { x: x - 1, y, tasks: [{ k: 'work', t: 999 }] });
    return { g, hare: g.animals.get(1)!, s };
  }

  test('an animal steps aside when a settler comes close', () => {
    const { g, hare, s } = hareAndSettler();
    run(g, 4);
    expect(Math.hypot(hare.x - s.x, hare.y - s.y)).toBeGreaterThanOrEqual(ANIMAL.hare.shy);
    expect(hare.x).toBeGreaterThan(s.x); // it went away from the settler, not past them
  });

  test('animals never block settlers', () => {
    const { g, hare } = hareAndSettler();
    expect(g.passable(hare.x, hare.y)).toBe(true);
  });

  test('a loaded game has its animals back', () => {
    const g = new Game(5);
    run(g, 30);
    expect(Game.load(g.save()).animals.size).toBe(new Game(5).animals.size);
  });
});
