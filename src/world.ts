export type Terrain = 'water' | 'sand' | 'grass' | 'mountain';
// Small plants and stones that are only there to look at. They never block anything, and they
// hide while something else stands on their tile.
export type Plant = '' | 'grass' | 'flowers' | 'bush' | 'fern' | 'mushrooms' | 'log' | 'reeds' | 'pebbles';

export interface Tile {
  t: Terrain;
  h: number; // elevation 0..1, drives shading and mountain height
  tree: number; // 0 = none, (0, 1) = growing sapling, 1 = grown
  conifer: boolean;
  rock: number; // stone left in the boulder, 0 = none
  crop: number; // 0 = none, (0, 1) = growing grain, 1 = ripe
  plant: Plant;
  b: number; // id of the building on this tile, 0 = none
  flag: number; // id of the flag on this tile, 0 = none
  road: number; // id of the road crossing this tile (between its flags), 0 = none
  col: string; // precomputed ground colour
}

export const W = 64;
export const H = 64;

// Which version of the map generator to use. A saved game stores only what changed on the map,
// so loading it must build exactly the same land as when it was saved. Any change to the land a
// seed makes needs a new version here, and the old versions must keep building the same land.
// 1: the first maps. 2: adds a mountain and a bay near the start.
// 3: mountains rise smoothly from the land around them, with no cliff at their edge.
export const MAP_VERSION = 3;

