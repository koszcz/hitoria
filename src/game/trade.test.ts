// The trade ship: it visits your harbour every few minutes, and while it is tied up you swap
// spare goods for goods you lack, at fixed rates.
import { describe, expect, test } from 'bun:test';
import { Game, bag } from '.';
import { dealFor, TRADE_EVERY, TRADE_STAY, VALUE, tradeHarbour } from './trade';
import { harbourGame, run, runUntil, totalGoods } from './test-helpers';

// Run until the trade ship is tied up at the harbour.
function docked(seed = 1) {
  const { g, h } = harbourGame(seed);
  runUntil(g, () => g.trader?.leg === 'docked', TRADE_EVERY + 200);
  Object.assign(g.trader!, { wants: [], offers: [], stock: {} }); // the usual rates, with no limits
  return { g, h };
}

describe('the rates', () => {
  test('the trader gives half the worth of what you give, in whole goods', () => {
    expect(dealFor('log', 'iron')).toEqual({ give: 8, get: 1 });
    expect(dealFor('plank', 'tool')).toEqual({ give: 6, get: 1 });
    expect(dealFor('fish', 'bread')).toEqual({ give: 3, get: 1 });
    expect(dealFor('iron', 'log')).toEqual({ give: 1, get: 2 });
  });

  test('every good has a worth, and every deal loses half of it', () => {
    for (const a of Object.keys(VALUE) as (keyof typeof VALUE)[])
      for (const b of Object.keys(VALUE) as (keyof typeof VALUE)[]) {
        if (a === b) continue;
        const d = dealFor(a, b);
        expect(d.give * VALUE[a]).toBe(2 * d.get * VALUE[b]);
      }
  });
});

describe('visits', () => {
  test('no trade ship comes while you have no harbour', () => {
    const g = new Game(1);
    run(g, TRADE_EVERY + 30, undefined, 0.5);
    expect(g.trader).toBeNull();
  });

  test('no trade ship comes to an unfinished harbour', () => {
    const { g } = harbourGame(1, false);
    g.hq.stock = bag(); // nothing to build it with, so it stays unfinished
    run(g, TRADE_EVERY + 30, undefined, 0.5);
    expect(g.trader).toBeNull();
  });

  test('comes a few minutes after the harbour stands, sails in from the sea and ties up', () => {
    const { g, h } = harbourGame();
    run(g, TRADE_EVERY - 1, undefined, 0.5);
    expect(g.trader).toBeNull();
    run(g, 2, undefined, 0.5);
    expect(g.trader?.leg).toBe('in');
    expect(g.trader!.harbour).toBe(h.id);
    expect(g.toasts).toContain('🚢 A trade ship is sailing to your harbour');
    runUntil(g, () => g.trader?.leg === 'docked', 200);
    const dock = g.dock(h)!;
    expect({ x: g.trader!.x, y: g.trader!.y }).toEqual(dock);
    expect(g.toasts).toContain('🚢 The trade ship has tied up at your harbour');
  });

  test('stays a while, then sails off, and comes back later', () => {
    const { g } = docked();
    run(g, TRADE_STAY - 1, undefined, 0.5);
    expect(g.trader?.leg).toBe('docked');
    run(g, 2, undefined, 0.5);
    expect(g.trader?.leg).toBe('out');
    runUntil(g, () => g.trader === null, 300);
    runUntil(g, () => g.trader !== null, TRADE_EVERY + 1);
  });

  test('visits a harbour on your home island, not the one your settlers built', () => {
    const { g, h } = harbourGame();
    h.landed = true;
    expect(tradeHarbour(g)).toBeNull();
    h.landed = false;
    expect(tradeHarbour(g)).toBe(h);
  });

  test('sails away if its harbour is demolished', () => {
    const { g, h } = docked();
    g.buildings.delete(h.id);
    run(g, 1);
    expect(g.trader?.leg).toBe('out');
  });

  test('is kept in a save', () => {
    const { g } = docked();
    run(g, 10);
    const back = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(back.trader).toEqual(g.trader);
    expect(back.traderT).toBe(g.traderT);
  });

  test('older saves without a trade ship load with none on the way', () => {
    const { g } = harbourGame();
    const d = g.save();
    delete d.trader;
    delete d.traderT;
    const back = Game.load(d);
    expect(back.trader).toBeNull();
    expect(back.traderT).toBe(TRADE_EVERY);
  });
});

describe('trading', () => {
  test('swaps goods from your stores for goods in the harbour', () => {
    const { g, h } = docked();
    const before = totalGoods(g);
    g.hq.stock.log = 20;
    expect(g.trade(h, 'log', 'iron')).toBeNull();
    expect(g.hq.stock.log).toBe(12);
    expect(h.stock.iron).toBe(1);
    expect(totalGoods(g).iron).toBe(before.iron + 1);
  });

  test('takes from the harbour first, then other stores', () => {
    const { g, h } = docked();
    g.hq.stock.fish = 5;
    h.stock.fish = 1;
    expect(g.trade(h, 'fish', 'bread')).toBeNull();
    expect(h.stock.fish).toBe(0);
    expect(g.hq.stock.fish).toBe(3);
  });

  test('needs enough of the good you give', () => {
    const { g, h } = docked();
    g.hq.stock.stone = 7;
    h.stock.stone = 0;
    expect(g.trade(h, 'stone', 'iron')).toBe('Not enough goods to give');
    expect(g.hq.stock.stone).toBe(7);
  });

  test('does not count goods a carrier is already coming for', () => {
    const { g, h } = docked();
    g.hq.stock.stone = 8;
    g.hq.sending.stone = 1;
    expect(g.trade(h, 'stone', 'iron')).toBe('Not enough goods to give');
  });

  test('only while the ship is tied up at this harbour', () => {
    const { g, h } = harbourGame();
    g.hq.stock.log = 20;
    expect(g.trade(h, 'log', 'iron')).toBe('No trade ship is here');
    const { g: g2, h: h2 } = docked();
    g2.trader!.leg = 'out';
    expect(g2.trade(h2, 'log', 'iron')).toBe('No trade ship is here');
  });

  test('a good for the same good is no trade', () => {
    const { g, h } = docked();
    expect(g.trade(h, 'log', 'log')).toBe('Pick two different goods');
  });
});
