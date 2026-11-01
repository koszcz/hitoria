// The islands that settlers sail to: the second island, and on newer maps the far island. Each
// island gets one crew of settlers. Older maps, with no far island, get one voyage only.
import type { Game } from './game';

// How many crews of settlers can sail to settle an island on this map.
export const voyages = (g: Game) => (g.world.far ? 2 : 1);

// The harbours that settlers built where their ship landed.
export const landings = (g: Game) => [...g.buildings.values()].filter((b) => b.landed);

// Can settlers land on the tile at (x, y)? On maps with a far island, they land only on an island
// that nobody has settled yet. On older maps, they land on any land across the water.
export function landable(g: Game, x: number, y: number) {
  if (!g.world.far) return true;
  const isle = g.world.isleAt(x, y);
  return !!isle && !landings(g).some((b) => g.world.isleAt(b.x, b.y) === isle);
}

// Is the tile at (x, y) on the far island?
export const onFar = (g: Game, x: number, y: number) => g.world.isleAt(x, y) === 'far';
