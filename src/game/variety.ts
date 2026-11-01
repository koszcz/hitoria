// Mixed food: a house, worker or miner that gets a new kind of food, not the same as last time,
// grows settlers faster or eats less often. This keeps the bread chain and hunting worth running.
import { HOUSE_FOOD, type Good } from './defs';
import type { Building } from './types';

export const MIXED_MEAL = 1.5; // a meal of a new kind lasts this many times as long
export const MIXED_GROW = 0.75; // a house grows a settler in this share of the time from a new kind of food
export const MIXED_DIG = 1; // extra goods a miner digs from a new kind of food

// The food `b` eats next out of `kinds`: one it `has`, and a different kind from last time if it can.
export function pickFood(b: Building, has: (k: Good) => boolean, kinds: Good[] = HOUSE_FOOD) {
  return kinds.find((k) => k !== b.ate && has(k)) ?? kinds.find(has);
}

// `b` eats food `k`. True when it is a new kind, after a different kind last time.
export function tasteNew(b: Building, k: Good) {
  const mixed = !!b.ate && b.ate !== k;
  b.ate = k;
  return mixed;
}
