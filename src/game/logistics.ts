// Moving goods: what each building wants, and which carrier trips the dispatcher starts.
// When many goods wait, pack donkeys take the trips that move two goods at once.
import { BDEFS, GOODS, Good, HOUSE_FOOD, PILE, RECIPES } from './defs';
import { hire } from './carriers';
import { DONKEY_BUSY, DONKEY_LOAD, hireDonkey } from './donkeys';
import type { Game } from './game';
import { pantry } from './houses';
import { foodRank } from './foodrank';
import { feastWant } from './feast';
import { eats, forCarriers, lunchbox } from './meals';
import { isStore } from './stores';
import type { Building } from './types';
import { walkFrom } from './walking';

function want(b: Building, g: Good) {
  if (!b.built) return BDEFS[b.type].cost[g] ?? 0;
  if (b.type === 'house') return pantry(b, g);
  if (b.type === 'square') return feastWant(b, g);
  if (b.stopped && HOUSE_FOOD.includes(g)) return 0; // nobody works there to eat it
  if (eats(b) && HOUSE_FOOD.includes(g)) return lunchbox(b, g);
  const rc = RECIPES[b.type];
  if (rc?.with === g) return PILE;
  if (!rc?.from.includes(g)) return 0;
  // Several inputs share one pile, so a mine keeps PILE food of any kind.
  let other = 0;
  for (const o of rc.from) if (o !== g) other += b.stock[o] + b.incoming[o];
  return Math.max(0, PILE - other);
}

function missing(b: Building, g: Good) {
  return want(b, g) - b.stock[g] - b.incoming[g];
}

// Goods waiting to move: finished goods no carrier is coming for, and goods buildings still need.
export function waiting(g: Game) {
  let n = 0;
  for (const b of g.buildings.values()) {
    if (isStore(b)) continue;
    for (const k of GOODS) n += (b.built ? forCarriers(b, k) : 0) + Math.max(0, missing(b, k));
  }
  return n;
}

export function moveGoods(g: Game) {
  const packs = waiting(g) >= DONKEY_BUSY;
  // A trip a donkey can take: many goods wait, and both ends have room for a full load.
  const pack = (left: number, need: number, job: { from: number; to: number; g: Good }) =>
    packs && left >= DONKEY_LOAD && need >= DONKEY_LOAD && hireDonkey(g, job);

  // Finished goods go to the nearest building that needs them, else to the nearest store.
  for (const b of g.buildings.values()) {
    if (isStore(b) || !b.built) continue;
    for (const k of GOODS)
      while (forCarriers(b, k) > 0) {
        const to = pickDest(g, b, k);
        if (!to) break;
        const job = { from: b.id, to: to.id, g: k };
        if (pack(forCarriers(b, k), isStore(to) ? Infinity : missing(to, k), job)) continue;
        if (!hire(g, job)) return;
      }
  }

  // Stores send out what buildings still need, the nearest store on foot first.
  // The food chain is served first, so it gets the food when food is short.
  const needy = [...g.buildings.values()].sort((p, q) => foodRank(p.type) - foodRank(q.type));
  for (const b of needy) {
    if (isStore(b) || !GOODS.some((k) => missing(b, k) > 0)) continue;
    const dist = walkFrom(g, b);
    const stores = [...g.buildings.values()]
      .filter((s) => isStore(s) && at(g, dist, s) < Infinity)
      .sort((p, q) => at(g, dist, p) - at(g, dist, q));
    for (const k of GOODS)
      while (missing(b, k) > 0) {
        const s = stores.find((s) => s.stock[k] > s.sending[k]);
        if (!s) break;
        const job = { from: s.id, to: b.id, g: k };
        if (pack(s.stock[k] - s.sending[k], missing(b, k), job)) continue;
        if (!hire(g, job)) return;
      }
  }
}

// Nearest building on foot that wants this good, else the nearest store.
// Food goes to the food chain first, and to houses last.
function pickDest(g: Game, from: Building, good: Good) {
  const dist = walkFrom(g, from);
  const rank = (b: Building) => (HOUSE_FOOD.includes(good) ? foodRank(b.type) : 0);
  let best: Building | undefined, bd = Infinity;
  for (const b of g.buildings.values()) {
    if (b === from || isStore(b) || missing(b, good) <= 0 || at(g, dist, b) === Infinity) continue;
    if (!best || rank(b) < rank(best) || (rank(b) === rank(best) && at(g, dist, b) < bd)) { bd = at(g, dist, b); best = b; }
  }
  if (best) return best;
  bd = Infinity;
  for (const b of g.buildings.values()) {
    if (isStore(b) && at(g, dist, b) < bd) { bd = at(g, dist, b); best = b; }
  }
  return best;
}

// How far it is to walk into building `b`, read from a map of walking distances.
const at = (g: Game, dist: Float32Array, b: Building) => dist[b.y * g.world.w + b.x];
