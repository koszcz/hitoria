import { describe, expect, test } from 'bun:test';
import { bag } from './defs';
import { Game } from './game';
import { costOf, priceOf } from './prices';
import { flatGame, placeBare, placeLinked, runUntil } from './test-helpers';

// Place `n` house sites in a row east of the HQ, without checking the spots.
function houses(g: ReturnType<typeof flatGame>, n: number) {
  return Array.from({ length: n }, (_, i) => placeBare(g, 'house', g.hq.x + 3 + (i % 10), g.hq.y + 3 + Math.floor(i / 10) * 2));
}

describe('rising house prices', () => {
  test('the first House costs 3 planks and 2 stone', () => {
    expect(priceOf(flatGame(), 'house')).toEqual({ plank: 3, stone: 2 });
  });

  test('each House costs 1 more plank and 1 more stone than the last', () => {
    const g = flatGame();
    houses(g, 1);
    expect(priceOf(g, 'house')).toEqual({ plank: 4, stone: 3 });
    houses(g, 1);
    expect(priceOf(g, 'house')).toEqual({ plank: 5, stone: 4 });
  });

  test('the 20th House costs 22 planks and 21 stone', () => {
    const g = flatGame();
    houses(g, 19);
    expect(priceOf(g, 'house')).toEqual({ plank: 22, stone: 21 });
  });

  test('a site keeps the price it had when you placed it', () => {
    const g = flatGame();
    const [first, second] = houses(g, 2);
    houses(g, 3);
    expect(costOf(first)).toEqual({ plank: 3, stone: 2 });
    expect(costOf(second)).toEqual({ plank: 4, stone: 3 });
  });

  test('removing a House lowers the next price', () => {
    const g = flatGame();
    const [first] = houses(g, 3);
    g.removeAt({ x: first.x, y: first.y });
    expect(priceOf(g, 'house')).toEqual({ plank: 5, stone: 4 });
  });

  test('Houses on every island count', () => {
    const g = flatGame();
    houses(g, 2);
    const far = placeBare(g, 'house', 2, 2); // a corner of the map, far from the home island
    expect(costOf(far)).toEqual({ plank: 5, stone: 4 });
  });

  test('other buildings keep their price', () => {
    const g = flatGame();
    houses(g, 5);
    expect(priceOf(g, 'sawmill')).toEqual({ plank: 2, stone: 2 });
    const mill = placeBare(g, 'sawmill', g.hq.x - 4, g.hq.y);
    expect(costOf(mill)).toEqual({ plank: 2, stone: 2 });
  });

  test('no House ever costs iron or tools', () => {
    const g = flatGame();
    houses(g, 30);
    const p = priceOf(g, 'house');
    expect(p.iron).toBeUndefined();
    expect(p.tool).toBeUndefined();
  });

  test('a site without a saved price costs what the building list says', () => {
    const g = flatGame();
    houses(g, 4);
    const old = placeBare(g, 'house', g.hq.x - 4, g.hq.y + 3);
    delete old.price; // a site from a save made before prices rose
    expect(costOf(old)).toEqual({ plank: 3, stone: 2 });
  });

  test('a saved site keeps its price after loading', () => {
    const g = flatGame();
    const [, second] = houses(g, 2);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(costOf(g2.buildings.get(second.id)!)).toEqual({ plank: 4, stone: 3 });
    expect(priceOf(g2, 'house')).toEqual({ plank: 5, stone: 4 });
  });

  test('carriers bring a site its own price, and builders finish it', () => {
    const g = flatGame();
    houses(g, 2).forEach((b) => g.removeAt({ x: b.x, y: b.y })); // nothing left, so the price is back to the start
    houses(g, 2);
    g.hq.stock = bag({ plank: 40, stone: 40, fish: 10 });
    const h = placeLinked(g, 'house', g.hq.x - 4, g.hq.y + 2);
    expect(costOf(h)).toEqual({ plank: 5, stone: 4 });
    runUntil(g, () => h.built, 600);
    expect(h.stock.plank).toBe(0); // built: the materials are used up
  });
});
