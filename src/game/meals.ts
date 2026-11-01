// Hungry workers: every worker in a hut eats one fish, meat or bread now and then.
// A worker with no food works at half speed.
import { BDEFS, BType, Good, HOUSE_FOOD, Role } from './defs';
import type { Building, Task } from './types';
import { MIXED_MEAL, pickFood, tasteNew } from './variety';

export const MEAL = 60; // seconds of work that one fish, meat or bread is good for
export const LUNCHBOX = 2; // food a hut keeps on hand for its worker
export const HUNGRY_PACE = 2; // a hungry worker takes this many times as long over each piece of work
export const OWN_MEAL = 1; // food a hut that makes food keeps back from carriers, so its worker can eat

// Miners already eat as they dig. Carriers and builders never work in a hut, and a lookout's scout does no work.
const NOT_HUNGRY: Role[] = ['carrier', 'builder', 'miner', 'scout'];
// Huts that make food feed their worker from their own pile, so no carrier brings them food.
export const SELF_FED: BType[] = ['fisher', 'hunter', 'bakery'];

// Does the worker of this building type need food?
export function hungryWorker(type: BType) {
  const role = BDEFS[type].worker;
  return !!role && !NOT_HUNGRY.includes(role);
}
export const eats = (b: Building) => hungryWorker(b.type);
export const selfFed = (b: Building) => SELF_FED.includes(b.type);

// How many of finished good `g` carriers may take. A hut that makes food keeps one back for its worker.
export function forCarriers(b: Building, g: Good) {
  const keep = selfFed(b) && HOUSE_FOOD.includes(g) ? Math.min(b.out[g], OWN_MEAL) : 0;
  return Math.max(0, b.out[g] - b.sending[g] - keep);
}

// How many of food `g` a finished hut wants brought in. Food of any kind shares one small pile.
export function lunchbox(b: Building, g: Good) {
  if (!b.built || !eats(b) || selfFed(b) || !HOUSE_FOOD.includes(g)) return 0;
  let other = 0;
  for (const o of HOUSE_FOOD) if (o !== g) other += b.stock[o] + b.incoming[o];
  return Math.max(0, LUNCHBOX - other);
}

// The worker is about to do `tasks`. When the last meal is used up, they eat. With no food,
// every piece of work takes twice as long.
export function feed(b: Building, tasks: Task[]) {
  let work = 0;
  for (const t of tasks) if (t.k === 'work') work += t.t;
  if ((b.fed ?? 0) <= 0) eat(b);
  b.hungry = (b.fed ?? 0) <= 0;
  if (!b.hungry) b.fed! -= work;
  else for (const t of tasks) if (t.k === 'work') t.t *= HUNGRY_PACE;
}

// Eat one food from the hut's stock, else from its own pile of finished goods that no carrier is coming for.
// A new kind of food makes the meal last longer.
function eat(b: Building) {
  let k = pickFood(b, (k) => b.stock[k] > 0);
  if (k) b.stock[k]--;
  else {
    k = pickFood(b, (k) => b.out[k] > b.sending[k]);
    if (!k) return;
    b.out[k]--;
  }
  b.fed = (b.fed ?? 0) + MEAL * (tasteNew(b, k) ? MIXED_MEAL : 1);
}
