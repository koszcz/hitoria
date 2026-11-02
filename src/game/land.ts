// What the ground allows: where settlers walk, where buildings and plants may go, and which land is yours.
import { Tile } from '../world';
import { BDEFS, PATH_SPEED, WEAR_SHOWS } from './defs';
import type { Game } from './game';
import { isHome, LANDING_LAND } from './homes';

export function passable(g: Game, x: number, y: number) {
  const t = g.world.at(x, y);
  return t.t !== 'water' && t.t !== 'mountain' && t.tree < 0.5 && t.rock === 0 && t.b === 0;
}

// How fast settlers walk on a tile, as a multiplier. Worn grass is faster the more worn it is.
export function walkSpeed(g: Game, x: number, y: number) {
  const t = g.world.at(x, y);
  return 1 + (PATH_SPEED - 1) * g.wear[y * g.world.w + x];
}

export function walkCost(g: Game, x: number, y: number) {
  return 1 / walkSpeed(g, x, y);
}

// The tile in front of a building's door is its doorstep, at (x, y + 1). Nothing is built on it,
// so settlers can always get in.
export function isDoorstep(g: Game, x: number, y: number) {
  return g.world.inside(x, y - 1) && !!g.world.at(x, y - 1).b;
}

// Open ground a doorstep may go on: grass or sand with nothing on it.
export function openGround(g: Game, x: number, y: number) {
  if (!g.world.inside(x, y)) return false;
  const t = g.world.at(x, y);
  return (t.t === 'grass' || t.t === 'sand') && !t.tree && !t.rock && !t.b && !t.field;
}

// Is there a tile within `r` of (x, y) that passes `ok`?
export function near(g: Game, x: number, y: number, r: number, ok: (t: Tile) => boolean) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.hypot(dx, dy) <= r && g.world.inside(x + dx, y + dy) && ok(g.world.at(x + dx, y + dy))) return true;
  return false;
}

// Is there a mountain tile with coal and iron ore within `r` of (x, y)?
export function nearOre(g: Game, x: number, y: number, r: number) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.hypot(dx, dy) <= r && g.world.inside(x + dx, y + dy) && g.world.hasOre(x + dx, y + dy)) return true;
  return false;
}

// Free grass in your land where a tree can grow. Farm fields are kept for grain, and worn paths for walking.
export function plantable(g: Game, t: Tile, x: number, y: number) {
  return t.t === 'grass' && !t.tree && !t.crop && !t.field && !t.rock && !t.b
    && !!g.world.territory[y * g.world.w + x] && g.wear[y * g.world.w + x] < WEAR_SHOWS && !besideBuilding(g, x, y);
}

// Trees next to a building could wall in its door, so nothing is planted there.
function besideBuilding(g: Game, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!g.world.inside(x + dx, y + dy)) continue;
      const t = g.world.at(x + dx, y + dy);
      if (t.b) return true;
    }
  return false;
}

// Your land is everything within reach of the HQ, landing harbours and finished lookouts.
export function computeTerritory(g: Game) {
  const t = g.world.territory;
  t.fill(0);
  for (const b of g.buildings.values()) {
    if (!b.built || (b.type !== 'lookout' && !isHome(b))) continue;
    const r = b.type === 'harbour' ? LANDING_LAND : BDEFS[b.type].radius;
    for (let y = b.y - r; y <= b.y + r; y++)
      for (let x = b.x - r; x <= b.x + r; x++)
        if (g.world.inside(x, y) && Math.hypot(x - b.x, y - b.y) <= r + 0.3) t[y * g.world.w + x] = 1;
  }
}
