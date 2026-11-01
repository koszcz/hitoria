// The trade ship: each morning it sails in from the open sea and ties up at your harbour until
// late afternoon. While it is there, you swap spare goods for goods you lack. When it comes and
// goes is in tradeday.ts. What it wants and sells is in wants.ts.
import type { P } from '../path';
import { dayNumber } from '../seasons/day';
import { W, H } from '../world';
import { noteTrader } from './chronicle';
import type { Good } from './defs';
import type { Game } from './game';
import { maySail, untilCastOff } from './tradeday';
import type { Building, Trader } from './types';
import { flood, sailOn, seaPath, sources, water } from './voyage';
import { rollWants, stockLeft, traderDeal } from './wants';

// What each good is worth to the trader. Goods that take longer chains to make are worth more.
export const VALUE: Record<Good, number> = {
  log: 1, stone: 1, water: 1, grain: 1,
  plank: 2, fish: 2, meat: 2, flour: 2, coal: 2, ore: 2,
  bread: 3, iron: 4, tool: 6,
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// One deal: how many of `give` you hand over for how many of `get`. The trader keeps half the
// worth, unless the deal is `fair`.
export function dealFor(give: Good, get: Good, fair = false) {
  const a = (fair ? 1 : 2) * VALUE[get], b = VALUE[give], d = gcd(a, b);
  return { give: a / d, get: b / d };
}

// The harbour the trade ship visits: the oldest finished harbour on your home island.
export function tradeHarbour(g: Game): Building | null {
  let best: Building | null = null;
  for (const b of g.buildings.values())
    if (b.type === 'harbour' && b.built && !b.landed && g.dock(b) && (!best || b.id < best.id)) best = b;
  return best;
}

// The water tile on the edge of the map that is the shortest sail from `dock`.
function seaEdge(g: Game, dock: P): P | null {
  const d = flood(dock, water(g));
  let best: P | null = null, bd = Infinity;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (x && y && x !== W - 1 && y !== H - 1) continue;
      const n = d[y * W + x];
      if (n >= 0 && n < bd) {
        best = { x, y };
        bd = n;
      }
    }
  return best;
}

// Send the ship back out to sea.
function leave(g: Game, t: Trader) {
  const edge = seaEdge(g, { x: Math.round(t.x), y: Math.round(t.y) });
  t.leg = 'out';
  t.path = edge ? seaPath(g, { x: Math.round(t.x), y: Math.round(t.y) }, edge) : [];
}

export function stepTrader(g: Game, dt: number) {
  const t = g.trader;
  if (!t) {
    const h = tradeHarbour(g);
    if (!h || !maySail(g.time, g.traderDay)) return;
    const dock = g.dock(h)!, edge = seaEdge(g, dock);
    if (!edge) return;
    g.traderDay = dayNumber(g.time);
    g.trader = { harbour: h.id, ...edge, path: seaPath(g, edge, dock), leg: 'in', left: untilCastOff(g.time), ...rollWants(g.rand) };
    g.toasts.push('🚢 A trade ship is sailing to your harbour');
    return;
  }
  const h = g.buildings.get(t.harbour);
  if (t.leg !== 'out' && !h) leave(g, t);
  if (t.leg === 'docked') {
    t.left = untilCastOff(g.time);
    if (t.left <= 0) leave(g, t);
    return;
  }
  if (!sailOn(t, dt)) return;
  if (t.leg === 'in') {
    t.leg = 'docked';
    g.toasts.push('🚢 The trade ship has tied up at your harbour');
    noteTrader(g);
    return;
  }
  g.trader = null; // gone over the horizon
}

// How many of good `k` the stores on harbour `h`'s island can spare now.
export function spare(g: Game, h: Building, k: Good) {
  return sources(g, h).reduce((n, s) => n + s.stock[k] - s.sending[k], 0);
}

// Why you can't make one deal of `give` for `get` at harbour `h` now, or null if you can.
export function canTrade(g: Game, h: Building, give: Good, get: Good): string | null {
  const t = g.trader;
  if (!t || t.leg !== 'docked' || t.harbour !== h.id) return 'No trade ship is here';
  if (give === get) return 'Pick two different goods';
  const deal = traderDeal(t, give, get);
  if (stockLeft(t, get) < deal.get) return 'The trader has no more of this good';
  if (spare(g, h, give) < deal.give) return 'Not enough goods to give';
  return null;
}

// Make one deal. The goods you give come from the harbour first, then the nearest stores.
// The goods you get go into the harbour. Returns why it can't, or null once it has.
export function trade(g: Game, h: Building, give: Good, get: Good): string | null {
  const why = canTrade(g, h, give, get);
  if (why) return why;
  const t = g.trader!, deal = traderDeal(t, give, get);
  if (get in t.stock) t.stock[get]! -= deal.get;
  let left = deal.give;
  for (const s of sources(g, h)) {
    const take = Math.max(0, Math.min(left, s.stock[give] - s.sending[give]));
    s.stock[give] -= take;
    left -= take;
  }
  h.stock[get] += deal.get;
  return null;
}
