import { W, H } from './world';

export type P = { x: number; y: number };

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// 8-directional A*. The goal tile is always enterable (so settlers can walk into a building
// or up to a tree); diagonal moves may not cut blocked corners.
export function findPath(
  sx: number, sy: number, gx: number, gy: number,
  passable: (x: number, y: number) => boolean,
  maxNodes = 6000,
): P[] | null {
  if (sx === gx && sy === gy) return [];
  const N = W * H;
  const g = new Float32Array(N).fill(Infinity);
  const f = new Float32Array(N);
  const from = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap: number[] = [];
  const goal = gy * W + gx;

  const ok = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && ((x === gx && y === gy) || passable(x, y));
  const est = (x: number, y: number) => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  const push = (n: number) => {
    heap.push(n);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (f[heap[p]] <= f[heap[i]]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  const start = sy * W + sx;
  g[start] = 0;
  f[start] = est(sx, sy);
  push(start);
  let expanded = 0;

  while (heap.length) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === goal) {
      const out: P[] = [];
      for (let n = cur; n !== start; n = from[n]) out.push({ x: n % W, y: (n / W) | 0 });
      return out.reverse();
    }
    closed[cur] = 1;
    if (++expanded > maxNodes) return null;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!ok(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
      const n = ny * W + nx;
      const ng = g[cur] + (diag ? 1.414 : 1);
      if (ng < g[n]) {
        g[n] = ng;
        from[n] = cur;
        f[n] = ng + est(nx, ny);
        push(n);
      }
    }
  }
  return null;
}
