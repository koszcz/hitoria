// Road carriers: each one moves goods, one at a time, between the two flags of their road.
import { CARRIER_REST, FLAG_CAP } from './defs';
import type { Game } from './game';
import { nextRoad } from './routes';
import { despawn } from './settlers';
import type { Road, Settler } from './types';

// A good waiting at one end of road `r` (0 = flag a, 1 = flag b) that this road should take.
export function cargo(g: Game, r: Road, end: 0 | 1) {
  const from = g.flags.get(end ? r.b : r.a)!, to = g.flags.get(end ? r.a : r.b)!;
  return from.items.find((it) => {
    const d = g.buildings.get(it.dest);
    if (!d || d.flag === from.id) return false; // arrived; the dispatcher takes it inside
    return nextRoad(g, from, d.flag) === r.id && (to.items.length < FLAG_CAP || d.flag === to.id);
  });
}

// A road carrier takes one good at a time from one end of their road to the other.
export function carry(g: Game, s: Settler) {
  const r = g.roads.get(s.home);
  if (!r || !s.atWork) return;
  const last = r.path.length - 1;
  for (const end of [0, 1] as const) {
    const item = cargo(g, r, end);
    if (!item) continue;
    const from = g.flags.get(end ? r.b : r.a)!, to = g.flags.get(end ? r.a : r.b)!;
    const i = end ? last : 0, j = end ? 0 : last;
    s.tasks = [
      { k: 'walk', ...r.path[i], via: along(r, s.ri, i) },
      { k: 'do', f: () => {
        s.ri = i;
        const k = from.items.indexOf(item);
        if (k < 0 || !item.dest) return false;
        from.items.splice(k, 1);
        s.item = item;
        s.carrying = item.g;
      } },
      { k: 'walk', ...r.path[j], via: along(r, i, j) },
      { k: 'do', f: () => {
        s.ri = j;
        s.since = g.time;
        to.items.push(item);
        s.item = null;
        s.carrying = null;
      } },
    ];
    return;
  }
  // Nothing to carry for a while: free the road and go home, so the settler can take other work.
  if (g.time - s.since >= CARRIER_REST) {
    r.carrier = 0;
    s.home = 0;
    s.atWork = false;
    s.onAbort = () => despawn(g, s);
    s.tasks = [{ k: 'walk', x: g.hq.x, y: g.hq.y }, { k: 'do', f: () => despawn(g, s) }];
    return;
  }
  const mid = r.path.length >> 1;
  s.tasks = s.ri === mid
    ? [{ k: 'work', t: 0.3 }]
    : [{ k: 'walk', ...r.path[mid], via: along(r, s.ri, mid) }, { k: 'do', f: () => { s.ri = mid; } }];
}

function along(r: Road, i: number, j: number) {
  return i <= j ? r.path.slice(i + 1, j + 1) : r.path.slice(j, i).reverse();
}
