import { rng, noise } from './land/noise';
import { ranges, toRidge } from './land/ranges';

export { rng };

export type Terrain ='water' | 'sand' | 'grass' | 'mountain';
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
  field: number; // id of the farm whose field this is, 0 = none
  plant: Plant;
  b: number; // id of the building on this tile, 0 = none
  col: string; // precomputed ground colour
}

export const W = 64;
export const H = 64;

// Which version of the map generator to use. A saved game stores only what changed on the map,
// so loading it must build exactly the same land as when it was saved. Any change to the land a
// seed makes needs a new version here, and the old versions must keep building the same land.
// 1: the first maps. 2: adds a mountain and a bay near the start.
// 3: mountains rise smoothly from the land around them, with no cliff at their edge.
// 4: a second island sits off the mouth of the bay.
// 5: the second island gets a mountain, and coal and iron ore lie only there.
// 6: mountains form ranges, with ridges and valleys instead of round peaks.
// 7: a far island lies farther out, to one side of the bay, with rich coal and iron in its mountain.
export const MAP_VERSION = 7;

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
// From map version 4, the second island: how far past the head of the bay its centre sits, how
// wide it is, and how wide the strait of water around it is. The strait runs on out to the open sea.
const ISLE_AWAY = 14;
const ISLE_SIZE = 6.5;
const STRAIT = 3.5;
// From map version 5, the second island's mountain: how far past the island's centre its top sits,
// away from the home island, how high the top is, and how much lower each tile out from the top is.
// Its sides are steep, so the strait to the home island stays as wide as before.
const ISLE_PEAK_AWAY = 1.5;
const ISLE_PEAK = 0.98;
const ISLE_PEAK_SLOPE = 0.12;
// From map version 6, natural ridges are flat this close to the start, and full height
// CALM_FADE tiles further out.
const CALM = 6;
const CALM_FADE = 10;
// From map version 6, how many tiles the start mountain's ridge runs on away from the start, and
// how many tiles the second island's ridge runs each way from its top.
const PEAK_RIDGE = 4;
const ISLE_RIDGE = 1.5;
// From map version 6, no trees or boulders grow on the bay's bank this far past its water, up to
// BANK_NEAR tiles from the start.
const BANK = 2.8;
const BANK_NEAR = 11;
// No trees or boulders grow this close to the top of the second island's mountain, so mines fit at its foot.
const ISLE_FOOT = 4;
// From map version 7, the far island: how far its centre sits from the start, to one side of the
// bay. It is the same size as the second island and has a mountain like it.
const FAR_AWAY = 24;
// From map version 7, how far the far island may turn from the bay's direction, in degrees, and how
// far its centre stays from the second island's centre.
const FAR_TURN = [50, 130];
const FAR_APART = 21;
// From map version 7, a grove on the far island, so it always has trees: how far it sits towards the
// home side of the island's centre and off to one side, and how wide it is.
const FAR_GROVE_IN = 2.5;
const FAR_GROVE_SIDE = 3.5;
const FAR_GROVE = 2;
// From map version 7, open sea runs this many tiles wide around the edge of the map, so a ship can
// sail around the home island to the far island.
const EDGE_SEA = 3;
// The guaranteed grove and quarry near the start: how wide they are.
const GROVE = 2.8;
const QUARRY = 1.9;

export class World {
  tiles: Tile[] = [];
  territory = new Uint8Array(W * H);
  // 1 where coal and iron ore lie in a mountain tile. The generator lays it down, so saves don't store it.
  ore = new Uint8Array(W * H);
  start = { x: W / 2, y: H / 2 };
  // From map version 4, the centre of the second island. Null on older maps.
  isle: { x: number; y: number } | null = null;
  // From map version 7, the centre of the far island, and the way it faces out to sea. Null on older maps.
  far: { x: number; y: number; out: { x: number; y: number } } | null = null;

