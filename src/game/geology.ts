// Rich spots in the mountains, and the geologist who finds them. A mine next to a rich spot digs
// twice as fast. The geologist puts up a sign on each mountain tile they survey.
import { rng, W, H, type World } from '../world';
import { BDEFS, MINES } from './defs';
import type { Game } from './game';
import type { Building } from './types';

export const RICH_SPEED = 2; // how many times faster a mine next to a rich spot digs
const REACH = 2; // a mountain tile this close to grass can have a mine beside it
const PATCH_CHANCE = 0.06; // chance that a mountain tile by grass starts a patch of rich ground
const HOME_REACH = 12; // the mountain near the HQ always has a rich spot this close to the start

// Where the rich spots lie. They come from the seed, so saves don't store them, and they use their
// own random numbers, so the rest of the map keeps its shape. Rich ground lies in small patches on
// the mountain tiles a mine can reach. The mountain by the HQ and the ore mountain each get one.
export function richSpots(world: World, seed: number) {
  const rich = new Uint8Array(W * H);
  const rand = rng(seed ^ 0x6e01);
  const edge: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (world.at(x, y).t === 'mountain' && byGrass(world, x, y)) edge.push(y * W + x);
  const patch = (i: number) => {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (world.inside(x + dx, y + dy) && world.at(x + dx, y + dy).t === 'mountain') rich[(y + dy) * W + x + dx] = 1;
  };
  for (const i of edge) if (rand() < PATCH_CHANCE) patch(i);
  const { x: sx, y: sy } = world.start;
  const sure = (ok: (i: number) => boolean) => {
    const some = edge.filter(ok);
    if (some.length && !some.some((i) => rich[i])) patch(some[Math.floor(rand() * some.length)]);
  };
  sure((i) => Math.hypot((i % W) - sx, ((i / W) | 0) - sy) < HOME_REACH);
  sure((i) => world.ore[i] === 1);
  return rich;
}

function byGrass(world: World, x: number, y: number) {
  for (let dy = -REACH; dy <= REACH; dy++)
    for (let dx = -REACH; dx <= REACH; dx++)
      if (Math.hypot(dx, dy) <= REACH && world.inside(x + dx, y + dy) && world.at(x + dx, y + dy).t === 'grass') return true;
  return false;
}

// Is the mountain tile at (x, y) a rich spot?
export const isRich = (g: Game, x: number, y: number) => g.world.at(x, y).t === 'mountain' && g.rich[y * W + x] === 1;

// Is there a rich spot in reach of a mine of this type at (x, y)?
export function richAt(g: Game, type: Building['type'], x: number, y: number) {
  if (!MINES.includes(type)) return false;
  const r = BDEFS[type].radius;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.hypot(dx, dy) <= r && g.world.inside(x + dx, y + dy) && isRich(g, x + dx, y + dy)) return true;
  return false;
}

// How many times faster than usual building `b` digs.
export const digSpeed = (g: Game, b: Building) => (richAt(g, b.type, b.x, b.y) ? RICH_SPEED : 1);

// Can a geologist survey the tile at (x, y)? It must be a mountain tile with no sign yet,
// and a walker must be able to stand next to it.
export function surveyable(g: Game, x: number, y: number) {
  if (g.world.at(x, y).t !== 'mountain' || g.signs[y * W + x]) return false;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (g.world.inside(x + dx, y + dy) && g.passable(x + dx, y + dy)) return true;
  return false;
}

// The geologist surveys the tile at (x, y) and the mountain tiles around it, and puts up a sign on
// each one. Returns true if they found a rich spot that had no sign before.
export function survey(g: Game, x: number, y: number) {
  let found = false;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const tx = x + dx, ty = y + dy, i = ty * W + tx;
      if (!g.world.inside(tx, ty) || g.world.at(tx, ty).t !== 'mountain' || g.signs[i]) continue;
      g.signs[i] = 1;
      if (isRich(g, tx, ty)) found = true;
    }
  g.signed++;
  if (found) g.toasts.push('⭐ Your geologist found a rich spot');
  return found;
}

// Tells the player when a mine they just placed sits next to a rich spot.
export function noteRichMine(g: Game, b: Building) {
  if (richAt(g, b.type, b.x, b.y)) g.toasts.push('⭐ A rich spot! This mine digs twice as fast');
}
