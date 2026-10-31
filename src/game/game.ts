// The Game class: all the state of one settlement, and the actions the player and the main loop call.
// The work itself lives in the other files of this folder, as functions that take the game.
import type { P } from '../path';
import { MAP_VERSION, World } from '../world';
import { BType, CROP_GROW, bag } from './defs';
import { planAutoRoad } from './autoroad';
import { canPlace, construct, linked, place, addBuilding } from './construction';
import { raise } from './houses';
import { computeTerritory, passable } from './land';
import { isStore, moveGoods, stored } from './logistics';
import { buildRoad, flagAt, planRoad, removeAt, startFlag } from './roads';
import { checkVersion, mapVersion, restore, save, SaveData } from './save';
import { step } from './settlers';
import { staff } from './staff';
import type { Building, Flag, Road, Settler } from './types';

export class Game {
  world: World;
  buildings = new Map<number, Building>();
  settlers = new Map<number, Settler>();
  flags = new Map<number, Flag>();
  roads = new Map<number, Road>();
  hq: Building;
  pool = 18; // idle settlers inside the HQ
  time = 0;
  net = 0; // bumped whenever the road network changes
  toasts: string[] = [];

  // Internal state for the files in this folder. Code outside src/game/ should not touch it.
  nextId = 1;
  claimed = new Set<number>(); // tiles a worker is heading to
  snubbed = new Map<number, number>(); // unreachable tiles -> retry time
  dist = new Map<number, Map<number, number>>(); // per destination flag, cached for `distNet`
  distNet = -1;
  private dispatchT = 0;
  private growT = 0;

  constructor(readonly seed: number, map = MAP_VERSION) {
    this.world = new World(seed, map);
    const { x, y } = this.world.start;
    this.hq = addBuilding(this, 'hq', x, y);
    this.hq.built = true;
    this.hq.progress = 1;
    this.hq.stock = bag({ log: 6, plank: 24, stone: 14 });
    this.computeTerritory();
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

  get population() {
    return this.pool + this.settlers.size;
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

  isStore(b: Building) {
    return isStore(b);
  }

  linked(b: Building) {
    return linked(this, b);
  }

  computeTerritory() {
    return computeTerritory(this);
  }

  flagAt(t: P) {
    return flagAt(this, t);
  }

  startFlag(t: P) {
    return startFlag(this, t);
  }

  planRoad(fromId: number, t: P) {
    return planRoad(this, fromId, t);
  }

  buildRoad(fromId: number, t: P) {
    return buildRoad(this, fromId, t);
  }

  // The road a building placed at (x, y) would get, for showing before you place it.
  planAutoRoad(x: number, y: number) {
    return planAutoRoad(this, { x, y: y + 1 }, { x, y });
  }

  removeAt(t: P) {
    return removeAt(this, t);
  }

  update(dt: number) {
    this.time += dt;
    this.dispatchT -= dt;
    if (this.dispatchT <= 0) {
      this.dispatchT = 0.25;
      staff(this);
      moveGoods(this);
    }
    this.growT -= dt;
    if (this.growT <= 0) {
      this.growT += 1; // add, not reset, so float steps never stretch the second
      for (const t of this.world.tiles) {
        if (t.tree > 0 && t.tree < 1) t.tree = Math.min(1, t.tree + 1 / 40);
        if (t.crop > 0 && t.crop < 1) t.crop = Math.min(1, t.crop + 1 / CROP_GROW);
      }
    }
    for (const b of this.buildings.values()) {
      if (!b.built) construct(this, b, dt);
      else if (b.type === 'house') raise(this, b, dt);
    }
    for (const s of this.settlers.values()) step(this, s, dt);
  }
}