  constructor(seed: number, readonly map = MAP_VERSION) {
    const rand = rng(seed);
    const n1 = noise(rand, 16), n2 = noise(rand, 8), n3 = noise(rand, 4);
    const forest = noise(rand, 7), rocks = noise(rand, 5), tint = noise(rand, 3);
    const { x: sx, y: sy } = this.start;
    const landmarks = map >= 2, smooth = map >= 3;
    const grove = { x: sx + 6, y: sy - 4 }, quarry = { x: sx - 5, y: sy + 5 };
    const { peak, bay, out } = this.landmarks(seed);
    const isle = { x: bay.x + out.x * ISLE_AWAY, y: bay.y + out.y * ISLE_AWAY };
    if (map >= 4) this.isle = isle;
    const islePeak = { x: isle.x + out.x * ISLE_PEAK_AWAY, y: isle.y + out.y * ISLE_PEAK_AWAY };
    // From map version 6, natural mountains fold into ranges, and both guaranteed mountains are
    // short ridges. The start mountain's ridge runs on away from the start. The second island's
    // ridge runs across the island, along its far side.
    const lay = (x: number, y: number) => {
      const d = Math.hypot(x - sx, y - sy) / (W / 2);
      return n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15 + 0.2 - d * d * 0.55;
    };
    // Ridges fade out towards the start, so the HQ's land stays gentle.
    const calm = (x: number, y: number) => Math.min(1, Math.max(0, (Math.hypot(x - sx, y - sy) - CALM) / CALM_FADE));
    const ranged = map >= 6, shape = ranged ? ranges(seed, lay, calm) : null;
    const away = { x: (peak.x - sx) / PEAK_AWAY, y: (peak.y - sy) / PEAK_AWAY };
    const peakEnd = { x: peak.x + away.x * PEAK_RIDGE, y: peak.y + away.y * PEAK_RIDGE };
    const isleEnds = [-1, 1].map((k) => ({ x: islePeak.x - out.y * ISLE_RIDGE * k, y: islePeak.y + out.x * ISLE_RIDGE * k }));
    const far = (this.far = map >= 7 ? this.farPlace(seed, out, isle) : null);
    const farPeak = far && { x: far.x + far.out.x * ISLE_PEAK_AWAY, y: far.y + far.out.y * ISLE_PEAK_AWAY };
    const farEnds = far && [-1, 1].map((k) => ({ x: farPeak!.x - far.out.y * ISLE_RIDGE * k, y: farPeak!.y + far.out.x * ISLE_RIDGE * k }));
    const toFarPeakAt = (x: number, y: number) => (farEnds ? toRidge(x, y, farEnds[0], farEnds[1]) : Infinity);
    const farGrove = far && {
      x: far.x - far.out.x * FAR_GROVE_IN - far.out.y * FAR_GROVE_SIDE,
      y: far.y - far.out.y * FAR_GROVE_IN + far.out.x * FAR_GROVE_SIDE,
    };
    const bayEnd = { x: bay.x + out.x * W * 2, y: bay.y + out.y * W * 2 };
    const toPeakAt =(x: number, y: number) => (ranged ? toRidge(x, y, peak, peakEnd) : Math.hypot(x - peak.x, y - peak.y));
    const toIslePeakAt = (x: number, y: number) =>
      ranged ? toRidge(x, y, isleEnds[0], isleEnds[1]) : Math.hypot(x - islePeak.x, y - islePeak.y);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let h = shape ? shape(x, y) : lay(x, y);
        const near = Math.hypot(x - sx, y - sy);
        if (near < 8) h = h * (near / 8) + 0.5 * (1 - near / 8);
        const toPeak = toPeakAt(x, y);
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
        if (map >= 4) h = this.island(h, x - isle.x, y - isle.y, out, n3(x, y));
        // The second island's mountain rises past its middle, so the near shore stays free for a harbour.
        if (map >= 5) h = Math.max(h, ISLE_PEAK - toIslePeakAt(x, y) * ISLE_PEAK_SLOPE);
        if (far) {
          h = this.island(h, x - far.x, y - far.y, far.out, n2(x, y));
          h = Math.max(h, ISLE_PEAK - toFarPeakAt(x, y) * ISLE_PEAK_SLOPE);
          const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
          h = Math.min(h, 0.22 + Math.max(0, edge - EDGE_SEA + 1) * 0.08);
        }
        const t: Terrain = h < 0.3 ? 'water' : h < 0.34 ? 'sand' : h > 0.7 ? 'mountain' : 'grass';
        this.tiles.push({ t, h, tree: 0, conifer: false, rock: 0, crop: 0, field: 0, plant: '', b: 0, col: '' });
        // Older maps have ore in every mountain. From map 5, only the second island's mountain holds it.
        const rich = map < 5 || this.isleAt(x, y, ISLE_SIZE) !== null;
        if (t === 'mountain' && rich) this.ore[y * W + x] = 1;
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
        const foot = (landmarks && toPeakAt(x, y) < PEAK_SIZE + 2.5) || (map >= 5 && toIslePeakAt(x, y) < ISLE_FOOT) ||
          toFarPeakAt(x, y) < ISLE_FOOT;
        // From map version 6, the bank of the bay near the start stays clear too, so a harbour fits there.
        const bank = ranged && near < BANK_NEAR && toRidge(x, y, bay, bayEnd) < BAY_WIDTH + BANK;
        if (tile.t !== 'grass' || near < 3.5 || foot || bank) continue;
        if (farGrove && Math.hypot(x - farGrove.x, y - farGrove.y) < FAR_GROVE) tile.tree = rand() < 0.8 ? 1 : 0;
        else if (Math.hypot(x - grove.x, y - grove.y) < GROVE && rand() < 0.8) tile.tree = 1;
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

  // Where the far island sits: to the left or right of the bay, as seen from the start, facing away
  // from the start. Of the spots that fit inside the sea at the map's edge and keep clear of the
  // second island, it takes the one farthest from the start. It takes its own random numbers, so
  // the rest of the map keeps its shape.
  private farPlace(seed: number, bay: { x: number; y: number }, isle: { x: number; y: number }) {
    const k = rng(seed ^ 0xfa12)() < 0.5 ? 1 : -1;
    const room = ISLE_SIZE + EDGE_SEA + 2;
    const fit = (v: number) => Math.max(room, Math.min(W - 1 - room, v));
    const { x: sx, y: sy } = this.start;
    let best = null, bd = -1;
    for (let deg = FAR_TURN[0]; deg <= FAR_TURN[1]; deg += 5) {
      const a = Math.atan2(bay.y, bay.x) + (k * deg * Math.PI) / 180;
      const out = { x: Math.cos(a), y: Math.sin(a) };
      const x = fit(sx + out.x * FAR_AWAY), y = fit(sy + out.y * FAR_AWAY), d = Math.hypot(x - sx, y - sy);
      if (Math.hypot(x - isle.x, y - isle.y) < FAR_APART || d <= bd) continue;
      best = { x, y, out };
      bd = d;
    }
    return best!;
  }

  // Which island the tile at (x, y) is on: 'other' for the second island, 'far' for the far
  // island, or null for neither. A tile counts if it lies within `reach` of the island's centre.
  isleAt(x: number, y: number, reach = ISLE_SIZE + 2): 'other' | 'far' | null {
    if (this.isle && Math.hypot(x - this.isle.x, y - this.isle.y) < reach) return 'other';
    if (this.far && Math.hypot(x - this.far.x, y - this.far.y) < reach) return 'far';
    return null;
  }

  // The height of land near the second island, which is `dx, dy` from the island's centre. The
  // strait lowers the home island's coast into sea, with a sandy shore and a bank like the bay's.
  // The island rises from a sandy beach to a low,
  // grassy middle, with `bump` from the noise so its shore is not a perfect circle.
  private island(h: number, dx: number, dy: number, out: { x: number; y: number }, bump: number) {
    const past = Math.max(0, dx * out.x + dy * out.y);
    const side = Math.hypot(dx - out.x * past, dy - out.y * past);
    const shore = ISLE_SIZE + STRAIT + 1.2;
    h = Math.min(h, side < ISLE_SIZE + STRAIT ? 0.22 : side < shore ? 0.32 : 0.62 + (side - shore) * SLOPE);
    const r = Math.hypot(dx, dy) / ISLE_SIZE;
    return r < 1 ? Math.max(h, 0.24 + (1 - r * r) * 0.38 + (bump - 0.5) * 0.08) : h;
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

  // Do coal and iron ore lie in the tile at (x, y)?
  hasOre(x: number, y: number) {
    return this.at(x, y).t === 'mountain' && this.ore[y * W + x] === 1;
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
