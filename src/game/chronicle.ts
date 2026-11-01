// The chronicle: a dated list of the island's milestones, such as the first birth or the tenth
// trade ship. It is kept with the save, and shown when the player loads their island.
import { dayNumber } from '../seasons/day';
import type { BType } from './defs';
import type { Game } from './game';

export const TRADE_MILESTONE = 10; // every this many trade ships gets a line in the chronicle

// One milestone, without its day.
export type Milestone =
  | { what: 'born' } // the first settler born on the island
  | { what: 'built'; type: BType } // the first building of a kind was finished
  | { what: 'goal'; goal: string } // a goal was reached, by its id
  | { what: 'trade'; n: number }; // the nth trade ship tied up
export type Entry = Milestone & { day: number };

// Write `m` into the chronicle with today's date.
export function note(g: Game, m: Milestone) {
  g.chronicle.push({ day: dayNumber(g.time), ...m });
}

// A settler was born. Only the first birth is noted.
export function noteBirth(g: Game) {
  if (!g.chronicle.some((e) => e.what === 'born')) note(g, { what: 'born' });
}

// A building of `type` was finished. Only the first of each kind is noted.
export function noteBuilt(g: Game, type: BType) {
  if (!g.chronicle.some((e) => e.what === 'built' && e.type === type)) note(g, { what: 'built', type });
}

// A trade ship tied up. Every tenth one is noted.
export function noteTrader(g: Game) {
  g.tradeVisits++;
  if (g.tradeVisits % TRADE_MILESTONE === 0) note(g, { what: 'trade', n: g.tradeVisits });
}
