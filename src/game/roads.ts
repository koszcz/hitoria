// Building and removing roads and flags, and what happens to goods and carriers caught on them.
import { findPath, P } from '../path';
import { FLAG_SPACING } from './defs';
import type { Game } from './game';
import { flaggable, roadable } from './land';
import { despawn } from './settlers';
import type { Flag, Item, Road } from './types';

export function flagAt(g: Game, t: P): Flag | null {
  if (!g.world.inside(t.x, t.y)) return null;
  const tile = g.world.at(t.x, t.y);
  if (tile.flag) return g.flags.get(tile.flag)!;
  if (tile.b) return g.flags.get(g.buildings.get(tile.b)!.flag)!;
  return null;
}

// Where a road may start: an existing flag, a building's flag, or a new flag on free ground or a road.
export function startFlag(g: Game, t: P): Flag | string {
  const f = flagAt(g, t);
  if (f) return f;
  if (flaggable(g, t.x, t.y)) return ensureFlag(g, t.x, t.y);
  return 'Roads start at a flag, a building, or free ground away from other flags';
}

// The tiles a road from `fromId` to `t` would use, both flag tiles included.
export function planRoad(g: Game, fromId: number, t: P): P[] | null {
  const from = g.flags.get(fromId);
  if (!from || !g.world.inside(t.x, t.y)) return null;
  const end = flagAt(g, t) ?? t;
  if (end.x === from.x && end.y === from.y) return null;
  if (!g.world.at(end.x, end.y).flag && !flaggable(g, end.x, end.y)) return null;
  const p = findPath(from.x, from.y, end.x, end.y, (x, y) => roadable(g, x, y), 3000);
  return p ? [{ x: from.x, y: from.y }, ...p] : null;
}

export function buildRoad(g: Game, fromId: number, t: P): Flag | string {
  const path = planRoad(g, fromId, t);
  if (!path) return 'No room for a road there';
  return layRoad(g, fromId, path);
}

// Lay a road along `path`, which starts at flag `fromId`. Its end gets a flag if it has none.
export function layRoad(g: Game, fromId: number, path: P[]): Flag {
  const last = path[path.length - 1];
  const end = ensureFlag(g, last.x, last.y);
  createRoad(g, fromId, end.id, path);
  // Flags along long roads let several carriers share the work.
  let since = 0;
  for (let i = 1; i < path.length - 2; i++) {
    if (++since < FLAG_SPACING || !flaggable(g, path[i].x, path[i].y)) continue;
    ensureFlag(g, path[i].x, path[i].y);
    since = 0;
  }
  return end;
}

export function removeAt(g: Game, t: P): string | null {
  if (!g.world.inside(t.x, t.y)) return 'Nothing to remove here';
  const tile = g.world.at(t.x, t.y);
  if (tile.flag) return removeFlag(g, tile.flag);
  if (tile.road) {
    removeRoad(g, tile.road);
    return null;
  }
  if (tile.b) return 'Demolishing buildings is not in yet';
  return 'Nothing to remove here';
}

function newFlag(g: Game, x: number, y: number) {
  const f: Flag = { id: g.nextId++, x, y, items: [], roads: [], building: 0 };
  g.flags.set(f.id, f);
  Object.assign(g.world.at(x, y), { flag: f.id, crop: 0 });
  g.net++;
  return f;
}

export function ensureFlag(g: Game, x: number, y: number): Flag {
  const tile = g.world.at(x, y);
  if (tile.flag) return g.flags.get(tile.flag)!;
  if (tile.road) return splitRoad(g, tile.road, x, y);
  return newFlag(g, x, y);
}

function createRoad(g: Game, a: number, b: number, path: P[]) {
  const r: Road = { id: g.nextId++, a, b, path, carrier: 0 };
  for (let i = 1; i < path.length - 1; i++) Object.assign(g.world.at(path[i].x, path[i].y), { road: r.id, crop: 0 });
  g.flags.get(a)!.roads.push(r.id);
  g.flags.get(b)!.roads.push(r.id);
  g.roads.set(r.id, r);
  g.net++;
  return r;
}

function splitRoad(g: Game, rid: number, x: number, y: number) {
  const r = g.roads.get(rid)!;
  const i = r.path.findIndex((p) => p.x === x && p.y === y);
  removeRoad(g, rid);
  const f = newFlag(g, x, y);
  createRoad(g, r.a, f.id, r.path.slice(0, i + 1));
  createRoad(g, f.id, r.b, r.path.slice(i));
  return f;
}

function removeRoad(g: Game, rid: number) {
  const r = g.roads.get(rid);
  if (!r) return;
  for (const p of r.path) {
    const t = g.world.at(p.x, p.y);
    if (t.road === rid) t.road = 0;
  }
  for (const fid of [r.a, r.b]) {
    const f = g.flags.get(fid);
    if (f) f.roads = f.roads.filter((id) => id !== rid);
  }
  g.roads.delete(rid);
  g.net++;
  const s = g.settlers.get(r.carrier);
  if (!s) return;
  if (s.item) {
    const f = g.flags.get(s.ri < r.path.length / 2 ? r.a : r.b);
    if (f) f.items.push(s.item);
    else dropItem(g, s.item);
  }
  s.item = null;
  s.carrying = null;
  s.onAbort = null;
  s.atWork = false;
  s.home = 0;
  s.path = null;
  s.walking = false;
  s.anim = '';
  s.tasks = [{ k: 'walk', x: g.hq.x, y: g.hq.y }, { k: 'do', f: () => despawn(g, s) }];
}

function removeFlag(g: Game, fid: number): string | null {
  const f = g.flags.get(fid)!;
  if (f.building) return "A building's own flag can't be removed";
  for (const rid of [...f.roads]) removeRoad(g, rid);
  for (const it of f.items) dropItem(g, it);
  g.world.at(f.x, f.y).flag = 0;
  g.flags.delete(fid);
  g.net++;
  return null;
}

// Goods stranded by a removed road or flag go back into the HQ's stock.
function dropItem(g: Game, it: Item) {
  const dest = g.buildings.get(it.dest);
  if (dest) dest.incoming[it.g]--;
  g.hq.stock[it.g]++;
}