// Natural mountains stay this far from the start, so the HQ always has room around it.
const OPEN = 7;
// The guaranteed mountain: how far its centre sits from the start, and how wide it is.
const PEAK_AWAY = 7.5;
const PEAK_SIZE = 2.2;
// From map version 3, how high the guaranteed mountain's top is. Its sides slope down from here.
const PEAK = 0.86;
// The guaranteed bay: how far its head sits from the start, and how wide its water is.
const BAY_AWAY = 7;
const BAY_WIDTH = 1.8;
// From map version 3, land rises at most this much per tile where the generator flattens it, so
// the flat parts slope into the mountains around them.
const SLOPE = 0.065;
// The guaranteed grove and quarry near the start: how wide they are.
const GROVE = 2.8;
const QUARRY = 1.9;

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
  private peak = this.start;

  constructor(seed: number, readonly map = MAP_VERSION) {
    const rand = rng(seed);
    const n1 = noise(rand, 16), n2 = noise(rand, 8), n3 = noise(rand, 4);
    const forest = noise(rand, 7), rocks = noise(rand, 5), tint = noise(rand, 3);
    const { x: sx, y: sy } = this.start;
    const landmarks = map >= 2, smooth = map >= 3;
    const grove = { x: sx + 6, y: sy - 4 }, quarry = { x: sx - 5, y: sy + 5 };
    const { peak, bay, out } = this.landmarks(seed);
    this.peak = peak;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - sx, y - sy) / (W / 2);
        let h = n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;
        h = h + 0.2 - d * d * 0.55;
        const near = Math.hypot(x - sx, y - sy);
        if (near < 8) h = h * (near / 8) + 0.5 * (1 - near / 8);
        const toPeak = Math.hypot(x - peak.x, y - peak.y);
        // The bay runs from its head straight out to the open sea, with a sandy shore.
        const along = Math.max(0, (x - bay.x) * out.x + (y - bay.y) * out.y);
        const toBay = Math.hypot(x - bay.x - out.x * along, y - bay.y - out.y * along);
        if (smooth) {
          h = Math.min(h, 0.62 + Math.max(0, near - OPEN + 1) * SLOPE); // room to build
          for (const [c, r] of [[grove, GROVE], [quarry, QUARRY]] as const)
            h = Math.min(h, 0.6 + Math.max(0, Math.hypot(x - c.x, y - c.y) - r) * SLOPE);
          h = Math.max(h, PEAK - toPeak * SLOPE);
          // A sandy shore, then a bank up to foothill height, so mountains can stand close to it.
          const shore = BAY_WIDTH + 1.2;
          h = Math.min(h, toBay < BAY_WIDTH ? 0.24 : toBay < shore ? 0.32 : 0.62 + (toBay - shore) * SLOPE);
        } else if (landmarks) {
          if (near < OPEN) h = Math.min(h, 0.66); // room to build, whatever the noise says
          if (toPeak < PEAK_SIZE) h = Math.max(h, 0.8 - toPeak * 0.03);
          if (toBay < BAY_WIDTH) h = Math.min(h, 0.24);
          else if (toBay < BAY_WIDTH + 1.2) h = Math.min(h, 0.32);
        }
        const t: Terrain = h < 0.3 ? 'water' : h < 0.34 ? 'sand' : h > 0.7 ? 'mountain' : 'grass';
        this.tiles.push({ t, h, tree: 0, conifer: false, rock: 0, crop: 0, plant: '', b: 0, flag: 0, road: 0, col: '' });
      }
    }

    // Guaranteed starting resources so every seed is playable.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = this.at(x, y);
        const near = Math.hypot(x - sx, y - sy);
        if (Math.hypot(x - grove.x, y - grove.y) < GROVE || Math.hypot(x - quarry.x, y - quarry.y) < QUARRY) {
          tile.t = 'grass';
          tile.h = Math.min(0.6, Math.max(0.42, tile.h));
        }
        // The foot of the guaranteed mountain stays clear, so a stone mine fits there.
        const foot = landmarks && Math.hypot(x - this.peak.x, y - this.peak.y) < PEAK_SIZE + 2.5;
        if (tile.t !== 'grass' || near < 3.5 || foot) continue;
        if (Math.hypot(x - grove.x, y - grove.y) < GROVE && rand() < 0.8) tile.tree = 1;
        else if (Math.hypot(x - quarry.x, y - quarry.y) < QUARRY) tile.rock = 4 + Math.floor(rand() * 3);
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
    this.sowPlants(seed);
  }

  // Where the guaranteed mountain and the head of the bay sit, in the HQ's land. They sit on
  // opposite sides, away from the guaranteed grove and quarry. They take their own random
  // numbers, so the rest of the map keeps its shape.
  private landmarks(seed: number) {
    const rand = rng(seed ^ 0x1a4d);
    const flip = rand() < 0.5;
    const side = (centre: number) => ((centre + (rand() - 0.5) * 60) * Math.PI) / 180;
    const peakAngle = side(flip ? 55 : 235);
    const bayAngle = side(flip ? 235 : 55);
    const { x: sx, y: sy } = this.start;
    const out = { x: Math.cos(bayAngle), y: Math.sin(bayAngle) };
    return {
      peak: { x: sx + Math.cos(peakAngle) * PEAK_AWAY, y: sy + Math.sin(peakAngle) * PEAK_AWAY },
      bay: { x: sx + out.x * BAY_AWAY, y: sy + out.y * BAY_AWAY },
      out,
    };
  }

  // Plants use their own random numbers, so adding them moves no tree or boulder on a map.
  // Forest floor gets ferns, mushrooms and fallen logs, which show once the trees are felled.
  // Forest edges get bushes. Open grass gets meadows of tall grass and patches of flowers.
  private sowPlants(seed: number) {
    const rand = rng(seed ^ 0x5eed);
    const meadow = noise(rand, 6), bloom = noise(rand, 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = this.at(x, y), r = rand();
        if (t.t === 'sand') t.plant = this.nearWater(x, y) && r < 0.5 ? 'reeds' : r > 0.92 ? 'pebbles' : '';
        else if (t.t === 'mountain') t.plant = r < 0.14 ? 'pebbles' : '';
        else if (t.t === 'grass') {
          const woods = this.treesAround(x, y);
          if (woods >= 4) t.plant = r < 0.35 ? 'fern' : r < 0.5 ? 'mushrooms' : r < 0.57 ? 'log' : r < 0.72 ? 'bush' : '';
          else if (woods >= 1) t.plant = r < 0.3 ? 'bush' : r < 0.48 ? 'fern' : r < 0.68 ? 'grass' : '';
          else if (bloom(x, y) > 0.6 && r < 0.75) t.plant = 'flowers';
          else if (meadow(x, y) > 0.45 && r < 0.65) t.plant = 'grass';
          else t.plant = r < 0.05 ? 'bush' : r < 0.12 ? 'flowers' : r < 0.2 ? 'grass' : '';
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

  // Grown trees on this tile and the eight around it.
  private treesAround(x: number, y: number) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.inside(x + dx, y + dy) && this.at(x + dx, y + dy).tree) n++;
    return n;
  }

  private nearWater(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.inside(x + dx, y + dy) && this.at(x + dx, y + dy).t === 'water') return true;
    return false;
  }

  private nearMountain(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.inside(x + dx, y + dy) && this.at(x + dx, y + dy).t === 'mountain') return true;
    return false;
  }
}
