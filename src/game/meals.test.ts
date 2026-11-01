// Hungry workers: workers in huts eat now and then, and work at half speed with no food.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { eats, feed, HUNGRY_PACE, LUNCHBOX, lunchbox, MEAL, selfFed } from './meals';
import { expectIncomingConsistent, flatGame, placeBare, placeLinked, run, runUntil, setClock } from './test-helpers';
import { BEDTIME } from '../seasons/day';
import { ASLEEP } from './sleep';
import type { Task } from './types';

const work = (t: number): Task[] => [{ k: 'work', t }];

// A finished sawmill with plenty of logs, so its worker never waits for them.
function sawmill(g: Game) {
  const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
  runUntil(g, () => b.built && b.worker > 0, 200);
  b.stock.log = 40;
  return b;
}

// Seconds the sawmill takes to make `n` more planks.
function sawFor(g: Game, b: ReturnType<typeof sawmill>, n: number) {
  const made = g.made.plank;
  return runUntil(g, () => g.made.plank >= made + n, 600, () => expectIncomingConsistent(g));
}

describe('who eats', () => {
  test('workers in huts eat, but carriers, builders, miners and scouts do not', () => {
    const g = flatGame();
    for (const t of ['woodcutter', 'forester', 'quarry', 'sawmill', 'fisher', 'farm', 'well', 'mill', 'bakery', 'hunter', 'smelter', 'toolmaker', 'geologist'] as const)
      expect(eats(placeBare(g, t, 1, 1))).toBe(true);
    // Miners already eat as they dig. A lookout's scout does no work. Stores and houses have no worker.
    for (const t of ['mine', 'coalmine', 'ironmine', 'lookout', 'storehouse', 'house', 'monument', 'harbour'] as const)
      expect(eats(placeBare(g, t, 1, 1))).toBe(false);
  });

  test('huts that make food feed their worker from their own pile', () => {
    const g = flatGame();
    expect(['fisher', 'hunter', 'bakery'].map((t) => selfFed(placeBare(g, t as 'fisher', 1, 1)))).toEqual([true, true, true]);
    expect(selfFed(placeBare(g, 'sawmill', 1, 1))).toBe(false);
  });
});

describe('the lunchbox', () => {
  test('a finished hut keeps a little food of any kind for its worker', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', 1, 1);
    expect(lunchbox(b, 'fish')).toBe(0); // not built yet
    b.built = true;
    expect(lunchbox(b, 'fish')).toBe(LUNCHBOX);
    expect(lunchbox(b, 'log')).toBe(0);
    b.stock.bread = 1;
    expect(lunchbox(b, 'fish')).toBe(LUNCHBOX - 1);
    b.incoming.meat = 1;
    expect(lunchbox(b, 'fish')).toBe(0);
  });

  test('a hut that makes food asks for none', () => {
    const g = flatGame();
    const b = placeBare(g, 'fisher', 1, 1);
    b.built = true;
    expect(lunchbox(b, 'bread')).toBe(0);
  });
});

describe('eating', () => {
  test('a worker eats one food, and it lasts for MEAL seconds of work', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', 1, 1);
    b.stock.fish = 2;
    const tasks = work(5);
    feed(b, tasks);
    expect(b.stock.fish).toBe(1);
    expect(b.hungry).toBe(false);
    expect(tasks[0]).toEqual({ k: 'work', t: 5 });
    // The rest of the meal lasts for the next pieces of work, with no more food eaten.
    for (let t = 5; t < MEAL; t += 5) feed(b, work(5));
    expect(b.stock.fish).toBe(1);
    feed(b, work(5));
    expect(b.stock.fish).toBe(0);
  });

  test('a worker with no food is hungry and takes twice as long', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', 1, 1);
    const tasks: Task[] = [{ k: 'walk', x: 1, y: 1 }, { k: 'work', t: 3 }, { k: 'work', t: 1 }];
    feed(b, tasks);
    expect(b.hungry).toBe(true);
    expect(tasks.map((t) => (t.k === 'work' ? t.t : 0))).toEqual([0, 3 * HUNGRY_PACE, 1 * HUNGRY_PACE]);
    // Food arrives: the worker eats and works at full speed again.
    b.stock.meat = 1;
    const next = work(3);
    feed(b, next);
    expect(b.hungry).toBe(false);
    expect(next[0]).toEqual({ k: 'work', t: 3 });
  });

  test('a fisher eats from its own catch, but not from fish a carrier is coming for', () => {
    const g = flatGame();
    const b = placeBare(g, 'fisher', 1, 1);
    b.out.fish = 1;
    b.sending.fish = 1;
    feed(b, work(5));
    expect(b.hungry).toBe(true);
    b.out.fish = 2;
    feed(b, work(5));
    expect(b.hungry).toBe(false);
    expect(b.out.fish).toBe(1);
  });
});

