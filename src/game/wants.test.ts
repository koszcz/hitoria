// What each trade ship wants and sells: goods it wants at a fair rate, a few rare goods it sells
// at a fair rate while they last, and a limit on the tools and iron it sells.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { DAY_LENGTH } from '../seasons/day';
import { canTrade, dealFor } from './trade';
import { OFFER_STOCK, OFFERS, SELL_LIMIT, WANTS, rollWants, traderDeal } from './wants';
import { harbourGame, run, runUntil } from './test-helpers';
import type { Trader } from './types';

function docked(seed = 1) {
  const { g, h } = harbourGame(seed);
  runUntil(g, () => g.trader?.leg === 'docked', 200);
  return { g, h, t: g.trader! };
}

// Set what the docked ship wants and sells, so a test does not depend on the roll.
function setWants(t: Trader, wants: Trader['wants'], offers: Trader['offers']) {
  t.wants = wants;
  t.offers = offers;
  t.stock = { tool: SELL_LIMIT.tool, iron: SELL_LIMIT.iron };
  for (const k of offers) t.stock[k] = OFFER_STOCK;
}

describe('what a ship brings', () => {
  test('wants 2 goods and sells 2 other rare goods, from their own lists', () => {
    const g = new Game(3);
    for (let i = 0; i < 50; i++) {
      const r = rollWants(g.rand);
      expect(r.wants.length).toBe(2);
      expect(r.offers.length).toBe(2);
      expect(new Set([...r.wants, ...r.offers]).size).toBe(4);
      for (const k of r.wants) expect(WANTS).toContain(k);
      for (const k of r.offers) expect(OFFERS).toContain(k);
      expect(r.stock.tool).toBe(SELL_LIMIT.tool);
      expect(r.stock.iron).toBe(SELL_LIMIT.iron);
      for (const k of r.offers) expect(r.stock[k]).toBe(OFFER_STOCK);
    }
  });

  test('never wants or sells tools or iron as a rare good', () => {
    for (const k of ['tool', 'iron'] as const) {
      expect(WANTS).not.toContain(k);
      expect(OFFERS).not.toContain(k);
    }
  });

  test('each ship that sets out rolls its own list', () => {
    const { g, t } = docked();
    expect(t.wants.length).toBe(2);
    expect(t.offers.length).toBe(2);
    runUntil(g, () => g.trader === null, DAY_LENGTH, undefined, 0.5);
    runUntil(g, () => g.trader?.leg === 'in', DAY_LENGTH, undefined, 0.5);
    expect(g.trader!.wants.length).toBe(2);
  });
});

describe('the rates', () => {
  test('a wanted good is swapped at its full worth', () => {
    const t = { wants: ['fish'], offers: [] } as unknown as Trader;
    expect(traderDeal(t, 'fish', 'bread')).toEqual({ give: 3, get: 2 });
    expect(traderDeal(t, 'log', 'bread')).toEqual(dealFor('log', 'bread'));
  });

  test('a rare good on sale is bought at its full worth', () => {
    const t = { wants: [], offers: ['coal'] } as unknown as Trader;
    expect(traderDeal(t, 'log', 'coal')).toEqual({ give: 2, get: 1 });
    expect(traderDeal(t, 'log', 'ore')).toEqual(dealFor('log', 'ore'));
  });

  test('a wanted good for a rare good is still only a fair swap', () => {
    const t = { wants: ['fish'], offers: ['coal'] } as unknown as Trader;
    expect(traderDeal(t, 'fish', 'coal')).toEqual({ give: 1, get: 1 });
  });
});

describe('trading with the ship', () => {
  test('gives the better rate for a wanted good', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.fish = 3;
    expect(g.trade(h, 'fish', 'bread')).toBeNull();
    expect(g.hq.stock.fish).toBe(0);
    expect(h.stock.bread).toBe(2);
  });

  test('sells only so many tools each visit', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.plank = 100;
    for (let i = 0; i < SELL_LIMIT.tool; i++) expect(g.trade(h, 'plank', 'tool')).toBeNull();
    expect(t.stock.tool).toBe(0);
    expect(g.trade(h, 'plank', 'tool')).toBe('The trader has no more of this good');
    expect(h.stock.tool).toBe(SELL_LIMIT.tool);
  });

  test('sells only so much iron each visit', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.plank = 100;
    for (let i = 0; i < SELL_LIMIT.iron; i++) expect(g.trade(h, 'plank', 'iron')).toBeNull();
    expect(g.trade(h, 'plank', 'iron')).toBe('The trader has no more of this good');
    expect(h.stock.iron).toBe(SELL_LIMIT.iron);
  });

  test('sells its rare goods until they run out', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.stone = 100;
    for (let i = 0; i < OFFER_STOCK; i++) expect(g.trade(h, 'stone', 'coal')).toBeNull();
    expect(h.stock.coal).toBe(OFFER_STOCK);
    expect(g.hq.stock.stone).toBe(100 - 2 * OFFER_STOCK);
    expect(canTrade(g, h, 'stone', 'coal')).toBe('The trader has no more of this good');
  });

  test('a deal that would give more than the ship has left is refused', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['plank', 'ore']);
    t.stock.plank = 1;
    g.hq.stock.iron = 5;
    expect(traderDeal(t, 'iron', 'plank').get).toBe(2);
    expect(g.trade(h, 'iron', 'plank')).toBe('The trader has no more of this good');
    expect(g.hq.stock.iron).toBe(5);
  });

  test('other goods have no limit', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.stone = 200;
    for (let i = 0; i < 40; i++) expect(g.trade(h, 'stone', 'plank')).toBeNull();
    expect(h.stock.plank).toBe(40);
  });
});

describe('saves', () => {
  test('the wants and what is left are kept in a save', () => {
    const { g, h, t } = docked();
    setWants(t, ['fish', 'log'], ['coal', 'ore']);
    g.hq.stock.stone = 10;
    g.trade(h, 'stone', 'coal');
    const back = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(back.trader!.wants).toEqual(['fish', 'log']);
    expect(back.trader!.stock.coal).toBe(OFFER_STOCK - 1);
  });

  test('a ship from an older save wants nothing and keeps the tool and iron limit', () => {
    const { g } = docked();
    const d = JSON.parse(JSON.stringify(g.save()));
    delete d.trader.wants;
    delete d.trader.offers;
    delete d.trader.stock;
    const back = Game.load(d);
    expect(back.trader!.wants).toEqual([]);
    expect(back.trader!.offers).toEqual([]);
    expect(back.trader!.stock).toEqual({ tool: SELL_LIMIT.tool, iron: SELL_LIMIT.iron });
  });
});
