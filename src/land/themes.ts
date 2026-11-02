// Island themes, from map version 8. The second island and the far island each get one of two
// themes, drawn at random, so they look and play differently. Pine highlands have dense pines,
// sea cliffs on the far shore and dark ground. Wild meadows have few trees, wide flower meadows
// and brighter ground, and more deer and hares live there.
import { W, H } from '../world';
import type { World } from '../world';
import { rng } from './noise';

export type Theme = 'pines' | 'meadow';
export type IsleName = 'other' | 'far';

// The island's centre, and the way it faces out to sea, away from the home island.
export interface IsleShape {
  x: number;
  y: number;
  out: { x: number; y: number };
}

// Which theme each island has. The two islands always get different themes.
export function drawThemes(seed: number): Record<IsleName, Theme> {
  const pinesFirst = rng(seed ^ 0x7e3e)() < 0.5;
  return { other: pinesFirst ? 'pines' : 'meadow', far: pinesFirst ? 'meadow' : 'pines' };
}

// Sea cliffs run along a pine island's shore wherever the land faces out to sea, away from the
// home island, by at least CLIFF_FACE. They reach this far in from the water, in tiles.
const CLIFF_FACE = 0.3;
const CLIFF_DEPTH = 1.5;
// How high the top of a cliff is. It is above the mountain line, so it shows as bare rock.
const CLIFF = 0.76;

// Raises sea cliffs of bare rock along the far shore of the pine island, which has centre and
// facing `isle`. Cliffs hold no ore, and `world.cliff` marks them.
export function raiseCliffs(world: World, isle: IsleShape) {
  const name = world.isleAt(isle.x, isle.y);
  const cliffs: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - isle.x, dy = y - isle.y, d = Math.hypot(dx, dy);
      if (world.at(x, y).t === 'water' || world.isleAt(x, y) !== name || d === 0) continue;
      if ((dx * isle.out.x + dy * isle.out.y) / d < CLIFF_FACE || !nearWater(world, x, y)) continue;
      cliffs.push(y * W + x);
    }
  for (const i of cliffs) {
    const t = world.tiles[i];
    Object.assign(t, { t: 'mountain', h: Math.max(t.h, CLIFF) });
    world.cliff[i] = 1;
    world.ore[i] = 0;
  }
}

function nearWater(world: World, x: number, y: number) {
  const r = Math.ceil(CLIFF_DEPTH);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.hypot(dx, dy) <= CLIFF_DEPTH && world.inside(x + dx, y + dy) && world.at(x + dx, y + dy).t === 'water') return true;
  return false;
}

// Does a tree grow on this island tile? `forest` is the forest noise at the tile, and `rand` the
// generator's random numbers. Pine islands have about twice the forest. Meadow islands have trees
// only in their grove.
export function themeTree(theme: Theme, forest: number, rand: () => number) {
  if (theme === 'pines') return rand() < (forest > 0.35 ? 0.95 : 0.55);
  return rand() < 0.01;
}

// Is a tree on this island a pine? Nearly every tree on a pine island is.
export const themeConifer = (theme: Theme, rand: () => number) => (theme === 'pines' ? rand() < 0.95 : rand() < 0.1);

// The small plant on open grass of a meadow island, from a random number `r`: mostly flowers.
export const meadowPlant = (r: number) => (r < 0.6 ? 'flowers' : r < 0.9 ? 'grass' : '') as 'flowers' | 'grass' | '';

// How much darker or lighter, in percent, the grass of each theme is than on the home island.
export const THEME_LIGHT: Record<Theme, number> = { pines: -7, meadow: 5 };
// How much the grass hue turns, in degrees: pine ground is cooler, meadow ground warmer.
export const THEME_HUE: Record<Theme, number> = { pines: 14, meadow: -8 };
