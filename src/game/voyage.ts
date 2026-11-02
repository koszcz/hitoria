// Sailing to settle: a ship takes settlers and goods from a harbour to the other island, and later
// to the far island. There they build a harbour of their own, which becomes their home and claims
// the land around it.
import { findPath, type P, type Size } from '../path';
import { BDEFS, GOODS, Good, bag, type Bag } from './defs';
import { note } from './chronicle';
import { addBuilding } from './construction';
import type { Game } from './game';
import { dockAt } from './harbour';
import { addPool, homeOf, LANDING_LAND, poolOf } from './homes';
import { landable, landings, onFar, voyages } from './isles';
import { computeTerritory } from './land';
import { isStore } from './stores';
import type { Building, Ship } from './types';
import { walkDist } from './walking';

// Who and what the ship takes. The settlers build their harbour from part of the goods.
export const SAIL_CREW = 5;
export const SAIL_CARGO: Partial<Bag> = { plank: 12, stone: 8, tool: 6 }; // tools for the first workers there
export const SHIP_SPEED = 1.2; // tiles per second
const ROOM = 24; // open tiles the settlers need to reach from their harbour's doorstep
const CLEAR = 2.5; // how far around their harbour the settlers fell trees and break boulders when they land

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Every tile reached from `from` by stepping over tiles that pass `ok`, with the number of steps.
// Steps may go diagonally, but not past a corner that fails `ok`.
// -1 where it can't be reached.
export function flood(size: Size, from: P, ok: (x: number, y: number) => boolean) {
  const { w: W, h: H } = size;
  const d = new Int32Array(W * H).fill(-1);
  const queue = [from.y * W + from.x];
  d[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i], cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[n] >= 0 || !ok(nx, ny)) continue;
      if (dx && dy && (!ok(nx, cy) || !ok(cx, ny))) continue; // no cutting corners, as walkers can't
      d[n] = d[cur] + 1;
      queue.push(n);
    }
  }
  return d;
}

export const water = (g: Game) => (x: number, y: number) => g.world.at(x, y).t === 'water';

// Open ground: grass or sand with nothing on it. With `clear`, trees and boulders don't count,
// because the settlers clear them away when they land.
function free(g: Game, x: number, y: number, clear = false) {
  if (!g.world.inside(x, y)) return false;
  const t = g.world.at(x, y);
  return (t.t === 'grass' || t.t === 'sand') && (clear || (!t.tree && !t.rock)) && !t.b && !t.field;
}

// Free grass where the settlers can build their harbour, with room for its doorstep in front.
function freeShore(g: Game, x: number, y: number) {
  return g.world.at(x, y).t === 'grass' && free(g, x, y, true) && free(g, x, y + 1, true);
}

// The tiles around a harbour at (x, y) that its settlers clear when they land.
const cleared = (x: number, y: number, nx: number, ny: number) => Math.hypot(nx - x, ny - y) <= CLEAR;

// How much open ground the settlers can walk to from the doorstep of a harbour at (x, y), in its land.
function room(g: Game, x: number, y: number) {
  const near = (nx: number, ny: number) =>
    Math.hypot(nx - x, ny - y) <= LANDING_LAND && (nx !== x || ny !== y) && free(g, nx, ny, cleared(x, y, nx, ny));
  let n = 0;
  for (const d of flood(g.world, { x, y: y + 1 }, near)) if (d >= 0) n++;
  return n;
}

// Where a ship from harbour `h` lands: the free shore on other land that is the shortest sail away,
// with room around it to build. On maps with a far island, it lands only on an island nobody has settled.
export function landingSpot(g: Game, h: Building): { land: P; dock: P } | null {
  const from = g.dock(h);
  if (!from) return null;
  const home = flood(g.world, h, (x, y) => g.world.at(x, y).t !== 'water');
  const sea = flood(g.world, from, water(g)), { w: W, h: H } = g.world;
  let best: { land: P; dock: P } | null = null, bd = Infinity;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (home[y * W + x] >= 0 || !freeShore(g, x, y) || !landable(g, x, y)) continue;
      const dock = dockAt(g, x, y);
      const d = dock ? sea[dock.y * W + dock.x] : -1;
      if (d < 0 || d >= bd || room(g, x, y) < ROOM) continue;
      best = { land: { x, y }, dock: dock! };
      bd = d;
    }
  return best;
}

// The stores on the harbour's island that the ship loads from, the harbour itself first.
export function sources(g: Game, h: Building) {
  const home = homeOf(g, h);
  return [...g.buildings.values()]
    .filter((b) => isStore(b) && homeOf(g, b) === home)
    .sort((a, b) => walkDist(g, h, a) - walkDist(g, h, b));
}

// The goods the ship still lacks, and how many of each.
export function lacking(g: Game, h: Building): Partial<Bag> {
  const have = bag();
  for (const s of sources(g, h)) for (const k of GOODS) have[k] += s.stock[k] - s.sending[k];
  const short: Partial<Bag> = {};
  for (const k of Object.keys(SAIL_CARGO) as Good[]) if (have[k] < SAIL_CARGO[k]!) short[k] = SAIL_CARGO[k]! - have[k];
  return short;
}

// Settlers sail once to each island, one ship at a time. If they could not land, they may try again.
export const sailed = (g: Game) => g.ships.some((s) => s.leg !== 'moored') || landings(g).length >= voyages(g);

