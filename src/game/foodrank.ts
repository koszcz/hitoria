// Food makers eat first: when food is short, carriers feed the food chain before anyone else.
import type { BType } from './defs';

// Farms, wells and mills keep the bread coming, so they eat first.
const FOOD_CHAIN: BType[] = ['farm', 'well', 'mill'];

// Who gets food first: 0 for the food chain, 1 for other huts and mines, 2 for houses, and 3 for
// a Feast Square, since a feast can wait.
export function foodRank(type: BType) {
  if (FOOD_CHAIN.includes(type)) return 0;
  if (type === 'square') return 3;
  return type === 'house' ? 2 : 1;
}
