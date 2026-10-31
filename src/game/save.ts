// Saving a game to plain data and restoring it. The map is rebuilt from the seed; only what changes during play is stored.
import { GOODS, Bag, Good, RECIPES, bag } from './defs';
import { builtStatus } from './construction';
import type { Game } from './game';
import { claimFields } from './fields';
import { computeTerritory } from './land';
import { isStore } from './stores';
import type { Building, Flag, Road } from './types';
import { MAP_VERSION } from '../world';

export const SAVE_VERSION = 4;

// A saved game. Settlers are not stored: on load everyone is back in the HQ and the dispatcher sends them out again.
export interface SaveData {
  v: number;
  seed: number;
  map?: number; // the map generator version; saves before version 4 have none
  time: number;
  pool: number;
  nextId: number;
  hq: number;
  tiles: [tree: number, conifer: number, rock: number, b: number, flag: number, road: number, crop?: number, field?: number, wear?: number][];
  buildings: Building[];
  flags: Flag[];
  roads: Road[];
  made?: Bag; // goods made since the game began; saves from before goals have none
  goal?: number; // index of the goal the player is on
}

export function save(g: Game): SaveData {
  const buildings = structuredClone([...g.buildings.values()]);
  const flags = structuredClone([...g.flags.values()]);
  const roads = structuredClone([...g.roads.values()]);
  const bs = new Map(buildings.map((b) => [b.id, b]));
  // Put back whatever settlers are holding, so no goods are lost when they all go home.
  for (const s of g.settlers.values()) {
    if (s.role === 'carrier') {
      // A carrier's good goes back to the building it came from.
      const from = s.job && s.carrying ? bs.get(s.job.from) : undefined;
      if (from) (isStore(from) ? from.stock : from.out)[s.job!.g]++;
      continue;
    }
    const home = bs.get(s.home);
    if (!home) continue;
    if (s.carrying) home.out[s.carrying]++;
    if (home.busy && home.using) {
      home.stock[home.using]++;
      const also = RECIPES[home.type]?.with;
      if (also) home.stock[also]++;
    }
  }
  for (const b of buildings) {
    b.worker = b.builder = 0;
    b.incoming = bag(); // no carrier is on the way after a load
    b.sending = bag();
    if (b.type === 'house') continue; // a house eats without a worker, so its meal is kept
    b.busy = false;
    b.using = null;
    if (b.type !== 'hq') b.status = b.built ? builtStatus(b) : 'Waiting for a builder';
  }
  return {
    v: SAVE_VERSION, seed: g.seed, map: g.world.map, time: g.time, pool: g.population, nextId: g.nextId, hq: g.hq.id,
    tiles: g.world.tiles.map((t, i) => [t.tree, t.conifer ? 1 : 0, t.rock, t.b, t.flag, t.road, t.crop, t.field, Math.round(g.wear[i] * 100) / 100]),
    buildings, flags, roads, made: { ...g.made }, goal: g.goal,
  };
}

// What older saves stored on flags and roads.
type OldFlag = Flag & { items?: { g: Good }[] };
type OldRoad = Road & { carrier?: number };

export function checkVersion(d: SaveData) {
  if (![1, 2, 3, SAVE_VERSION].includes(d.v)) throw new Error('This save is from a different version of Hitoria');
}

// The map generator version to rebuild a save's land with. Version 3 saves all came after map 2.
export const mapVersion = (d: SaveData) => d.map ?? (d.v >= 3 ? 2 : 1);

// Put the saved state into `g`, a new game made from the same seed.
export function restore(g: Game, d: SaveData) {
  d.tiles.forEach(([tree, conifer, rock, b, flag, road, crop = 0, field = 0, wear = 0], i) => {
    Object.assign(g.world.tiles[i], { tree, conifer: !!conifer, rock, b, flag, road, crop, field });
    g.wear[i] = wear; // saves from before worn paths have no wear
  });
  // Saves from version 1 have no food goods yet.
  for (const b of d.buildings) {
    b.stock = bag(b.stock);
    b.out = bag(b.out);
    b.incoming = bag();
    b.sending = bag();
    b.using ??= null;
    b.born ??= 0; // saves from before houses
    b.grow ??= 0;
  }
  g.buildings = new Map(d.buildings.map((b) => [b.id, b]));
  // Saves before version 3 kept goods lying on flags. They go into the HQ.
  const hq = g.buildings.get(d.hq)!;
  for (const f of d.flags as OldFlag[]) {
    for (const it of f.items ?? []) if (GOODS.includes(it.g)) hq.stock[it.g]++;
    delete f.items;
  }
  for (const r of d.roads as OldRoad[]) delete r.carrier;
  g.flags = new Map(d.flags.map((f) => [f.id, f]));
  g.roads = new Map(d.roads.map((r) => [r.id, r]));
  g.hq = hq;
  g.pool = d.pool;
  g.time = d.time;
  g.trod.fill(d.time); // paths wait the full delay before they fade, as if just walked
  g.worn++;
  g.nextId = d.nextId;
  g.made = bag(d.made);
  g.goal = d.goal ?? 0;
  g.net++;
  computeTerritory(g);
  // Farms from saves made before fields take theirs now, keeping the grain already growing.
  const owned = new Set(g.world.tiles.map((t) => t.field));
  for (const b of g.buildings.values()) if (b.type === 'farm' && !owned.has(b.id)) claimFields(g, b, true);
}
