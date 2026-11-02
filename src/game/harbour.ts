// The harbour: where it may stand, and the dock spot in the water where ships tie up.
import type { P } from '../path';
import { DOCK_REACH } from './defs';
import type { Game } from './game';
import type { Building } from './types';
import { hypot } from '../math/exact';

// Open water: the tile and all eight around it are water, so a ship has room to turn.
function open(g: Game, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!g.world.inside(x + dx, y + dy) || g.world.at(x + dx, y + dy).t !== 'water') return false;
  return true;
}

// The closest open water tile within DOCK_REACH of (x, y), or null if there is none.
export function dockAt(g: Game, x: number, y: number): P | null {
  let best: P | null = null, bd = Infinity;
  for (let dy = -DOCK_REACH; dy <= DOCK_REACH; dy++)
    for (let dx = -DOCK_REACH; dx <= DOCK_REACH; dx++) {
      const d = hypot(dx, dy);
      if (d > DOCK_REACH || d >= bd || !open(g, x + dx, y + dy)) continue;
      best = { x: x + dx, y: y + dy };
      bd = d;
    }
  return best;
}

// Where ships tie up at a harbour.
export function dockOf(g: Game, b: Building) {
  return dockAt(g, b.x, b.y);
}
