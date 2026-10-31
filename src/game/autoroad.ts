// The road a new building gets on its own: the shortest way from its flag to the HQ's road network.
import type { P } from '../path';
import { W, H } from '../world';
import type { Game } from './game';
import { flaggable, roadable } from './land';
import { layRoad } from './roads';
import { distTo } from './routes';
import type { Building } from './types';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// The tiles of the shortest road from a flag at `from` to the network joined to the HQ, both ends included.
// The road may end at a joined flag, or on a joined road, which then gets a new flag there.
// Returns [] when `from` is already on the network, and null when no road can reach it.
// `block` holds tiles the road may not use, such as the building the flag will belong to and its fields.
export function planAutoRoad(g: Game, from: P, block: P[] = []): P[] | null {
  const joined = distTo(g, g.hq.flag);
  const goal = (x: number, y: number) => {
    const t = g.world.at(x, y);
    if (t.flag) return joined.has(t.flag);
    if (!t.road || !joined.has(g.roads.get(t.road)!.a)) return false;
    // A new flag there may not sit right next to the flag the road starts from.
    return flaggable(g, x, y) && Math.max(Math.abs(x - from.x), Math.abs(y - from.y)) > 1;
  };
  if (goal(from.x, from.y)) return [];
  const free = (x: number, y: number) => !block.some((b) => b.x === x && b.y === y) && roadable(g, x, y);
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (free(x, y) || goal(x, y));

  // Dijkstra over free ground. Goal tiles may be entered but not walked through.
  const N = W * H;
  const cost = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const start = from.y * W + from.x;
  cost[start] = 0;
  const open = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    const cx = cur % W, cy = (cur / W) | 0;
    if (cur !== start && goal(cx, cy)) {
      const out: P[] = [];
      for (let n = cur; n !== -1; n = prev[n]) out.push({ x: n % W, y: (n / W) | 0 });
      return out.reverse();
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!ok(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
      const n = ny * W + nx;
      const nc = cost[cur] + (diag ? 1.414 : 1);
      if (nc < cost[n]) {
        if (cost[n] === Infinity) open.push(n);
        cost[n] = nc;
        prev[n] = cur;
      }
    }
  }
  return null;
}

// Lay the road a newly placed building needs, if it can have one.
export function autoRoad(g: Game, b: Building) {
  const f = g.flags.get(b.flag)!;
  const path = planAutoRoad(g, f);
  if (path?.length) layRoad(g, f.id, path);
}
