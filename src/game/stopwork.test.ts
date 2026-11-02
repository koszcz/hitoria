import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { STOPPED } from './construction';
import { canStop } from './stopwork';
import { flatGame, placeLinked, run, runUntil, setClock } from './test-helpers';

// A finished hut that settlers can walk to from the HQ.
function finished(g: Game, type: Parameters<Game['place']>[0], dx = 4, dy = 3) {
  const b = placeLinked(g, type, g.hq.x + dx, g.hq.y + dy);
  Object.assign(b, { built: true, progress: 1, status: 'Waiting for a worker' });
  return b;
}

// A game in the morning, so workers go out at once.
function morning() {
  const g = flatGame();
  setClock(g, 0.3);
  return g;
}

const working = (g: Game, b: { worker: number }) => () => !!b.worker && !!g.settlers.get(b.worker)?.inside;

describe('stop work at a hut', () => {
  test('only a finished hut with a worker can stop work', () => {
    const g = morning();
    expect(canStop(finished(g, 'sawmill'))).toBe(true);
    expect(canStop(finished(g, 'house', -4, 3))).toBe(false);
    expect(canStop(g.hq)).toBe(false);
    const site = placeLinked(g, 'quarry', g.hq.x + 4, g.hq.y - 4);
    expect(g.stopWork(site)).toBe('Only a finished hut with a worker can stop work');
  });

  test('the worker walks home and nobody is sent to the stopped hut', () => {
    const g = morning();
    const hut = finished(g, 'sawmill');
    runUntil(g, working(g, hut));
    const id = hut.worker;
    expect(g.stopWork(hut)).toBeNull();
    expect(hut.stopped).toBe(true);
    expect(hut.worker).toBe(0);
    expect(hut.status).toBe(STOPPED);
    expect(g.settlers.get(id)!.home).toBe(0);
    runUntil(g, () => !g.settlers.has(id)); // back inside the HQ
    run(g, 20);
    expect(hut.worker).toBe(0);
    expect(hut.status).toBe(STOPPED);
  });

  test('the freed worker takes the next hut that needs a worker', () => {
    const g = morning();
    const hut = finished(g, 'sawmill');
    runUntil(g, working(g, hut));
    g.pool = 0;
    const other = finished(g, 'mill', -4, 3);
    run(g, 5, () => void (g.pool = 0)); // nobody else is free
    expect(other.worker).toBe(0);
    g.stopWork(hut);
    runUntil(g, working(g, other));
    expect(hut.worker).toBe(0);
  });

  test('the hut keeps its tool, and Resume work sends a worker without a new one', () => {
    const g = morning();
    const hut = finished(g, 'quarry');
    runUntil(g, working(g, hut));
    expect(hut.tooled).toBe(true);
    const tools = g.hq.stock.tool;
    g.stopWork(hut);
    run(g, 20);
    expect(hut.tooled).toBe(true);
    expect(g.stopWork(hut)).toBe('Work is already stopped');
    expect(g.resumeWork(hut)).toBeNull();
    expect(hut.stopped).toBe(false);
    expect(hut.status).toBe('Waiting for a worker');
    runUntil(g, working(g, hut));
    expect(g.hq.stock.tool).toBe(tools);
    expect(g.resumeWork(hut)).toBe('Work is not stopped');
  });

  test('a worker on the way to the hut turns back, and brings back the tool they fetched', () => {
    const g = morning();
    const hut = finished(g, 'quarry');
    const tools = g.hq.stock.tool;
    runUntil(g, () => !!hut.worker);
    const id = hut.worker;
    g.stopWork(hut);
    expect(g.settlers.has(id)).toBe(false);
    run(g, 10);
    expect(hut.worker).toBe(0);
    expect(g.hq.sending.tool).toBe(0);
    expect(hut.tooled).toBeUndefined();
    expect(g.hq.stock.tool).toBe(tools);
  });

  test('a worker who stops while carrying a good leaves it at the hut', () => {
    const g = morning();
    const hut = finished(g, 'quarry');
    g.world.at(hut.x + 2, hut.y).rock = 3;
    runUntil(g, () => g.settlers.get(hut.worker)?.carrying === 'stone');
    g.stopWork(hut);
    expect(hut.out.stone).toBe(1);
  });

  test('a workshop that stops mid-work gets its inputs back', () => {
    const g = morning();
    const hut = finished(g, 'sawmill');
    hut.stock.log = 2;
    runUntil(g, () => hut.busy);
    const logs = hut.stock.log;
    g.stopWork(hut);
    expect(hut.stock.log).toBe(logs + 1);
    expect(hut.busy).toBe(false);
    expect(hut.using).toBeNull();
  });

  test('a stopped hut asks for no food', () => {
    const g = morning();
    g.hq.stock.fish = 10;
    const hut = finished(g, 'sawmill');
    const mine = finished(g, 'mill', -4, 3);
    g.stopWork(hut);
    g.stopWork(mine);
    run(g, 30);
    expect(hut.stock.fish + hut.incoming.fish).toBe(0);
    expect(g.hq.stock.fish).toBe(10);
  });

  test('a stopped hut stays stopped at night and after a load', () => {
    const g = morning();
    const hut = finished(g, 'sawmill');
    g.stopWork(hut);
    setClock(g, 0.9);
    run(g, 2);
    expect(hut.status).toBe(STOPPED);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    const h2 = g2.buildings.get(hut.id)!;
    expect(h2.stopped).toBe(true);
    expect(h2.status).toBe(STOPPED);
    setClock(g2, 0.3);
    run(g2, 20);
    expect(h2.worker).toBe(0);
  });

  test('a sleeping worker gets up and walks home', () => {
    const g = morning();
    const hut = finished(g, 'sawmill');
    runUntil(g, working(g, hut));
    setClock(g, 0.9);
    runUntil(g, () => !!g.settlers.get(hut.worker)?.asleep);
    const id = hut.worker;
    g.stopWork(hut);
    expect(g.settlers.get(id)!.asleep).toBeUndefined();
    runUntil(g, () => !g.settlers.has(id));
  });
});
