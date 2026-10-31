// Walking distances on foot: how far every tile is from a building, with roads and worn paths cheaper.
// Carriers use them to pick the nearest store, and a building counts as linked when the HQ can walk to it.
import { W, H } from '../world';
import type { Game } from './game';
import { passable, walkCost } from './land';
import type { Building } from './types';

const FRESH = 2; // seconds of game time a building's distance map is kept before it is worked out again

// The 8 steps a walker can take: 4 straight, then 4 diagonal.
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

// The walking cost from building `b` to every tile. Infinity where nobody can walk.
// Other buildings' tiles get a cost too, so you can read how far it is to walk into them.
export function walkFrom(g: Game, b: Building): Float32Array {
  const kept = g.walks.get(b.id);
  if (kept && g.time - kept.t < FRESH) return kept.d;
  const d = flood(g, b.y * W + b.x);
  g.walks.set(b.id, { t: g.time, d });
  return d;
}

// The walking cost from building `a` into building `b`. Infinity when there is no way.
export function walkDist(g: Game, a: Building, b: Building) {
  return walkFrom(g, a)[b.y * W + b.x];
}

// What each tile is to a walker, worked out once for every map made in the same FRESH window.
const BLOCKED = 0, OPEN = 1, INTO = 2; // INTO: a building, which you walk into but not through
type Ground = { t: number; kind: Uint8Array; cost: Float32Array };

function ground(g: Game): Ground {
  if (g.ground && g.time - g.ground.t < FRESH) return g.ground;
  const kind = new Uint8Array(W * H), cost = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (passable(g, x, y)) {
        kind[i] = OPEN;
        cost[i] = walkCost(g, x, y);
      } else if (g.world.at(x, y).b) {
        kind[i] = INTO;
        cost[i] = 1;
      }
    }
  return (g.ground = { t: g.time, kind, cost });
}

// Dijkstra over the tiles settlers can walk on, starting at tile `start`.
// Diagonal steps may not cut blocked corners, the same as the paths settlers walk.
function flood(g: Game, start: number) {
  const { kind, cost } = ground(g);
  const d = new Float32Array(W * H).fill(Infinity);
  const heap = new Heap(d);
  d[start] = 0;
  heap.push(start);
  while (heap.size) {
    const cur = heap.pop();
    if (cur !== start && kind[cur] !== OPEN) continue;
    const cx = cur % W, cy = (cur / W) | 0;
    for (let k = 0; k < 8; k++) {
      const dx = DX[k], dy = DY[k], nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (kind[n] === BLOCKED) continue;
      const diag = k >= 4;
      if (diag && (kind[cy * W + nx] !== OPEN || kind[ny * W + cx] !== OPEN)) continue;
      const nd = d[cur] + (diag ? 1.414 : 1) * cost[n];
      if (nd < d[n]) {
        d[n] = nd;
        heap.push(n);
      }
    }
  }
  return d;
}

// A min-heap of tiles, ordered by their distance in `d`. A tile may be in it more than once.
class Heap {
  private items: number[] = [];
  private done: Uint8Array;
  constructor(private d: Float32Array) {
    this.done = new Uint8Array(d.length);
  }

  get size() {
    this.skipDone();
    return this.items.length;
  }

  push(n: number) {
    const a = this.items, d = this.d, dn = d[n];
    let i = a.length;
    a.push(n);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (d[a[p]] <= dn) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = n;
  }

  pop() {
    this.skipDone();
    const top = this.take();
    this.done[top] = 1;
    return top;
  }

  private skipDone() {
    while (this.items.length && this.done[this.items[0]]) this.take();
  }

  private take() {
    const a = this.items, d = this.d;
    const top = a[0], last = a.pop()!;
    if (!a.length) return top;
    const dl = d[last];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let m = l;
      if (l >= a.length) break;
      if (r < a.length && d[a[r]] < d[a[l]]) m = r;
      if (d[a[m]] >= dl) break;
      a[i] = a[m];
      i = m;
    }
    a[i] = last;
    return top;
  }
}
