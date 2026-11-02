// Woodcutters and foresters: the warning before a woodcutter runs out of trees, and which new
// buildings take planting ground from a forester.
import { hypot } from '../math/exact';
import type { P } from '../path';
import { BDEFS, BType } from './defs';
import { pickFields } from './fields';
import type { Game } from './game';
import { plantable } from './land';
import type { Building } from './types';

// A woodcutter with this many grown trees or fewer in reach, and no forester, gets a warning.
export const TREES_LOW = 3;
export const TREES_LOW_NOTE = `🌲 A Woodcutter's Hut has ${TREES_LOW} or fewer trees left. Build a Forester's Hut near it`;

const within = (a: P, b: P, r: number) => hypot(a.x - b.x, a.y - b.y) <= r;
const foresters = (g: Game) => [...g.buildings.values()].filter((b) => b.type === 'forester');

// Grown trees the woodcutter `b` can fell.
export function grownTrees(g: Game, b: Building) {
  const r = BDEFS.woodcutter.radius;
  let n = 0;
  for (let y = b.y - r; y <= b.y + r; y++)
    for (let x = b.x - r; x <= b.x + r; x++)
      if (g.world.inside(x, y) && within({ x, y }, b, r) && g.world.at(x, y).tree >= 1) n++;
  return n;
}

// Does a forester, finished or still a site, plant anywhere in the woodcutter's reach?
const replanted = (g: Game, b: Building) =>
  foresters(g).some((f) => within(f, b, BDEFS.woodcutter.radius + BDEFS.forester.radius));

// Called often. Warns once when a finished woodcutter with no forester in reach runs low on trees,
// and again only after its trees grew back or a forester came and went.
export function watchTrees(g: Game) {
  let fresh = false;
  for (const b of g.buildings.values()) {
    if (b.type !== 'woodcutter' || !b.built) continue;
    const low = !replanted(g, b) && grownTrees(g, b) <= TREES_LOW;
    if (low && !g.treesLow.has(b.id)) fresh = true;
    if (low) g.treesLow.add(b.id);
    else g.treesLow.delete(b.id);
  }
  if (fresh) g.toasts.push(TREES_LOW_NOTE);
}

// Would a building of `type` at (x, y) take ground a forester could plant on now? A building
// blocks its own tile and the tiles beside it, and a farm also blocks its fields.
export function takesForesterRoom(g: Game, type: BType, x: number, y: number) {
  const near = foresters(g);
  if (!near.length) return false;
  const tiles: P[] = type === 'farm' ? pickFields(g, x, y) : [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) tiles.push({ x: x + dx, y: y + dy });
  return tiles.some((p) =>
    g.world.inside(p.x, p.y) && plantable(g, g.world.at(p.x, p.y), p.x, p.y)
    && near.some((f) => within(p, f, BDEFS.forester.radius)));
}
