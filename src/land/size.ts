// How big the map is. From map version 9, new maps are 96 by 96 tiles, with open sea around the
// home island. Older maps stay 64 by 64, so their saves load the same land.
import type { World } from '../world';
import { hypot } from '../math/exact';

export const OLD_SIZE = 64;
export const BIG_SIZE = 96;
export const BIG_FROM = 9;

// The sea floor of the open sea around the land slopes down from the land's edge by SEA_FALL each
// tile, from no higher than EDGE_SEA, to OPEN_SEA at the deepest.
const SEA_FALL = 0.05;
const EDGE_SEA = 0.22;
export const OPEN_SEA = -0.35;

// How many tiles across and down a map of generator version `map` is.
export const mapSize = (map: number) => (map >= BIG_FROM ? BIG_SIZE : OLD_SIZE);

// Fills the bigger map `world` with the land of the smaller map `land`, laid in the middle, and
// open sea all around it. The islands, ore, cliffs and themes move with the land.
export function surround(world: World, land: World) {
  const rim = (world.w - land.w) / 2;
  const move = <T extends { x: number; y: number }>(p: T): T => ({ ...p, x: p.x + rim, y: p.y + rim });
  for (let y = 0; y < world.h; y++)
    for (let x = 0; x < world.w; x++) {
      const lx = x - rim, ly = y - rim;
      if (!land.inside(lx, ly)) {
        const ex = Math.max(0, Math.min(land.w - 1, lx)), ey = Math.max(0, Math.min(land.h - 1, ly));
        const h = Math.max(OPEN_SEA, Math.min(land.at(ex, ey).h, EDGE_SEA) - hypot(lx - ex, ly - ey) * SEA_FALL);
        world.tiles.push({ t: 'water', h, tree: 0, conifer: false, rock: 0, crop: 0, field: 0, plant: '', b: 0, col: '' });
        continue;
      }
      const from = ly * land.w + lx, to = y * world.w + x;
      world.tiles.push(land.tiles[from]);
      world.ore[to] = land.ore[from];
      world.cliff[to] = land.cliff[from];
    }
  world.start = move(land.start);
  world.isle = land.isle && move(land.isle);
  world.far = land.far && move(land.far);
  world.themes = land.themes;
}
