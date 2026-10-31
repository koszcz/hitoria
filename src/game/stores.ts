// The HQ and storehouses: which buildings keep goods for the whole settlement, and how much they hold.
import { GOODS, bag, Bag } from './defs';
import type { Game } from './game';
import type { Building } from './types';

// The HQ and every finished storehouse keep goods for the whole settlement.
export function isStore(b: Building) {
  return b.type === 'hq' || (b.type === 'storehouse' && b.built);
}

// All goods kept in the HQ and storehouses.
export function stored(g: Game): Bag {
  const sum = bag();
  for (const b of g.buildings.values()) if (isStore(b)) for (const k of GOODS) sum[k] += b.stock[k];
  return sum;
}
