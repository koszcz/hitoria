// Ground the mountains hide from the camera, from map version 14. The camera looks down at 30
// degrees, from the bottom of the screen, so a tall peak hides the ground just behind it. That
// ground turns into bare rocky slope, so no grass to build on ever hides behind a peak.
import { Relief, FINE, cornerHeights } from '../render/relief';
import type { World } from '../world';
import type { IsleName } from './themes';

export const HIDE_FROM = 14;

// How much lower the camera's line of sight runs for each fine step towards the top of the
// screen. One fine step runs 1/FINE of a tile along both x and y, so it runs sqrt(2)/FINE tiles
// across the ground. The camera looks down at 30 degrees, so the line drops by tan(30°) of that.
const DROP = Math.sqrt(2 / 3) / FINE;

// For each tile of `world`, 1 if the ground in front of it hides the middle of the tile from the
// camera, else 0. It measures the ground the way the terrain mesh draws it, crags and all.
export function hiddenTiles(world: World) {
  const { w: W, h: H } = world;
  const relief = new Relief(cornerHeights(W, H, (x, y) => world.at(x, y).h), W, H, { home: { x: world.start.x + 0.5, y: world.start.y + 0.5 } });
  const n = relief.n, m = H * FINE + 1, g = relief.heights;
  const hidden = new Uint8Array(n * m);
  // The camera looks along the diagonals of the fine grid, from bottom right to top left. Walk each
  // diagonal from the camera's end. `top` is how high the highest ground so far would stand if it
  // slid back along the line of sight to the point at hand.
  for (let start = -(m - 1); start <= n - 1; start++) {
    let top = -Infinity;
    for (let j = m - 1; j >= 0; j--) {
      const i = start + j;
      if (i < 0 || i >= n) continue;
      const k = j * n + i;
      if (g[k] < top) hidden[k] = 1;
      top = Math.max(top, g[k]) - DROP / 2;
      // Halfway to the next point, the line of sight crosses the edge where two of the mesh's
      // triangles meet. That edge runs across the diagonal, so its middle stands at the average
      // of its two ends.
      if (i > 0 && j > 0) top = Math.max(top, (g[k - 1] + g[k - n]) / 2);
      top -= DROP / 2;
    }
  }
  const out = new Uint8Array(W * H), mid = FINE / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = hidden[(y * FINE + mid) * n + x * FINE + mid];
  return out;
}

// Turns every grass or sand tile of `world` that a peak hides into bare mountain slope. Ore lies
// in it where `rich` says ore lies in a mountain. On the second and far island, ground the hidden
// rock cuts off from the rest of the island turns to bare rock too, so settlers can walk to every
// part of the island that is not mountain.
export function bareHidden(world: World, rich: (x: number, y: number) => boolean) {
  const hidden = hiddenTiles(world), W = world.w;
  const bare = (i: number) => {
    Object.assign(world.tiles[i], { t: 'mountain', tree: 0, rock: 0 });
    world.bare[i] = 1;
    world.ore[i] = rich(i % W, Math.floor(i / W)) ? 1 : 0;
  };
  for (let i = 0; i < hidden.length; i++) if (hidden[i] && walkable(world, i)) bare(i);
  for (const isle of ['other', 'far'] as const) for (const i of cutOff(world, isle)) bare(i);
}

const walkable = (world: World, i: number) => world.tiles[i].t === 'grass' || world.tiles[i].t === 'sand';

// The grass and sand tiles of island `isle` that no grass or sand joins to the biggest piece of it.
function cutOff(world: World, isle: IsleName) {
  const { w: W, h: H } = world;
  const mine: number[] = [];
  for (let i = 0; i < W * H; i++) if (walkable(world, i) && world.isleAt(i % W, Math.floor(i / W)) === isle) mine.push(i);
  const piece = new Int32Array(W * H).fill(-1), sizes: number[] = [];
  for (const start of mine) {
    if (piece[start] >= 0) continue;
    const k = sizes.length, todo = [start];
    piece[start] = k;
    sizes.push(0);
    while (todo.length) {
      const i = todo.pop()!;
      sizes[k]++;
      for (const j of [i - 1, i + 1, i - W, i + W])
        if (j >= 0 && j < W * H && Math.abs((j % W) - (i % W)) <= 1 && piece[j] < 0 && walkable(world, j) && world.isleAt(j % W, Math.floor(j / W)) === isle) {
          piece[j] = k;
          todo.push(j);
        }
    }
  }
  const main = sizes.indexOf(Math.max(...sizes));
  return mine.filter((i) => piece[i] !== main);
}
