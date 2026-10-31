// Saving a game to plain data and restoring it. The map is rebuilt from the seed; only what changes during play is stored.
import { GOODS, bag } from './defs';
import { builtStatus } from './construction';
import type { Game } from './game';
import { computeTerritory } from './land';
import type { Building, Flag, Road } from './types';

export const SAVE_VERSION = 2;

// A saved game. Settlers are not stored: on load everyone is back in the HQ and the dispatcher sends them out again.
export interface SaveData {
  v: number;
  seed: number;
  time: number;
  pool: number;
  nextId: number;
  hq: number;
  tiles: [tree: number, conifer: number, rock: number, b: number, flag: number, road: number, crop?: number][];
  buildings: Building[];
  flags: Flag[];
  roads: Road[];
}

export function save(g: Game): SaveData {
  const buildings = structuredClone([...g.buildings.values()]);
  const flags = structuredClone([...g.flags.values()]);
  const roads = structuredClone([...g.roads.values()]);
  const bs = new Map(buildings.map((b) => [b.id, b]));
  const fs = new Map(flags.map((f) => [f.id, f]));
  // Put back whatever settlers are holding, so no goods are lost when they all go home.
  for (const s of g.settlers.values()) {
    const r = g.roads.get(s.home);
    if (s.item && r) fs.get(s.ri < r.path.length / 2 ? r.a : r.b)!.items.push({ ...s.item });
    if (s.role === 'carrier') continue;
    const home = bs.get(s.home);
    if (!home) continue;
    if (s.carrying) home.out[s.carrying]++;
    if (home.busy && home.using) home.stock[home.using]++;
  }
  for (const b of buildings) {
    b.worker = b.builder = 0;
    if (b.type === 'house') continue; // a house eats without a worker, so its meal is kept
    b.busy = false;
    b.using = null;
    if (b.type !== 'hq') b.status = b.built ? builtStatus(b) : 'Waiting for a builder';
  }
  for (const r of roads) r.carrier = 0;
  return {
    v: SAVE_VERSION, seed: g.seed, time: g.time, pool: g.population, nextId: g.nextId, hq: g.hq.id,
    tiles: g.world.tiles.map((t) => [t.tree, t.conifer ? 1 : 0, t.rock, t.b, t.flag, t.road, t.crop]),
    buildings, flags, roads,
  };
}

export function checkVersion(d: SaveData) {
  if (d.v !== 1 && d.v !== SAVE_VERSION) throw new Error('This save is from a different version of Hitoria');
}

// Put the saved state into `g`, a new game made from the same seed.
export function restore(g: Game, d: SaveData) {
  d.tiles.forEach(([tree, conifer, rock, b, flag, road, crop = 0], i) =>
    Object.assign(g.world.tiles[i], { tree, conifer: !!conifer, rock, b, flag, road, crop }));
  // Saves from version 1 have no food goods yet.
  for (const b of d.buildings) {
    b.stock = bag(b.stock);
    b.out = bag(b.out);
    b.incoming = bag(b.incoming);
    b.using ??= null;
    b.born ??= 0; // saves from before houses
    b.grow ??= 0;
  }
  for (const f of d.flags) f.items = f.items.filter((it) => GOODS.includes(it.g));
  g.buildings = new Map(d.buildings.map((b) => [b.id, b]));
  g.flags = new Map(d.flags.map((f) => [f.id, f]));
  g.roads = new Map(d.roads.map((r) => [r.id, r]));
  g.hq = g.buildings.get(d.hq)!;
  g.pool = d.pool;
  g.time = d.time;
  g.nextId = d.nextId;
  g.net++;
  computeTerritory(g);
}
