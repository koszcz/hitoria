// Saving a game to plain data and restoring it. The map is rebuilt from the seed; only what changes during play is stored.
import type { Entry } from './chronicle';
import { GOODS, Bag, BType, Good, RECIPES, bag } from './defs';
import { builtStatus } from './construction';
import type { Game } from './game';
import { claimFields } from './fields';
import { computeTerritory } from './land';
import { isStore } from './stores';
import { needsTool, START_TOOLS } from './tools';
import { SAIL_CARGO } from './voyage';
import type { Building, Ship, Trader } from './types';
import { oldWants } from './wants';
import type { WinterState } from './survive';
import type { WishState } from './wishes';
import { MAP_VERSION } from '../world';
import { earnedUnlocks } from './unlocks';

export const SAVE_VERSION = 6;

// A saved game. Settlers are not stored: on load everyone is back in their home (the HQ or a landing
// harbour) and the dispatcher sends them out again.
export interface SaveData {
  v: number;
  seed: number;
  map?: number; // the map generator version; saves before version 4 have none
  time: number;
  pool: number;
  nextId: number;
  hq: number;
  tiles: Tile[] | OldTile[];
  buildings: Building[];
  flags?: OldFlag[]; // saves before version 6 had roads and flags
  roads?: unknown[];
  made?: Bag; // goods made since the game began; saves from before goals have none
  goal?: number; // index of the goal the player is on
  winter?: WinterState; // how the survive winter goal is going; older saves wait for the next winter
  winters?: WinterState; // how this winter is going, for the chronicle; older saves wait for the next winter
  ships?: Ship[]; // ships sailing to settle, or tied up; saves from before ships have none
  trader?: Trader | null; // the trade ship, if it is visiting; older saves have none
  traderDay?: number; // the day the last trade ship set out; older saves have none
  signs?: number[]; // the tiles with a geologist's sign; older saves have none
  chronicle?: Entry[]; // the island's milestones; older saves have none
  tradeVisits?: number; // trade ships that have tied up; older saves have none
  wantedSold?: number; // wanted goods given to trade ships; older saves have none
  wish?: WishState | null; // the village wish; older saves start a new one once every goal is reached
  wishesGranted?: number; // village wishes met; older saves have none
  feastSeason?: number; // the season the last feast was ordered in; older saves have none
  blessedUntil?: number; // when a religious feast's blessing ends; older saves have none
  finished?: BType[]; // every kind of building finished, which unlocks others; older saves unlock what their buildings earned
}

export function save(g: Game): SaveData {
  const buildings = structuredClone([...g.buildings.values()]);
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
  // A donkey's goods go back to the building they came from. Donkeys are not saved.
  for (const d of g.donkeys.values()) {
    const from = d.job && d.carrying ? bs.get(d.job.from) : undefined;
    if (from) (isStore(from) ? from.stock : from.out)[d.job!.g] += d.load ?? 1;
  }
  // Everyone out working counts as back in their home.
  let pool = g.pool;
  for (const s of g.settlers.values()) {
    const base = bs.get(s.base);
    if (base?.landed) base.crew = (base.crew ?? 0) + 1;
    else pool++;
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
    v: SAVE_VERSION, seed: g.seed, map: g.world.map, time: g.time, pool, nextId: g.nextId, hq: g.hq.id,
    tiles: g.world.tiles.map((t, i): Tile => [t.tree, t.conifer ? 1 : 0, t.rock, t.b, t.crop, t.field, Math.round(g.wear[i] * 100) / 100]),
    buildings, made: { ...g.made }, goal: g.goal, winter: g.winter.state, winters: g.winters.state, ships: structuredClone(g.ships),
    trader: structuredClone(g.trader), traderDay: g.traderDay,
    signs: [...g.signs.keys()].filter((i) => g.signs[i]),
    chronicle: structuredClone(g.chronicle), tradeVisits: g.tradeVisits, wantedSold: g.wantedSold,
    wish: structuredClone(g.wish), wishesGranted: g.wishesGranted, feastSeason: g.feastSeason,
    blessedUntil: g.blessedUntil, finished: [...g.finished],
  };
}

