import { describe, expect, test } from 'bun:test';
import { BEDTIME, WAKE } from '../seasons/day';
import { ASLEEP } from './sleep';
import { flatGame, placeLinked, run, runUntil, setClock, wallOff } from './test-helpers';
import type { Game } from './game';
import type { Building } from './types';

// A game with a sawmill that has its worker and plenty of logs, so the worker never runs out of work.
function sawmillGame() {
  const g = flatGame();
  const mill = placeLinked(g, 'sawmill', g.hq.x + 5, g.hq.y);
  Object.assign(mill, { built: true, progress: 1 });
  mill.stock.log = 20;
  runUntil(g, () => workerOf(g, mill)?.inside === true && mill.busy, 60);
  return { g, mill };
}

const workerOf = (g: Game, b: Building) => g.settlers.get(b.worker);

describe('workers sleep at night', () => {
  test('at night a worker walks home to the HQ, goes inside and stops working', () => {
    const { g, mill } = sawmillGame();
    setClock(g, BEDTIME);
    const s = workerOf(g, mill)!;
    runUntil(g, () => s.asleep === g.hq.id, 60);
    expect(s.inside).toBe(true);
    expect(Math.round(s.x)).toBe(g.hq.x);
    expect(Math.round(s.y)).toBe(g.hq.y);
    expect(mill.status).toBe(ASLEEP);
    const planks = mill.out.plank + g.stored.plank;
    run(g, 60);
    expect(mill.out.plank + g.stored.plank).toBe(planks);
    expect(mill.busy).toBe(false);
    expect(mill.worker).toBe(s.id); // the hut keeps its worker
  });

  test('a worker finishes the piece of work in hand before going to bed', () => {
    const { g, mill } = sawmillGame();
    const planks = mill.out.plank;
    setClock(g, BEDTIME);
    runUntil(g, () => !mill.busy, 15); // a hungry sawyer takes 10 s
    expect(mill.out.plank).toBe(planks + 1);
  });

  test('at dawn the worker walks back to their hut and works again', () => {
    const { g, mill } = sawmillGame();
    setClock(g, BEDTIME);
    const s = workerOf(g, mill)!;
    runUntil(g, () => !!s.asleep, 60);
    setClock(g, WAKE + 0.01);
    g.update(0.1);
    expect(s.asleep).toBeUndefined();
    runUntil(g, () => mill.busy, 60);
    expect(Math.round(s.x)).toBe(mill.x);
    expect(Math.round(s.y)).toBe(mill.y);
  });

  test('a worker sleeps in the nearest house when it is closer than the HQ', () => {
    const g = flatGame();
    const mill = placeLinked(g, 'sawmill', g.hq.x + 7, g.hq.y);
    const house = placeLinked(g, 'house', g.hq.x + 7, g.hq.y + 3);
    const far = placeLinked(g, 'house', g.hq.x - 7, g.hq.y);
    for (const b of [mill, house, far]) Object.assign(b, { built: true, progress: 1 });
    runUntil(g, () => workerOf(g, mill)?.inside === true, 60);
    setClock(g, BEDTIME);
    const s = workerOf(g, mill)!;
    runUntil(g, () => !!s.asleep, 60);
    expect(s.asleep).toBe(house.id);
    expect(s.inside).toBe(true);
  });

  test('a house still being built is no bed', () => {
    const g = flatGame();
    const mill = placeLinked(g, 'sawmill', g.hq.x + 7, g.hq.y);
    Object.assign(mill, { built: true, progress: 1 });
    placeLinked(g, 'house', g.hq.x + 7, g.hq.y + 3);
    runUntil(g, () => workerOf(g, mill)?.inside === true, 60);
    setClock(g, BEDTIME);
    const s = workerOf(g, mill)!;
    runUntil(g, () => !!s.asleep, 60);
    expect(s.asleep).toBe(g.hq.id);
  });

  test('a worker with no bed in reach sleeps in their own hut', () => {
    const { g, mill } = sawmillGame();
    wallOff(g, mill);
    setClock(g, BEDTIME);
    const s = workerOf(g, mill)!;
    runUntil(g, () => !!s.asleep, 60);
    expect(s.asleep).toBe(mill.id);
    expect(s.inside).toBe(true);
  });

  test('builders stop building at night and go back to work at dawn', () => {
    const g = flatGame();
    const site = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    const builder = () => g.settlers.get(site.builder);
    runUntil(g, () => site.progress > 0.05, 120);
    setClock(g, BEDTIME);
    runUntil(g, () => !!builder()?.asleep, 60);
    const progress = site.progress;
    run(g, 30);
    expect(site.progress).toBe(progress);
    expect(site.status).toBe(ASLEEP);
    setClock(g, WAKE + 0.01);
    runUntil(g, () => site.built, 120);
  });

  test('nobody leaves home for work at night', () => {
    const g = flatGame();
    setClock(g, BEDTIME);
    g.update(0.1);
    const mill = placeLinked(g, 'sawmill', g.hq.x + 5, g.hq.y);
    const site = placeLinked(g, 'storehouse', g.hq.x - 5, g.hq.y);
    Object.assign(mill, { built: true, progress: 1, status: 'Waiting for a worker' });
    run(g, 20);
    expect(mill.worker).toBe(0);
    expect(site.builder).toBe(0);
    expect(mill.status).toBe(ASLEEP);
    expect(site.status).toBe(ASLEEP);
    setClock(g, WAKE + 0.01);
    run(g, 1);
    expect(mill.worker).not.toBe(0);
    expect(site.builder).not.toBe(0);
  });

  test('carriers keep carrying goods at night', () => {
    const { g, mill } = sawmillGame();
    setClock(g, BEDTIME);
    runUntil(g, () => g.allAsleep(), 60);
    mill.out.plank = 3;
    const stored = g.stored.plank;
    runUntil(g, () => g.stored.plank >= stored + 3, 120);
    expect(g.allAsleep()).toBe(true);
  });

  test('you can ask whether every worker is asleep', () => {
    const { g, mill } = sawmillGame();
    expect(g.allAsleep()).toBe(false); // daytime
    setClock(g, BEDTIME);
    g.update(0.1);
    expect(g.allAsleep()).toBe(false); // still walking home
    runUntil(g, () => !!workerOf(g, mill)?.asleep, 60);
    expect(g.allAsleep()).toBe(true);
    setClock(g, WAKE + 0.01);
    expect(g.allAsleep()).toBe(false); // dawn
  });

  test('an island with no workers counts as asleep only at night', () => {
    const g = flatGame();
    expect(g.allAsleep()).toBe(false);
    setClock(g, BEDTIME);
    expect(g.allAsleep()).toBe(true);
  });
});
