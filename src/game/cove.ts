// Fishing in the hidden cove: fish crowd into the calm water of the cove's lagoon, so a fisher
// who fishes from its shore brings home more fish from each catch. See src/land/cove.ts for the lagoon itself.
import type { Game } from './game';

// How many fish a fisher brings home from one catch at the cove's shore.
export const COVE_CATCH = 2;

// Does the shore tile at (x, y) touch the water of the cove's lagoon?
export function byCove(g: Game, x: number, y: number) {
  const w = g.world;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (w.inside(x + dx, y + dy) && w.cove[(y + dy) * w.w + x + dx]) return true;
  return false;
}
