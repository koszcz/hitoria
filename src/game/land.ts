// What the ground allows: where settlers walk, where roads, flags and plants may go, and which land is yours.
import { W, Tile } from '../world';
import { BDEFS, ROAD_SPEED } from './defs';
import type { Game } from './game';

export function passable(g: Game, x: number, y: number) {
  const t = g.world.at(x, y);
  return t.t !== 'water' && t.t !== 'mountain' && t.tree < 0.5 && t.rock === 0 && t.b === 0;
}

export function walkCost(g: Game, x: number, y: number) {
  const t = g.world.at(x, y);
  return t.road || t.flag ? 1 / ROAD_SPEED : 1;
}

export function roadable(g: Game, x: number, y: number) {
  if (!g.world.inside(x, y) || !g.world.territory[y * W + x]) return false;
  const t = g.world.at(x, y);
  return (t.t === 'grass' || t.t === 'sand') && !t.tree && !t.rock && !t.b && !t.road && !t.flag && !t.field;
}

// A flag may go on free ground or on a road, but never right next to another flag.
export function flaggable(g: Game, x: number, y: number) {
  if (!g.world.inside(x, y)) return false;
  if (!g.world.at(x, y).road && !roadable(g, x, y)) return false;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (g.world.inside(x + dx, y + dy) && g.world.at(x + dx, y + dy).flag) return false;
  return true;
}

// Is there a tile within `r` of (x, y) that passes `ok`?
export function near(g: Game, x: number, y: number, r: number, ok: (t: Tile) => boolean) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.hypot(dx, dy) <= r && g.world.inside(x + dx, y + dy) && ok(g.world.at(x + dx, y + dy))) return true;
  return false;
}

// Free grass in your land where a tree can grow. Farm fields are kept for grain.
export function plantable(g: Game, t: Tile, x: number, y: number) {
  return t.t === 'grass' && !t.tree && !t.crop && !t.field && !t.rock && !t.b && !t.road && !t.flag
    && !!g.world.territory[y * W + x] && !besideBuildingOrFlag(g, x, y);
}

// Trees next to a flag could wall it in, so nothing is planted there.
function besideBuildingOrFlag(g: Game, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!g.world.inside(x + dx, y + dy)) continue;
      const t = g.world.at(x + dx, y + dy);
      if (t.b || t.flag) return true;
    }
  return false;
}

// Your land is everything within reach of the HQ and finished lookouts.
export function computeTerritory(g: Game) {
  const t = g.world.territory;
  t.fill(0);
  for (const b of g.buildings.values()) {
    if (!b.built || (b.type !== 'hq' && b.type !== 'lookout')) continue;
    const r = BDEFS[b.type].radius;
    for (let y = b.y - r; y <= b.y + r; y++)
      for (let x = b.x - r; x <= b.x + r; x++)
        if (g.world.inside(x, y) && Math.hypot(x - b.x, y - b.y) <= r + 0.3) t[y * W + x] = 1;
  }
}
