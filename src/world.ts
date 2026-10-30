export type Terrain = 'water' | 'sand' | 'grass' | 'mountain';

export interface Tile {
  t: Terrain;
  h: number; // elevation 0..1, drives shading and mountain height
  tree: number; // 0 = none, (0, 1) = growing sapling, 1 = grown
  conifer: boolean;
  rock: number; // stone left in the boulder, 0 = none
  b: number; // id of the building on this tile, 0 = none
  flag: number; // id of the flag on this tile, 0 = none
  road: number; // id of the road crossing this tile (between its flags), 0 = none
  col: string; // precomputed ground colour
}

export const W = 64;
export const H = 64;

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise over a lattice of `cell`-sized squares.
function noise(rand: () => number, cell: number) {
  const gw = Math.ceil(W / cell) + 2;
  const gh = Math.ceil(H / cell) + 2;
  const g = Array.from({ length: gw * gh }, rand);
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / cell, fy = y / cell;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = s(fx - ix), ty = s(fy - iy);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1];
    const c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

export class World {
  tiles: Tile[] = [];
  territory = new Uint8Array(W * H);
  start = { x: W / 2, y: H / 2 };

  constructor(seed: number) {
    const rand = rng(seed);
    const n1 = noise(rand, 16), n2 = noise(rand, 8), n3 = noise(rand, 4);
    const forest = noise(rand, 7), rocks = noise(rand, 5), tint = noise(rand, 3);
    const { x: sx, y: sy } = this.start;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - sx, y - sy) / (W / 2);
        let h = n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;
        h = h + 0.2 - d * d * 0.55;
        const near = Math.hypot(x - sx, y - sy);
        if (near < 8) h = h * (near / 8) + 0.5 * (1 - near / 8);
        const t: Terrain = h < 0.3 ? 'water' : h < 0.34 ? 'sand' : h > 0.7 ? 'mountain' : 'grass';
        this.tiles.push({ t, h, tree: 0, conifer: false, rock: 0, b: 0, flag: 0, road: 0, col: '' });
      }
    }

    // Guaranteed starting resources so every seed is playable.
    const grove = { x: sx + 6, y: sy - 4 }, quarry = { x: sx - 5, y: sy + 5 };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = this.at(x, y);
        const near = Math.hypot(x - sx, y - sy);
        if (Math.hypot(x - grove.x, y - grove.y) < 2.8 || Math.hypot(x - quarry.x, y - quarry.y) < 1.9) {
          tile.t = 'grass';
          tile.h = Math.min(0.6, Math.max(0.42, tile.h));
        }
        if (tile.t !== 'grass' || near < 3.5) continue;
        if (Math.hypot(x - grove.x, y - grove.y) < 2.8 && rand() < 0.8) tile.tree = 1;
        else if (Math.hypot(x - quarry.x, y - quarry.y) < 1.9) tile.rock = 4 + Math.floor(rand() * 3);
        else if ((forest(x, y) > 0.56 && rand() < 0.75) || rand() < 0.025) tile.tree = 1;
        else if ((rocks(x, y) > 0.74 && rand() < 0.5) || (this.nearMountain(x, y) && rand() < 0.3))
          tile.rock = 3 + Math.floor(rand() * 4);
        tile.conifer = tile.tree > 0 && (tile.h > 0.52 ? rand() < 0.8 : rand() < 0.25);
      }
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = this.at(x, y);
        const slope = (tile.h - this.hAt(x - 1, y)) * 1.0 + (tile.h - this.hAt(x, y - 1)) * 0.4;
        const light = Math.max(-9, Math.min(9, slope * 110));
        const k = tint(x, y);
        tile.col =
          tile.t === 'grass' ? `hsl(${86 + k * 26}, ${40 + k * 12}%, ${35 + k * 8 + light}%)`
          : tile.t === 'sand' ? `hsl(44, 50%, ${67 + light}%)`
          : tile.t === 'mountain' ? `hsl(28, 13%, ${42 + light}%)`
          : '';
      }
    }
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < W && y < H;
  }

  at(x: number, y: number) {
    return this.tiles[y * W + x];
  }

  private hAt(x: number, y: number) {
    return this.at(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))).h;
  }

  private nearMountain(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.inside(x + dx, y + dy) && this.at(x + dx, y + dy).t === 'mountain') return true;
    return false;
  }
}
