// What a building costs. Each House costs 1 more plank and 1 more stone than the last, counting
// every House on all islands. A site keeps the price it had when you placed it.
import { BDEFS, type Bag, type BType } from './defs';
import type { Game } from './game';
import type { Building } from './types';

// What the next building of this type costs, if you place it now.
export function priceOf(g: Game, type: BType): Partial<Bag> {
  const cost = BDEFS[type].cost;
  if (type !== 'house') return cost;
  let n = 0;
  for (const b of g.buildings.values()) if (b.type === 'house') n++;
  return { plank: (cost.plank ?? 0) + n, stone: (cost.stone ?? 0) + n };
}

// What this building or site costs. A site from an older save has no price, so it costs what
// the building list says.
export const costOf = (b: Building): Partial<Bag> => b.price ?? BDEFS[b.type].cost;
