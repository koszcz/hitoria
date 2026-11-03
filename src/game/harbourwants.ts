// Harbour wants: how many of each good a harbour's island should keep. Boats fetch what an island
// lacks from the other islands, and no island sends goods below what its own harbours want.
import type { Good } from './defs';
import type { Game } from './game';
import { isleOf, storedOn, type Isle } from './islandstock';
import type { Building } from './types';

export const WANT_STEP = 5; // each press of + or - in the panel changes a want by this much
export const WANT_MAX = 50; // the most of one good a harbour can want

export const COLONY_FOOD_NOTE = "🐟 Your new colony needs food. Build a Fisher's Hut there, or set its harbour to want fish and a boat brings it";

// How many of good `k` harbour `b` wants.
export const wantOf = (b: Building, k: Good) => b.wants?.[k] ?? 0;

// Set how many of good `k` harbour `b` wants, from 0 to WANT_MAX. Returns why it can't, or null.
export function setWant(b: Building, k: Good, n: number): string | null {
  if (b.type !== 'harbour' || !b.built) return 'Only a finished harbour can want goods';
  const v = Math.max(0, Math.min(WANT_MAX, Math.round(n)));
  b.wants ??= {};
  if (v) b.wants[k] = v;
  else delete b.wants[k];
  return null;
}

// The finished harbours, each with the island it stands on.
export function harbours(g: Game) {
  const out: { b: Building; isle: Isle }[] = [];
  for (const b of g.buildings.values()) if (b.type === 'harbour' && b.built) out.push({ b, isle: isleOf(g, b.x, b.y) });
  return out;
}

// How many of good `k` the harbours on island `isle` want together.
export function wantOn(g: Game, isle: Isle, k: Good) {
  let n = 0;
  for (const h of harbours(g)) if (h.isle === isle) n += wantOf(h.b, k);
  return n;
}

// The trips of every boat that is out.
const trips = (g: Game) => harbours(g).flatMap((h) => (h.b.trip ? [h.b.trip] : []));

// Is building `id` on island `isle`?
function on(g: Game, id: number, isle: Isle) {
  const b = g.buildings.get(id);
  return !!b && isleOf(g, b.x, b.y) === isle;
}

// Goods of kind `k` that boats are bringing to island `isle`: what they mean to fetch, and once
// loaded, what is on board.
export function inbound(g: Game, isle: Isle, k: Good) {
  let n = 0;
  for (const t of trips(g))
    if (t.g === k && on(g, t.to, isle)) n += t.leg === 'out' || t.leg === 'load' ? t.n : t.leg === 'carry' ? t.load : 0;
  return n;
}

// Goods of kind `k` that boats are coming to fetch from harbour `b` and have not loaded yet.
export function fetching(g: Game, b: Building, k: Good) {
  let n = 0;
  for (const t of trips(g)) if (t.g === k && t.from === b.id && (t.leg === 'out' || t.leg === 'load')) n += t.n - t.load;
  return n;
}

// How many of good `k` island `isle` still lacks, after the goods boats are bringing.
export function shortOn(g: Game, isle: Isle, k: Good) {
  return Math.max(0, wantOn(g, isle, k) - storedOn(g, isle)[k] - inbound(g, isle, k));
}

// How many of good `k` island `isle` can send: what it stores beyond its own wants, less what boats
// are already coming to fetch.
export function spareOn(g: Game, isle: Isle, k: Good) {
  let coming = 0;
  for (const h of harbours(g)) if (h.isle === isle) coming += fetching(g, h.b, k);
  return Math.max(0, storedOn(g, isle)[k] - wantOn(g, isle, k) - coming);
}
