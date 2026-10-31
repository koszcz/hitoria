// Moving goods: what each building wants, where each good on a flag goes, and what stores send out.
import { BDEFS, FLAG_CAP, GOODS, Good, PILE, RECIPES, bag, Bag } from './defs';
import type { Game } from './game';
import { pantry } from './houses';
import { distTo } from './routes';
import type { Building, Flag } from './types';

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

function want(b: Building, g: Good) {
  if (!b.built) return BDEFS[b.type].cost[g] ?? 0;
  if (b.type === 'house') return pantry(b, g);
  const rc = RECIPES[b.type];
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
  // Finished goods go out onto the building's flag.
  for (const b of g.buildings.values()) {
    if (b === g.hq || !b.built) continue;
    const f = g.flags.get(b.flag)!;
    for (const k of GOODS)
      while (b.out[k] > 0 && f.items.length < FLAG_CAP) {
        b.out[k]--;
        f.items.push({ g: k, dest: 0 });
      }
  }

  // Every good on a flag gets somewhere to go; goods at their destination's flag go inside.
  for (const f of g.flags.values()) {
    f.items = f.items.filter((it) => {
      let dest = g.buildings.get(it.dest);
      if (dest && !distTo(g, dest.flag).has(f.id)) {
        dest.incoming[it.g]--;
        it.dest = 0;
        dest = undefined;
      }
      if (!dest) {
        dest = pickDest(g, f, it.g);
        if (!dest) return true;
        it.dest = dest.id;
        dest.incoming[it.g]++;
      }
      if (dest.flag !== f.id) return true;
      dest.incoming[it.g]--;
      dest.stock[it.g]++;
      return false;
    });
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
        const s = stores.find((s) => s.stock[k] > 0 && g.flags.get(s.flag)!.items.length < FLAG_CAP);
        if (!s) break;
        s.stock[k]--;
        b.incoming[k]++;
        g.flags.get(s.flag)!.items.push({ g: k, dest: b.id });
      }
  }
}

// Nearest building (by road) that wants this good, else the nearest store.
function pickDest(g: Game, f: Flag, good: Good) {
  let best: Building | undefined, bd = Infinity;
  for (const b of g.buildings.values()) {
    if (isStore(b) || missing(b, good) <= 0) continue;
    const d = distTo(g, b.flag).get(f.id);
    if (d !== undefined && d < bd) { bd = d; best = b; }
  }
  if (best) return best;
  for (const b of g.buildings.values()) {
    if (!isStore(b)) continue;
    const d = distTo(g, b.flag).get(f.id);
    if (d !== undefined && d < bd) { bd = d; best = b; }
  }
  return best;
}
