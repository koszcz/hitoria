// The HQ, storehouses and harbours: which buildings keep goods for the whole settlement, and how much they hold.
import { GOODS, bag, Bag } from './defs';
import type { Game } from './game';
import type { Building } from './types';

// The HQ and every finished storehouse and harbour keep goods for the whole settlement.
export function isStore(b: Building) {
  return b.type === 'hq' || ((b.type === 'storehouse' || b.type === 'harbour') && b.built);
}

// All goods kept in the HQ, storehouses and harbours.
export function stored(g: Game): Bag {
  const sum = bag();
  for (const b of g.buildings.values()) if (isStore(b)) for (const k of GOODS) sum[k] += b.stock[k];
  return sum;
}
