// The goods chart's record: how much of each good the stores held, noted every few seconds.
// The record lives in memory only, so a loaded game starts a fresh one.
import type { Bag } from './defs';
import type { Game } from './game';
import { stored } from './stores';

export const HISTORY_EVERY = 10; // seconds of game time between two notes
export const HISTORY_KEEP = 360; // notes kept, so the record covers the last hour

export interface StockSample {
  t: number; // game time
  stock: Bag; // the goods in the HQ, storehouses and harbours then
}

const slot = (t: number) => Math.floor(t / HISTORY_EVERY);

// Note the stores once in every HISTORY_EVERY seconds of game time, so the notes never drift apart.
export function noteStock(g: Game) {
  const last = g.stockHistory.at(-1);
  if (last && slot(g.time) <= slot(last.t)) return;
  g.stockHistory.push({ t: g.time, stock: stored(g) });
  if (g.stockHistory.length > HISTORY_KEEP) g.stockHistory.shift();
}
