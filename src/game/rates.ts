// How fast each building makes and uses goods: a short log of the last minute's goods.
// The log lives in memory only, so a loaded game starts counting again.
import type { Good } from './defs';
import type { Game } from './game';
import type { Building } from './types';

export const RATE_WINDOW = 60; // seconds of game time the rates count back over

export interface RateNote {
  t: number; // game time
  good: Good;
  n: number;
  made: boolean; // true when the building made the goods, false when it used them up
}

export type Rates = { made: Partial<Record<Good, number>>; used: Partial<Record<Good, number>> };

function note(g: Game, b: Building, good: Good, n: number, made: boolean) {
  const log = g.rates.get(b.id) ?? [];
  const keep = log.filter((e) => e.t > g.time - RATE_WINDOW);
  keep.push({ t: g.time, good, n, made });
  g.rates.set(b.id, keep);
}

export const noteMade = (g: Game, b: Building, good: Good, n: number) => note(g, b, good, n, true);
export const noteUsed = (g: Game, b: Building, good: Good, n: number) => note(g, b, good, n, false);

// The goods a building made and used in the last minute, by good.
export function ratesOf(g: Game, b: Building): Rates {
  const out: Rates = { made: {}, used: {} };
  for (const e of g.rates.get(b.id) ?? []) {
    if (e.t <= g.time - RATE_WINDOW) continue;
    const side = e.made ? out.made : out.used;
    side[e.good] = (side[e.good] ?? 0) + e.n;
  }
  return out;
}
