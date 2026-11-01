// The Game class: all the state of one settlement, and the actions the player and the main loop call.
// The work itself lives in the other files of this folder, as functions that take the game.
import type { P } from '../path';
import { MAP_VERSION, World, W, H } from '../world';
import { BType, CROP_GROW, Good, bag } from './defs';
import { spawnAnimals, stepAnimal } from './animals';
import { regrow } from './hunting';
import { pickFields } from './fields';
import { fieldsGrow } from '../seasons/year';
import { checkGoals, goalNow } from './goals';
import { canPlace, construct, linked, place, addBuilding } from './construction';
import { removeAt } from './demolish';
import { raise } from './houses';
import type { WinterState } from './survive';
import { computeTerritory, passable } from './land';
import { moveGoods } from './logistics';
import { checkVersion, mapVersion, restore, save, SaveData } from './save';
import { step } from './settlers';
import { staff } from './staff';
import { fade } from './wear';
import { allAsleep } from './sleep';
import { isStore, stored } from './stores';
import { dockOf } from './harbour';
import { idleTotal, poolOf } from './homes';
import { canSail, sail, stepShips } from './voyage';
import { START_TOOLS, watchTools } from './tools';
import type { Entry } from './chronicle';
import { stepTrader, trade, TRADE_EVERY } from './trade';
import { richAt, richSpots } from './geology';
import type { Animal, AnimalKind, Building, Settler, Ship, Trader } from './types';

export class Game {
  world: World;
  buildings = new Map<number, Building>();
  settlers = new Map<number, Settler>();
  donkeys = new Map<number, Settler>(); // pack donkeys out carrying; not settlers, and not saved
  metDonkey = false; // the first donkey of a session has been announced
  animals = new Map<number, Animal>(); // wild animals; not saved, a loaded game spawns them again
  hq: Building;
  pool = 18; // idle settlers inside the HQ
  ships: Ship[] = [];
  trader: Trader | null = null; // the trade ship, while it visits
  traderT = TRADE_EVERY; // seconds until the next trade ship sets out, counted while you have a harbour
  time = 0;
  toasts: string[] = [];
  chronicle: Entry[] = []; // the island's milestones, oldest first
  tradeVisits = 0; // trade ships that have tied up since the game began
  toolsLow = false; // the low tools warning was shown, and tools have not risen since
  made = bag(); // every good the settlement has made since the game began
  goal = 0; // index in GOALS of the goal the player is on
  winter = { state: 'late' as WinterState, since: new Map<number, number>() }; // the survive winter goal; `since` is when each house or mine began waiting for food
  wear = new Float32Array(W * H); // how worn each tile is by footsteps, 0 = grass, 1 = a dirt path
  worn = 0; // bumped whenever a tile's wear changes enough to see
  rich: Uint8Array; // 1 on the mountain tiles that are rich spots; the seed makes them, so saves don't store them
  signs = new Uint8Array(W * H); // 1 where a geologist has put up a sign
  signed = 0; // bumped whenever a geologist puts up signs

  // Internal state for the files in this folder. Code outside src/game/ should not touch it.
  nextId = 1;
  claimed = new Set<number>(); // tiles a worker is heading to
  snubbed = new Map<number, number>(); // unreachable tiles -> retry time
  walks = new Map<number, { t: number; d: Float32Array }>(); // walking distances from each building
  ground: { t: number; kind: Uint8Array; cost: Float32Array } | null = null; // what each tile is to a walker
  trod = new Float32Array(W * H); // game time of the last footstep on each tile
  wildCount: Record<AnimalKind, number> = { deer: 0, hare: 0, fox: 0 }; // animals of each kind the game began with
  wildT = 0; // seconds the island has been short of animals
  caught: { kind: AnimalKind; home: P }[] = []; // where caught animals lived, oldest first
  nextAnimal = 1; // id for the next wild animal, never reused, so a new animal gets a new model
  private dispatchT = 0;
  private growT = 0;

