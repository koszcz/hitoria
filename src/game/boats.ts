// Harbour boats. A harbour, at home or on a colony, can build one small boat. You order it in the
// harbour's panel, carriers bring the planks, and once they are all in, the boat ties up at the dock.
import type { Good } from './defs';
import type { Game } from './game';
import type { Building } from './types';

export const BOAT_PLANKS = 6; // the planks one boat needs

// Why harbour `b` can't build a boat now, or null if it can.
export function canBuildBoat(b: Building): string | null {
  if (b.type !== 'harbour') return 'Only a harbour can build a boat';
  if (!b.built) return 'Finish building it first';
  if (b.boat === undefined) return null;
  return b.boat >= BOAT_PLANKS ? 'This harbour already has a boat' : 'A boat is already being built';
}

// Order a boat at harbour `b`. Returns why it can't, or null.
export function orderBoat(b: Building): string | null {
  const why = canBuildBoat(b);
  if (!why) b.boat = 0;
  return why;
}

// Has harbour `b` a finished boat at its dock?
export const hasBoat = (b: Building) => (b.boat ?? 0) >= BOAT_PLANKS;

// How many of good `k` the boat at harbour `b` still wants: the planks it lacks, else none.
export function boatWant(b: Building, k: Good) {
  return k === 'plank' && b.boat !== undefined ? BOAT_PLANKS - b.boat : 0;
}

// Called often. Each harbour building a boat puts its spare planks into the boat, but not the ones
// a carrier is coming to fetch. Once the last plank is in, a message says the boat is ready.
export function stepBoats(g: Game) {
  for (const b of g.buildings.values()) {
    const need = boatWant(b, 'plank');
    if (b.type !== 'harbour' || need <= 0) continue;
    const take = Math.min(need, b.stock.plank - b.sending.plank);
    if (take <= 0) continue;
    b.stock.plank -= take;
    b.boat! += take;
    if (hasBoat(b)) g.toasts.push('⛵ A boat ties up at the harbour');
  }
}