// Why the ship can't sail from harbour `h` now, or null if it can.
export function canSail(g: Game, h: Building): string | null {
  if (h.type !== 'harbour' || !h.built) return 'Build the harbour first';
  if (h.landed || sailed(g)) return 'Your settlers have already sailed';
  if (poolOf(g, homeOf(g, h) ?? g.hq) < SAIL_CREW) return 'Needs more idle settlers';
  if (Object.keys(lacking(g, h)).length) return 'Needs more goods in your stores';
  if (!landingSpot(g, h)) return 'No free shore on the other island';
  return null;
}

// The water tiles from `a` to `b`, keeping off the coast where it can.
export function seaPath(g: Game, a: P, b: P) {
  const open = (x: number, y: number) => {
    for (const [dx, dy] of DIRS) if (!g.world.inside(x + dx, y + dy) || g.world.at(x + dx, y + dy).t !== 'water') return false;
    return true;
  };
  return findPath(g.world, a.x, a.y, b.x, b.y, water(g), g.world.w * g.world.h, (x, y) => (open(x, y) ? 0.7 : 1), 0.7) ?? [];
}

// Load the ship at harbour `h` and send it off. Returns why it can't sail, or null once it has.
export function sail(g: Game, h: Building): string | null {
  const why = canSail(g, h);
  if (why) return why;
  const to = landingSpot(g, h)!, from = g.dock(h)!;
  const cargo = bag(SAIL_CARGO);
  for (const k of GOODS) {
    let left = cargo[k];
    for (const s of sources(g, h)) {
      const take = Math.min(left, s.stock[k] - s.sending[k]);
      s.stock[k] -= take;
      left -= take;
    }
  }
  addPool(g, homeOf(g, h) ?? g.hq, -SAIL_CREW);
  g.ships = g.ships.filter((s) => s.harbour !== h.id); // the ship tied up here sets off again
  g.ships.push({ id: g.nextId++, harbour: h.id, ...from, path: seaPath(g, from, to.dock), leg: 'out', crew: SAIL_CREW, cargo, land: to.land });
  if (onFar(g, to.land.x, to.land.y)) g.toasts.push('⛵ A ship sets sail for the far island');
  else g.toasts.push('⛵ A ship sets sail for the other island');
  return null;
}

// The settlers step ashore and build their harbour, which keeps the goods they brought.
function land(g: Game, ship: Ship) {
  const { x, y } = ship.land;
  if (!freeShore(g, x, y)) return false;
  // Each tree around the landing spot becomes a log, and each boulder a stone.
  const found = bag();
  for (let ny = y - 3; ny <= y + 3; ny++)
    for (let nx = x - 3; nx <= x + 3; nx++) {
      const t = g.world.inside(nx, ny) && g.world.at(nx, ny);
      if (!t || !cleared(x, y, nx, ny)) continue;
      if (t.tree >= 1) found.log++;
      if (t.rock) found.stone++;
      Object.assign(t, { tree: 0, rock: 0 });
    }
  const b = addBuilding(g, 'harbour', x, y);
  Object.assign(b, { built: true, progress: 1, landed: true, crew: ship.crew, status: 'Storing goods' });
  for (const k of GOODS) b.stock[k] = ship.cargo[k] + found[k] - (BDEFS.harbour.cost[k] ?? 0);
  ship.crew = 0;
  ship.cargo = bag();
  computeTerritory(g);
  note(g, { what: 'landed', isle: onFar(g, x, y) ? 'far' : 'other' });
  if (onFar(g, x, y)) g.toasts.push('⚓ Your settlers have landed on the far island');
  else g.toasts.push('⚓ Your settlers have landed on the other island');
  return true;
}

// Settlers who could not land go back into their harbour, with their goods.
function unload(g: Game, ship: Ship) {
  const h = g.buildings.get(ship.harbour) ?? g.hq;
  for (const k of GOODS) h.stock[k] += ship.cargo[k];
  addPool(g, homeOf(g, h) ?? g.hq, ship.crew);
  ship.crew = 0;
  ship.cargo = bag();
}

// Move a ship along its path for `dt` seconds. True once it has reached the end.
export function sailOn(ship: { x: number; y: number; path: P[] }, dt: number) {
  let left = SHIP_SPEED * dt;
  while (left > 0 && ship.path.length) {
    const n = ship.path[0], d = Math.hypot(n.x - ship.x, n.y - ship.y);
    if (d <= left) {
      Object.assign(ship, n);
      ship.path.shift();
      left -= d;
    } else {
      ship.x += ((n.x - ship.x) / d) * left;
      ship.y += ((n.y - ship.y) / d) * left;
      left = 0;
    }
  }
  return !ship.path.length;
}

export function stepShips(g: Game, dt: number) {
  for (const ship of g.ships) {
    if (ship.leg === 'moored') continue;
    if (!sailOn(ship, dt)) continue;
    const h = g.buildings.get(ship.harbour), dock = h && g.dock(h);
    if (ship.leg === 'back') {
      if (ship.crew) unload(g, ship);
      ship.leg = 'moored';
      continue;
    }
    if (!land(g, ship) && !dock) unload(g, ship);
    ship.leg = 'back';
    ship.path = dock ? seaPath(g, { x: Math.round(ship.x), y: Math.round(ship.y) }, dock) : [];
  }
  // A ship whose harbour is gone has nowhere to tie up.
  g.ships = g.ships.filter((s) => s.leg !== 'moored' || g.buildings.has(s.harbour));
}