  constructor(readonly seed: number, map = MAP_VERSION) {
    this.world = new World(seed, map);
    this.rich = richSpots(this.world, seed);
    const { x, y } = this.world.start;
    this.hq = addBuilding(this, 'hq', x, y);
    this.hq.built = true;
    this.hq.progress = 1;
    this.hq.stock = bag({ log: 6, plank: 24, stone: 14, tool: START_TOOLS });
    this.computeTerritory();
    spawnAnimals(this);
  }

  save(): SaveData {
    return save(this);
  }

  static load(d: SaveData): Game {
    checkVersion(d);
    const g = new Game(d.seed, mapVersion(d));
    restore(g, d);
    return g;
  }

  // Everyone: idle in a home, out working, or on board a ship.
  get population() {
    return idleTotal(this) + this.settlers.size + this.ships.reduce((n, s) => n + s.crew, 0);
  }

  // Idle settlers in every home.
  get idle() {
    return idleTotal(this);
  }

  // Idle settlers waiting in the HQ or a landing harbour.
  poolOf(home: Building) {
    return poolOf(this, home);
  }

  // All goods kept in the HQ and storehouses.
  get stored() {
    return stored(this);
  }

  passable = (x: number, y: number) => passable(this, x, y);

  canPlace(type: BType, x: number, y: number) {
    return canPlace(this, type, x, y);
  }

  place(type: BType, x: number, y: number) {
    return place(this, type, x, y);
  }

  // Where ships tie up at a harbour.
  dock(b: Building) {
    return dockOf(this, b);
  }

  // Why settlers can't sail from harbour `b` to settle the other island, or null if they can.
  canSail(b: Building) {
    return canSail(this, b);
  }

  sail(b: Building) {
    return sail(this, b);
  }

  // Swap one deal of `give` for `get` with the trade ship at harbour `b`. Returns why it can't, or null.
  trade(b: Building, give: Good, get: Good) {
    return trade(this, b, give, get);
  }

  // Does a mine of this type at (x, y) sit next to a rich spot, so it digs twice as fast?
  richAt(type: BType, x: number, y: number) {
    return richAt(this, type, x, y);
  }

  isStore(b: Building) {
    return isStore(b);
  }

  linked(b: Building) {
    return linked(this, b);
  }

  computeTerritory() {
    return computeTerritory(this);
  }

  // The fields a building placed at (x, y) would take. Only farms have fields.
  planFields(type: BType, x: number, y: number) {
    return type === 'farm' ? pickFields(this, x, y) : [];
  }

  // The goal the player is on now, with its progress, or null once every goal is reached.
  goalNow() {
    return goalNow(this);
  }

  // Is it night, with every worker and builder in bed? Carriers and donkeys don't count.
  allAsleep() {
    return allAsleep(this);
  }

  // Demolish the building on tile `t`. Returns why it can't, or null.
  removeAt(t: P) {
    return removeAt(this, t);
  }

  update(dt: number) {
    this.time += dt;
    this.dispatchT -= dt;
    if (this.dispatchT <= 0) {
      this.dispatchT = 0.25;
      moveGoods(this);
      staff(this);
      checkGoals(this);
      watchTools(this);
    }
    this.growT -= dt;
    if (this.growT <= 0) {
      this.growT += 1; // add, not reset, so float steps never stretch the second
      const crops = fieldsGrow(this.time);
      for (const t of this.world.tiles) {
        if (t.tree > 0 && t.tree < 1) t.tree = Math.min(1, t.tree + 1 / 40);
        if (crops && t.crop > 0 && t.crop < 1) t.crop = Math.min(1, t.crop + 1 / CROP_GROW);
      }
      fade(this);
    }
    for (const b of this.buildings.values()) {
      if (!b.built) construct(this, b, dt);
      else if (b.type === 'house') raise(this, b, dt);
    }
    for (const s of this.settlers.values()) step(this, s, dt);
    for (const d of this.donkeys.values()) step(this, d, dt);
    for (const a of this.animals.values()) stepAnimal(this, a, dt);
    stepShips(this, dt);
    stepTrader(this, dt);
    regrow(this, dt);
  }
}
