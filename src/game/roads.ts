// Building and removing roads and flags.
import { findPath, P } from '../path';
import { demolish } from './demolish';
import type { Game } from './game';
import { flaggable, roadable } from './land';
import type { Flag, Road } from './types';

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
  if (tile.b) return demolish(g, g.buildings.get(tile.b)!);
  return 'Nothing to remove here';
}

function newFlag(g: Game, x: number, y: number) {
  const f: Flag = { id: g.nextId++, x, y, roads: [], building: 0 };
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
  const r: Road = { id: g.nextId++, a, b, path };
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
}

function removeFlag(g: Game, fid: number): string | null {
  const f = g.flags.get(fid)!;
  if (f.building) return "A building's own flag can't be removed";
  for (const rid of [...f.roads]) removeRoad(g, rid);
  g.world.at(f.x, f.y).flag = 0;
  g.flags.delete(fid);
  g.net++;
  return null;
}
