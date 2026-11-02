// The hidden cove, from map version 12: on the island with the cove theme, a sheltered lagoon cuts
// deep into the land from the seaward shore, through a narrow mouth, ringed by a sandy shore.
import { rng } from './noise';
import type { IsleSize } from './isle';
import type { World } from '../world';
import type { IsleName } from './themes';

// From map version 12, an island can have the cove theme.
export const COVE_FROM = 12;

// The basin: how wide it is from its middle line, in tiles, and how far it runs each way along
// its middle line, as a part of the island's size.
const BASIN_WIDE = 2.3;
const BASIN_LONG = 0.2;
// The mouth that joins the basin to the open sea: how wide it is from its middle line.
const MOUTH = 0.6;
// Where the middle of the basin lies, as a part of the island's size: how far out from the
// island's centre towards the seaward shore, and how far off to one side.
const OUT = 0.5;
const SIDE = 0.2;
// The sandy shore runs this many tiles wide around the lagoon. Past it, the bank rises this much
// per tile, no steeper than the ridges, so the lagoon may push the ridge back but never leaves a cliff.
const RING = 1.2;
const BANK = 0.118;

export interface Cove {
  // How far the tile at (x, y) lies outside the lagoon's water, in tiles. Below 0 is in the water.
  past(x: number, y: number): number;
  // Lowers the land height `h` at (x, y) into the lagoon, its sandy shore and its bank.
  carve(x: number, y: number, h: number): number;
}

// The lagoon on an island with centre `c`, facing out to sea along `out`, with shape `s`. It lies
// to one side of the island's middle, drawn from the seed.
export function coveOf(seed: number, c: { x: number; y: number }, out: { x: number; y: number }, s: IsleSize): Cove {
  const side = (rng(seed ^ 0xc0fe)() < 0.5 ? 1 : -1) * s.size * SIDE;
  const mid = s.size * OUT, long = s.size * BASIN_LONG;
  const past = (x: number, y: number) => {
    const dx = x - c.x, dy = y - c.y;
    // u runs from the basin's middle out to sea, v across the lagoon.
    const u = dx * out.x + dy * out.y - mid, v = dx * -out.y + dy * out.x - side;
    const basin = Math.hypot(v, u - Math.max(-long, Math.min(long, u))) - BASIN_WIDE;
    const mouth = Math.hypot(v, Math.min(0, u)) - MOUTH;
    return Math.min(basin, mouth);
  };
  const carve = (x: number, y: number, h: number) => {
    const d = past(x, y);
    return Math.min(h, d < 0 ? 0.24 : d < RING ? 0.32 : 0.32 + (d - RING) * BANK);
  };
  return { past, carve };
}

// Where the lagoon's mouth meets the sea, it can cut off a speck of sand from the island. Every bit
// of land on island `isle` that no land joins to the rest of the island sinks into shallow water.
export function sinkSpecks(world: World, isle: IsleName) {
  const { w: W, h: H } = world, land = (i: number) => world.tiles[i].t !== 'water';
  const mine: number[] = [];
  for (let i = 0; i < W * H; i++) if (land(i) && world.isleAt(i % W, Math.floor(i / W)) === isle) mine.push(i);
  // The rest of the island is the biggest piece of joined land.
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
        if (j >= 0 && j < W * H && Math.abs((j % W) - (i % W)) <= 1 && piece[j] < 0 && land(j)) {
          piece[j] = k;
          todo.push(j);
        }
    }
  }
  const main = sizes.indexOf(Math.max(...sizes));
  for (const i of mine)
    if (piece[i] !== main) {
      Object.assign(world.tiles[i], { t: 'water', h: 0.26, tree: 0, rock: 0 });
      world.ore[i] = 0;
    }
}
