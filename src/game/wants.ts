// What each trade ship wants and sells. It wants a few goods, which it takes at their full worth.
// It sells a few rare goods at their full worth while they last, and only a few tools and iron.
import type { Good } from './defs';
import { dealFor } from './trade';
import type { Trader } from './types';

export const WANT_COUNT = 2; // goods each ship wants
export const OFFER_COUNT = 2; // rare goods each ship sells
export const OFFER_STOCK = 6; // how many of each rare good a ship carries
export const SELL_LIMIT = { tool: 2, iron: 4 }; // the most tools and iron a ship sells each visit

// The goods a ship may want, and the rare goods it may sell. Neither list has tools or iron.
export const WANTS: Good[] = ['log', 'stone', 'grain', 'plank', 'fish', 'meat', 'flour', 'coal', 'ore', 'bread'];
export const OFFERS: Good[] = ['plank', 'fish', 'meat', 'flour', 'coal', 'ore', 'bread'];

export type Wants = Pick<Trader, 'wants' | 'offers' | 'stock'>;

// Pick `n` goods from `from`, leaving out those in `not`.
function pick(rand: () => number, from: Good[], n: number, not: Good[]) {
  const left = from.filter((k) => !not.includes(k)), out: Good[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
  return out;
}

// What a new ship wants and sells. The rare goods are picked first, so a ship never wants a good it sells.
export function rollWants(rand: () => number): Wants {
  const offers = pick(rand, OFFERS, OFFER_COUNT, []);
  const wants = pick(rand, WANTS, WANT_COUNT, offers);
  const stock: Trader['stock'] = { ...SELL_LIMIT };
  for (const k of offers) stock[k] = OFFER_STOCK;
  return { wants, offers, stock };
}

// What a ship from a save made before wants: nothing, with the usual limit on tools and iron.
export function oldWants(t: Partial<Wants>): Wants {
  return { wants: t.wants ?? [], offers: t.offers ?? [], stock: t.stock ?? { ...SELL_LIMIT } };
}

// One deal with this ship. A wanted good or a rare good on sale swaps at its full worth.
export function traderDeal(t: Pick<Trader, 'wants' | 'offers'>, give: Good, get: Good) {
  return dealFor(give, get, t.wants.includes(give) || t.offers.includes(get));
}

// How many of `k` the ship has left to sell, or Infinity if it sells any number.
export const stockLeft = (t: Pick<Trader, 'stock'>, k: Good) => t.stock[k] ?? Infinity;