// One tile of a saved map.
type Tile = [tree: number, conifer: number, rock: number, b: number, crop: number, field: number, wear: number];
// Saves before version 6 also stored the flag and road on each tile.
type OldTile = [tree: number, conifer: number, rock: number, b: number, flag: number, road: number, crop?: number, field?: number, wear?: number];
// Saves before version 3 kept goods lying on flags.
type OldFlag = { items?: { g: Good }[] };

export function checkVersion(d: SaveData) {
  if (![1, 2, 3, 4, 5, SAVE_VERSION].includes(d.v)) throw new Error('This save is from a different version of Hitoria');
}

// The map generator version to rebuild a save's land with. Version 3 saves all came after map 2.
export const mapVersion = (d: SaveData) => d.map ?? (d.v >= 3 ? 2 : 1);

// Put the saved state into `g`, a new game made from the same seed.
export function restore(g: Game, d: SaveData) {
  d.tiles.forEach((tile, i) => {
    const [tree, conifer, rock, b, crop, field, wear] = d.v < 6 ? fromOldTile(tile as OldTile) : (tile as Tile);
    Object.assign(g.world.tiles[i], { tree, conifer: !!conifer, rock, b, crop, field });
    g.wear[i] = wear;
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
    b.fed ??= 0; // saves from before hungry workers
    delete (b as { flag?: number }).flag; // saves before version 6 gave each building a flag
  }
  g.buildings = new Map(d.buildings.map((b) => [b.id, b]));
  // Saves before version 3 kept goods lying on flags. They go into the HQ.
  const hq = g.buildings.get(d.hq)!;
  for (const f of d.flags ?? []) for (const it of f.items ?? []) if (GOODS.includes(it.g)) hq.stock[it.g]++;
  g.hq = hq;
  g.pool = d.pool;
  g.time = d.time;
  g.trod.fill(d.time); // paths wait the full delay before they fade, as if just walked
  g.worn++;
  g.nextId = d.nextId;
  g.made = bag(d.made);
  g.goal = d.goal ?? 0;
  g.winter.state = d.winter ?? 'late';
  g.winters.state = d.winters ?? 'late';
  g.ships = d.ships ?? [];
  g.trader = d.trader ? { ...d.trader, ...oldWants(d.trader) } : null;
  g.traderDay = d.traderDay ?? 0;
  g.chronicle = d.chronicle ?? [];
  g.tradeVisits = d.tradeVisits ?? 0;
  g.wantedSold = d.wantedSold ?? 0;
  g.wish = d.wish ?? null;
  g.wishesGranted = d.wishesGranted ?? 0;
  g.feastSeason = d.feastSeason ?? -1;
  g.blessedUntil = d.blessedUntil ?? 0;
  if (d.finished) g.finished = new Set(d.finished);
  else earnedUnlocks(g);
  for (const i of d.signs ?? []) g.signs[i] = 1;
  g.signed++;
  if (d.v < 5) grantTools(g);
  computeTerritory(g);
  // Farms from saves made before fields take theirs now, keeping the grain already growing.
  const owned = new Set(g.world.tiles.map((t) => t.field));
  for (const b of g.buildings.values()) if (b.type === 'farm' && !owned.has(b.id)) claimFields(g, b, true);
}

// Saves from before tools: huts already at work keep working, and every home gets the tools a new game starts with.
function grantTools(g: Game) {
  for (const b of g.buildings.values()) {
    if (b.built && needsTool(b.type)) b.tooled = true;
    if (b === g.hq) b.stock.tool += START_TOOLS;
    else if (b.landed) b.stock.tool += SAIL_CARGO.tool!;
  }
}

// A tile from a save before version 6. Its roads and flags become fully worn paths, so the
// village keeps its tracks. Saves from before worn paths have no wear.
function fromOldTile([tree, conifer, rock, b, flag, road, crop = 0, field = 0, wear = 0]: OldTile): Tile {
  return [tree, conifer, rock, b, crop, field, flag || road ? 1 : wear];
}
