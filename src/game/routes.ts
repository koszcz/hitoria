// Road distances between flags. Auto-road uses them to find the flags already joined to the HQ.
import type { Game } from './game';

// Road distance from every flag to flag `to` (only flags connected to it appear).
// Results are cached until the road network changes.
export function distTo(g: Game, to: number) {
  if (g.distNet !== g.net) {
    g.dist.clear();
    g.distNet = g.net;
  }
  let d = g.dist.get(to);
  if (d) return d;
  d = new Map([[to, 0]]);
  const open = [to];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (d.get(open[i])! < d.get(open[bi])!) bi = i;
    const cur = open.splice(bi, 1)[0];
    const cd = d.get(cur)!;
    for (const rid of g.flags.get(cur)!.roads) {
      const r = g.roads.get(rid)!;
      const o = r.a === cur ? r.b : r.a;
      const nd = cd + r.path.length - 1;
      if (nd < (d.get(o) ?? Infinity)) {
        if (!d.has(o)) open.push(o);
        d.set(o, nd);
      }
    }
  }
  g.dist.set(to, d);
  return d;
}
