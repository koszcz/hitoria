// Homes: the HQ and every harbour your settlers built where they landed. Idle settlers wait in a
// home, go out from it to work, and come back to it. A building belongs to the home that can walk to it.
import type { Game } from './game';
import type { Building } from './types';
import { walkDist } from './walking';

// How far the land around a landing harbour reaches, in tiles.
export const LANDING_LAND = 6;

export function isHome(b: Building) {
  return b.type === 'hq' || (b.type === 'harbour' && b.built && !!b.landed);
}

export function homes(g: Game): Building[] {
  return [...g.buildings.values()].filter(isHome);
}

// The idle settlers waiting in a home.
export function poolOf(g: Game, h: Building) {
  return h === g.hq ? g.pool : h.crew ?? 0;
}

export function addPool(g: Game, h: Building, n: number) {
  if (h === g.hq) g.pool += n;
  else h.crew = (h.crew ?? 0) + n;
}

// The home whose settlers can walk to building `b`, the nearest if there are several. Null if none can.
export function homeOf(g: Game, b: Building): Building | null {
  if (isHome(b)) return b;
  let best: Building | null = null, bd = Infinity;
  for (const h of homes(g)) {
    const d = walkDist(g, h, b);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

// Idle settlers in every home.
export function idleTotal(g: Game) {
  let n = 0;
  for (const h of homes(g)) n += poolOf(g, h);
  return n;
}
