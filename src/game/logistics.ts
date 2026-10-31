// Moving goods: what each building wants, and which carrier trips the dispatcher starts.
import { BDEFS, GOODS, Good, PILE, RECIPES } from './defs';
import { hire } from './carriers';
import type { Game } from './game';
import { pantry } from './houses';
import { distTo } from './routes';
import { isStore } from './stores';
import type { Building } from './types';

function want(b: Building, g: Good) {
  if (!b.built) return BDEFS[b.type].cost[g] ?? 0;
  if (b.type === 'house') return pantry(b, g);
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

export function moveGoods(g: Game) {
  // Finished goods go to the nearest building that needs them, else to the nearest store.
  for (const b of g.buildings.values()) {
    if (isStore(b) || !b.built) continue;
    for (const k of GOODS)
      while (b.out[k] > b.sending[k]) {
        const to = pickDest(g, b, k);
        if (!to) break;
        if (!hire(g, { from: b.id, to: to.id, g: k })) return;
      }
  }

  // Stores send out what buildings still need, the nearest store by road first.
  for (const b of g.buildings.values()) {
    if (isStore(b)) continue;
    const dist = distTo(g, b.flag);
    const stores = [...g.buildings.values()]
      .filter((s) => isStore(s) && dist.has(s.flag))
      .sort((p, q) => dist.get(p.flag)! - dist.get(q.flag)!);
    for (const k of GOODS)
      while (missing(b, k) > 0) {
        const s = stores.find((s) => s.stock[k] > s.sending[k]);
        if (!s) break;
        if (!hire(g, { from: s.id, to: b.id, g: k })) return;
      }
  }
}

// Nearest building (by road) that wants this good, else the nearest store.
function pickDest(g: Game, from: Building, good: Good) {
  let best: Building | undefined, bd = Infinity;
  for (const b of g.buildings.values()) {
    if (b === from || isStore(b) || missing(b, good) <= 0) continue;
    const d = distTo(g, b.flag).get(from.flag);
    if (d !== undefined && d < bd) { bd = d; best = b; }
  }
  if (best) return best;
  for (const b of g.buildings.values()) {
    if (!isStore(b)) continue;
    const d = distTo(g, b.flag).get(from.flag);
    if (d !== undefined && d < bd) { bd = d; best = b; }
  }
  return best;
}