describe('hungry workers in play', () => {
  test('a sawmill with no food saws at half speed, and carriers bring food to speed it up', () => {
    const g = flatGame();
    const b = sawmill(g);
    const slow = sawFor(g, b, 4);
    expect(b.hungry).toBe(true);
    expect(b.status).toBe('Sawing planks');
    g.hq.stock.fish = 4;
    runUntil(g, () => !b.hungry, 120, () => expectIncomingConsistent(g));
    const fast = sawFor(g, b, 4);
    expect(slow).toBeGreaterThan(fast * 1.7);
    // It keeps a lunchbox, and the rest of the fish stays in the HQ.
    expect(b.stock.fish).toBeLessThanOrEqual(LUNCHBOX);
    expect(g.hq.stock.fish).toBeGreaterThanOrEqual(1);
  });

  test('a hungry worker who rests for want of work is no longer marked hungry', () => {
    const g = flatGame();
    const b = sawmill(g);
    sawFor(g, b, 2);
    expect(b.hungry).toBe(true);
    b.stock.log = 0;
    runUntil(g, () => b.status === 'Waiting for logs', 60);
    run(g, 2);
    expect(b.hungry).toBe(false);
  });

  test('a hungry worker who sleeps is no longer marked hungry', () => {
    const g = flatGame();
    const b = sawmill(g);
    sawFor(g, b, 2);
    expect(b.hungry).toBe(true);
    setClock(g, BEDTIME);
    runUntil(g, () => b.status === ASLEEP, 60);
    run(g, 1);
    expect(b.hungry).toBe(false);
  });

  test('a fisher keeps one fish from its catch, so it does not go hungry while carriers take the rest', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let ty = y - 2; ty <= y + 2; ty++) for (let tx = x - 9; tx <= x - 8; tx++) g.world.at(tx, ty).t = 'water';
    const b = placeLinked(g, 'fisher', x - 5, y);
    runUntil(g, () => b.built && b.worker > 0, 200);
    runUntil(g, () => g.made.fish >= 3, 600, () => expectIncomingConsistent(g));
    // After its first catch, the fisher always has a fish of its own to eat.
    let hungry = 0;
    run(g, 120, () => { if (b.hungry) hungry++; });
    expect(hungry).toBe(0);
    expect(g.stored.fish).toBeGreaterThan(0);
  });

  test('a worker waiting for goods eats nothing', () => {
    const g = flatGame();
    const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.built && b.worker > 0, 200);
    g.hq.stock.log = 0;
    runUntil(g, () => b.status === 'Waiting for logs' && !b.incoming.log && !b.stock.log, 120);
    b.fed = 0;
    g.hq.stock.fish = 2;
    runUntil(g, () => b.stock.fish === 2, 120);
    for (let i = 0; i < 300; i++) g.update(0.1);
    expect(b.stock.fish).toBe(2);
    expect(b.fed).toBe(0);
  });

  test('a save keeps how full each worker is', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', g.hq.x - 4, g.hq.y);
    b.stock.fish = 1;
    feed(b, work(5));
    const l = Game.load(g.save());
    const c = l.buildings.get(b.id)!;
    expect(c.fed).toBe(b.fed);
    expect(c.hungry).toBe(false);
  });

  test('a save from before hungry workers loads with everyone fed nothing yet', () => {
    const g = flatGame();
    const b = placeBare(g, 'sawmill', g.hq.x - 4, g.hq.y);
    const d = g.save();
    for (const s of d.buildings) {
      delete s.fed;
      delete s.hungry;
    }
    const l = Game.load(d);
    expect(l.buildings.get(b.id)!.fed ?? 0).toBe(0);
  });
});
