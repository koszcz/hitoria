// Hunters: they catch deer and hares near their hut, bring home meat, and the animals slowly come back.
import { describe, expect, test } from 'bun:test';
import { ANIMAL_RETURN, Game, HUNT_RANGE, type AnimalKind } from '.';
import { demolish } from './demolish';
import { pantry } from './houses';
import { expectIncomingConsistent, flatGame, placeLinked, run, runUntil } from './test-helpers';

// A flat game with no wild animals except the ones a test puts down.
function emptyMeadow() {
  const g = flatGame();
  g.animals.clear();
  g.wildCount = { deer: 0, hare: 0, fox: 0 }; // and none come back on their own
  return g;
}

function putAnimal(g: Game, kind: AnimalKind, x: number, y: number) {
  const id = Math.max(0, ...g.animals.keys()) + 1;
  g.animals.set(id, { id, kind, x, y, home: { x, y }, path: null, wait: 999, fleeing: false, facing: 1, hunter: 0 });
  return g.animals.get(id)!;
}

function builtHunter(g: Game) {
  const hut = placeLinked(g, 'hunter', g.hq.x + 5, g.hq.y);
  runUntil(g, () => hut.built && !!hut.worker, 120);
  return hut;
}

describe('hunters', () => {
  test('a hunter catches a deer in range and brings meat home', () => {
    const g = emptyMeadow();
    const deer = putAnimal(g, 'deer', g.hq.x + 9, g.hq.y + 3);
    const hut = builtHunter(g);
    runUntil(g, () => g.stored.meat + hut.out.meat >= 1, 120, () => expectIncomingConsistent(g));
    expect(g.animals.has(deer.id)).toBe(false);
    expect(g.made.meat).toBe(1);
  });

  test('a hunter catches hares too', () => {
    const g = emptyMeadow();
    putAnimal(g, 'hare', g.hq.x + 8, g.hq.y - 3);
    const hut = builtHunter(g);
    runUntil(g, () => hut.out.meat + g.stored.meat >= 1, 120);
  });

  test('a hunter leaves foxes alone', () => {
    const g = emptyMeadow();
    const fox = putAnimal(g, 'fox', g.hq.x + 8, g.hq.y + 2);
    const hut = builtHunter(g);
    run(g, 60);
    expect(g.animals.has(fox.id)).toBe(true);
    expect(hut.status).toBe('No animals in range');
  });

  test('a hunter only hunts within its range', () => {
    const g = emptyMeadow();
    const far = putAnimal(g, 'deer', g.hq.x + 5 + HUNT_RANGE + 2, g.hq.y);
    const hut = builtHunter(g);
    run(g, 60);
    expect(g.animals.has(far.id)).toBe(true);
    expect(hut.status).toBe('No animals in range');
  });

  test('the animal a hunter stalks stays still and does not run from the hunter', () => {
    const g = emptyMeadow();
    const deer = putAnimal(g, 'deer', g.hq.x + 9, g.hq.y + 3);
    deer.wait = 0;
    builtHunter(g);
    runUntil(g, () => deer.hunter > 0, 30);
    const at = `${deer.x},${deer.y}`;
    runUntil(g, () => !g.animals.has(deer.id), 60, () => {
      if (g.animals.has(deer.id)) expect(`${deer.x},${deer.y}`).toBe(at);
    });
  });

  test('an animal goes free when its hunter stops the hunt', () => {
    const g = emptyMeadow();
    const deer = putAnimal(g, 'deer', g.hq.x + 9, g.hq.y + 3);
    const hut = builtHunter(g);
    runUntil(g, () => deer.hunter > 0, 30);
    demolish(g, hut);
    expect(deer.hunter).toBe(0);
    deer.wait = 0;
    run(g, 20);
    expect(`${deer.x},${deer.y}`).not.toBe(`${g.hq.x + 9},${g.hq.y + 3}`);
  });

  test('two hunters never chase the same animal', () => {
    const g = emptyMeadow();
    putAnimal(g, 'deer', g.hq.x + 9, g.hq.y + 3);
    putAnimal(g, 'hare', g.hq.x + 9, g.hq.y - 3);
    placeLinked(g, 'hunter', g.hq.x + 5, g.hq.y);
    placeLinked(g, 'hunter', g.hq.x - 5, g.hq.y);
    run(g, 120, () => {
      const chased = [...g.animals.values()].filter((a) => a.hunter).map((a) => a.hunter);
      expect(new Set(chased).size).toBe(chased.length);
    });
  });

  test('caught animals slowly come back, so the meadows never empty', () => {
    const g = new Game(1);
    const start = g.animals.size;
    const deer = [...g.animals.values()].find((a) => a.kind === 'deer')!;
    g.animals.delete(deer.id);
    run(g, ANIMAL_RETURN - 2);
    expect(g.animals.size).toBe(start - 1);
    run(g, 4);
    expect(g.animals.size).toBe(start);
    expect([...g.animals.values()].filter((a) => a.kind === 'deer').length)
      .toBe([...new Game(1).animals.values()].filter((a) => a.kind === 'deer').length);
  });

  test('a caught animal comes back where it lived, so the hunter can hunt there again', () => {
    const g = emptyMeadow();
    g.wildCount = { deer: 0, hare: 1, fox: 0 }; // this island has one hare
    const x = g.hq.x + 9, y = g.hq.y + 3;
    putAnimal(g, 'hare', x, y);
    builtHunter(g);
    runUntil(g, () => g.made.meat === 1, 120);
    runUntil(g, () => g.animals.size === 1, ANIMAL_RETURN + 5);
    expect([...g.animals.values()][0].home).toEqual({ x, y });
  });

  test('animals that come back appear on open grass away from the HQ, with a new id', () => {
    const g = new Game(2);
    const ids = new Set(g.animals.keys());
    for (const a of [...g.animals.values()].slice(0, 3)) g.animals.delete(a.id);
    run(g, ANIMAL_RETURN * 3 + 1);
    const fresh = [...g.animals.values()].filter((a) => !ids.has(a.id));
    expect(fresh.length).toBe(3);
    for (const a of fresh) {
      expect(g.world.at(a.home.x, a.home.y).t).toBe('grass');
      expect(Math.hypot(a.home.x - g.hq.x, a.home.y - g.hq.y)).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('meat as food', () => {
  test('a house takes meat like fish or bread', () => {
    const g = flatGame();
    const house = placeLinked(g, 'house', g.hq.x + 5, g.hq.y);
    runUntil(g, () => house.built, 120);
    expect(pantry(house, 'meat')).toBeGreaterThan(0);
    g.hq.stock.meat = 2;
    runUntil(g, () => house.using === 'meat', 60);
  });

  test('a mine eats meat', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let ty = y - 1; ty <= y + 1; ty++) for (let tx = x + 7; tx <= x + 8; tx++) g.world.at(tx, ty).t = 'mountain';
    const mine = placeLinked(g, 'mine', x + 5, y);
    runUntil(g, () => mine.built, 120);
    const stone = g.stored.stone;
    g.hq.stock.meat = 2;
    runUntil(g, () => g.stored.stone >= stone + 4, 300);
    expect(g.stored.meat + mine.stock.meat).toBe(0);
  });
});
