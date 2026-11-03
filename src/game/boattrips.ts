// Boat trips: a free boat sails to another island's harbour, loads goods that a harbour wants,
// brings them there, then sails home. Carriers on the far end bring the goods to their harbour.
import type { P } from '../path';
import { GOODS, type Good } from './defs';
import { boatWant, hasBoat } from './boats';
import type { Game } from './game';
import { isleOf, storedOn } from './islandstock';
import { fetching, harbours, shortOn, spareOn, wantOf, wantOn } from './harbourwants';
import { sailOn, seaPath } from './voyage';
import type { BoatTrip, Building } from './types';

export const BOAT_LOAD = 10; // the most goods a boat carries on one trip
export const LOAD_WAIT = 60; // seconds a boat waits for its load before it sails with what it has

// How many of good `k` store `b` wants from carriers: the planks for its boat, and the goods boats
// are coming to fetch from it.
export function storeWant(g: Game, b: Building, k: Good) {
  return b.type === 'harbour' ? boatWant(b, k) + fetching(g, b, k) : 0;
}

// The water route from (x, y) to the dock of harbour `b`. Null if the boat can't get there.
function route(g: Game, from: P, b: Building | undefined): P[] | null {
  const dock = b && g.dock(b);
  if (!dock) return null;
  if (dock.x === from.x && dock.y === from.y) return [];
  const path = seaPath(g, from, dock);
  return path.length ? path : null;
}

// Called often. Each free boat looks for a good some harbour wants and another island can spare,
// and sets off to fetch it.
export function planTrips(g: Game) {
  const all = harbours(g);
  for (const { b } of all) {
    if (!hasBoat(b) || b.trip) continue;
    const dock = g.dock(b);
    if (!dock) continue;
    plan: for (const want of all)
      for (const k of GOODS) {
        if (!wantOf(want.b, k)) continue;
        const short = shortOn(g, want.isle, k);
        if (!short) continue;
        let best: Building | null = null, spare = 0;
        for (const src of all) {
          if (src.isle === want.isle) continue;
          const s = spareOn(g, src.isle, k);
          if (s > spare && route(g, dock, src.b)) { best = src.b; spare = s; }
        }
        if (!best) continue;
        b.trip = { from: best.id, to: want.b.id, g: k, n: Math.min(BOAT_LOAD, short, spare), load: 0, leg: 'out', ...dock, path: route(g, dock, best)!, wait: 0 };
        break plan;
      }
  }
}

// Send the boat of harbour `b` on its next leg: to the harbour that wants its load, or home.
function nextLeg(g: Game, b: Building, t: BoatTrip) {
  const at = { x: Math.round(t.x), y: Math.round(t.y) };
  const to = t.load > 0 && t.leg !== 'carry' ? route(g, at, g.buildings.get(t.to)) : null;
  t.leg = to ? 'carry' : 'home';
  t.path = to ?? route(g, at, b) ?? [];
}

// The boat has reached the end of its leg.
function arrive(g: Game, b: Building, t: BoatTrip) {
  if (t.leg === 'out') {
    t.leg = 'load';
    t.wait = 0;
    return;
  }
  if (t.leg === 'carry') {
    const to = g.buildings.get(t.to);
    if (to) {
      to.stock[t.g] += t.load;
      t.load = 0;
    }
    nextLeg(g, b, t);
    if (t.path.length) return;
  }
  b.stock[t.g] += t.load; // goods it could not deliver go into its own harbour
  delete b.trip;
}

// Load goods at the harbour it fetches from. It never takes an island's goods below what that
// island's harbours want. It sails once full, once it has waited LOAD_WAIT, or once no more can come.
function loadUp(g: Game, b: Building, t: BoatTrip, dt: number) {
  const from = g.buildings.get(t.from);
  if (!from) return nextLeg(g, b, t);
  const isle = isleOf(g, from.x, from.y);
  const spare = () => storedOn(g, isle)[t.g] - wantOn(g, isle, t.g);
  const take = Math.max(0, Math.min(t.n - t.load, from.stock[t.g] - from.sending[t.g], spare()));
  from.stock[t.g] -= take;
  t.load += take;
  t.wait += dt;
  const dry = spare() <= 0 && !from.incoming[t.g];
  if (t.load >= t.n || t.wait >= LOAD_WAIT || dry) nextLeg(g, b, t);
}

// Move every boat that is out for `dt` seconds.
export function stepTrips(g: Game, dt: number) {
  for (const b of g.buildings.values()) {
    const t = b.trip;
    if (!t) continue;
    if (t.leg === 'load') loadUp(g, b, t, dt);
    else if (sailOn(t, dt)) arrive(g, b, t);
  }
}
