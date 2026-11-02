import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { RATE_WINDOW, noteMade, noteUsed, ratesOf } from './rates';
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

describe('rates of a building', () => {
  test('counts the goods made and used in the last minute only', () => {
    const g = flatGame();
    const b = finished(g, 'sawmill');
    expect(ratesOf(g, b)).toEqual({ made: {}, used: {} });
    noteUsed(g, b, 'log', 1);
    noteMade(g, b, 'plank', 1);
    g.time += 30;
    noteUsed(g, b, 'log', 1);
    noteMade(g, b, 'plank', 2);
    expect(ratesOf(g, b)).toEqual({ made: { plank: 3 }, used: { log: 2 } });
    g.time += RATE_WINDOW - 29;
    expect(ratesOf(g, b)).toEqual({ made: { plank: 2 }, used: { log: 1 } });
    g.time += 30;
    expect(ratesOf(g, b)).toEqual({ made: {}, used: {} });
  });

  test('goods older than a minute are dropped from memory', () => {
    const g = flatGame();
    const b = finished(g, 'sawmill');
    for (let i = 0; i < 100; i++) {
      noteMade(g, b, 'plank', 1);
      g.time += 5;
    }
    expect(g.rates.get(b.id)!.length).toBe(RATE_WINDOW / 5);
  });

  test('a working sawmill counts the logs it uses and the planks it makes', () => {
    const g = morning();
    const b = finished(g, 'sawmill');
    g.hq.stock.log = 0; // so carriers bring no more logs
    b.stock.log = 2;
    runUntil(g, () => g.made.plank === 2, 120);
    expect(ratesOf(g, b)).toEqual({ made: { plank: 2 }, used: { log: 2 } });
  });

  test('a worker who eats counts the food as used', () => {
    const g = morning();
    const b = finished(g, 'sawmill');
    b.stock.fish = 1;
    b.stock.log = 1;
    runUntil(g, () => b.stock.fish === 0, 120);
    expect(ratesOf(g, b).used.fish).toBe(1);
  });

  test('a house counts the food it turns into a settler', () => {
    const g = flatGame();
    const b = finished(g, 'house', -4, 3);
    b.stock.bread = 1;
    run(g, 1);
    expect(ratesOf(g, b)).toEqual({ made: {}, used: { bread: 1 } });
  });

  test('a well counts the water it draws', () => {
    const g = morning();
    const b = finished(g, 'well');
    runUntil(g, () => b.out.water >= 1, 60);
    expect(ratesOf(g, b).made).toEqual({ water: 1 });
  });

  test('rates are not saved', () => {
    const g = flatGame();
    const b = finished(g, 'sawmill');
    noteMade(g, b, 'plank', 1);
    const back = Game.load(g.save());
    expect(ratesOf(back, back.buildings.get(b.id)!)).toEqual({ made: {}, used: {} });
  });
});
