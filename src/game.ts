import { World, W, Tile } from './world';
import { findPath, P } from './path';

export type Good = 'log' | 'plank' | 'stone' | 'fish' | 'grain' | 'flour' | 'bread';
export const GOODS: Good[] = ['log', 'plank', 'stone', 'fish', 'grain', 'flour', 'bread'];
export type Bag = Record<Good, number>;
export const bag = (p: Partial<Bag> = {}): Bag => ({ log: 0, plank: 0, stone: 0, fish: 0, grain: 0, flour: 0, bread: 0, ...p });

export type Role = 'carrier' | 'builder' | 'woodcutter' | 'forester' | 'stonecutter' | 'sawyer' | 'scout'
  | 'fisher' | 'farmer' | 'miller' | 'baker' | 'miner';
export type BType = 'hq' | 'woodcutter' | 'forester' | 'quarry' | 'sawmill' | 'lookout' | 'storehouse'
  | 'fisher' | 'farm' | 'mill' | 'bakery' | 'mine' | 'house';
export type Anim = '' | 'chop' | 'mine' | 'hammer' | 'plant' | 'fish' | 'reap';

// Houses grow your number of settlers.
export const HOUSE_FOOD: Good[] = ['fish', 'bread'];
export const HOUSE_PANTRY = 2; // food a house keeps on hand
export const HOUSE_GROW = 40; // seconds from eating to a new settler
export const HOUSE_SIZE = 4; // settlers one house adds in all

export interface BDef {
  name: string;
  icon: string;
  desc: string;
  cost: Partial<Bag>;
  buildTime: number; // seconds of hammering once all materials are on site
  worker: Role | null;
  radius: number; // work radius, or land radius for hq/lookout
  wall: string;
  roof: string;
}

export const BDEFS: Record<BType, BDef> = {
  hq: { name: 'Headquarters', icon: '🏰', desc: 'Stores all goods and houses idle settlers.', cost: {}, buildTime: 0, worker: null, radius: 9, wall: '#dccaa6', roof: '#a8432f' },
  woodcutter: { name: "Woodcutter's Hut", icon: '🪓', desc: 'Fells grown trees nearby and produces logs.', cost: { plank: 2 }, buildTime: 6, worker: 'woodcutter', radius: 6, wall: '#c9a87a', roof: '#5f7f34' },
  forester: { name: "Forester's Hut", icon: '🌱', desc: 'Plants saplings that grow into new trees.', cost: { plank: 2 }, buildTime: 6, worker: 'forester', radius: 5, wall: '#cdb487', roof: '#7fa63a' },
  quarry: { name: 'Quarry', icon: '⛏️', desc: 'Breaks nearby boulders into stone.', cost: { plank: 2 }, buildTime: 6, worker: 'stonecutter', radius: 6, wall: '#b9b4a8', roof: '#6d6a66' },
  sawmill: { name: 'Sawmill', icon: '🪚', desc: 'Saws logs into planks.', cost: { plank: 2, stone: 2 }, buildTime: 9, worker: 'sawyer', radius: 0, wall: '#c49a6c', roof: '#8a4b2a' },
  lookout: { name: 'Lookout Tower', icon: '🔭', desc: 'Expands your land. No soldiers, just a view.', cost: { plank: 3, stone: 3 }, buildTime: 10, worker: 'scout', radius: 7, wall: '#d2c4a4', roof: '#3f5f8a' },
  storehouse: { name: 'Storehouse', icon: '📦', desc: 'Stores spare goods close to where they are made and needed.', cost: { plank: 3, stone: 2 }, buildTime: 8, worker: null, radius: 0, wall: '#c8b48c', roof: '#7a5a3a' },
  fisher: { name: "Fisher's Hut", icon: '🎣', desc: 'Catches fish from the water nearby. Build it close to the shore.', cost: { plank: 2 }, buildTime: 6, worker: 'fisher', radius: 5, wall: '#c8b28a', roof: '#3f6f8a' },
  farm: { name: 'Farm', icon: '🌾', desc: 'Sows grain on free grass nearby and harvests it when it is ripe.', cost: { plank: 3, stone: 1 }, buildTime: 8, worker: 'farmer', radius: 3, wall: '#e0c99a', roof: '#b5812f' },
  mill: { name: 'Mill', icon: '⚙️', desc: 'Grinds grain into flour.', cost: { plank: 2, stone: 3 }, buildTime: 9, worker: 'miller', radius: 0, wall: '#e6dcc4', roof: '#7a4a2a' },
  bakery: { name: 'Bakery', icon: '🍞', desc: 'Bakes flour into bread.', cost: { plank: 2, stone: 2 }, buildTime: 8, worker: 'baker', radius: 0, wall: '#d9b98c', roof: '#9a3f2a' },
  house: { name: 'House', icon: '🏠', desc: `A family home. It turns one fish or bread into a new settler every ${HOUSE_GROW} s, up to ${HOUSE_SIZE} settlers.`, cost: { plank: 3, stone: 2 }, buildTime: 8, worker: null, radius: 0, wall: '#e8d6b0', roof: '#b0583a' },
  mine: { name: 'Stone Mine', icon: '⛰️', desc: 'Digs stone out of a mountain and never runs dry. The miner eats one fish or bread for every 2 stone. Build it next to a mountain.', cost: { plank: 4 }, buildTime: 10, worker: 'miner', radius: 2, wall: '#9a948a', roof: '#4f4a44' },
};
export const BUILDABLE: BType[] = ['woodcutter', 'forester', 'quarry', 'sawmill', 'lookout', 'storehouse', 'fisher', 'farm', 'mill', 'bakery', 'mine', 'house'];

// Workshops turn goods into other goods inside the building. With several inputs, any one of them will do.
export interface Recipe {
  from: Good[];
  to: Good;
  n: number; // goods made from one input
  t: number; // seconds of work
  doing: string;
  waiting: string;
}
export const RECIPES: Partial<Record<BType, Recipe>> = {
  sawmill: { from: ['log'], to: 'plank', n: 1, t: 5, doing: 'Sawing planks', waiting: 'Waiting for logs' },
  mill: { from: ['grain'], to: 'flour', n: 1, t: 5, doing: 'Grinding flour', waiting: 'Waiting for grain' },
  bakery: { from: ['flour'], to: 'bread', n: 1, t: 6, doing: 'Baking bread', waiting: 'Waiting for flour' },
  mine: { from: ['bread', 'fish'], to: 'stone', n: 2, t: 8, doing: 'Digging stone', waiting: 'Waiting for fish or bread' },
};

export interface Building {
  id: number;
  type: BType;
  x: number;
  y: number;
  flag: number; // the flag in front of the door, at (x, y + 1)
  built: boolean;
  progress: number; // construction 0..1
  stock: Bag; // construction materials, production inputs, or stored goods (HQ and storehouses)
  out: Bag; // finished goods waiting for room on the flag
  incoming: Bag; // goods already routed here
  worker: number;
  builder: number;
  busy: boolean;
  using: Good | null; // the input a workshop is working on right now
  status: string;
  born: number; // settlers a house has added so far
  grow: number; // seconds until a house's next settler, while it is eating
}

// A good lying on a flag, on its way to building `dest` (0 = not decided yet).
export interface Item {
  g: Good;
  dest: number;
}

export interface Flag {
  id: number;
  x: number;
  y: number;
  items: Item[];
  roads: number[];
  building: number;
}

// A road runs between two flags; `path` includes both flag tiles. One carrier works each road.
export interface Road {
  id: number;
  a: number;
  b: number;
  path: P[];
  carrier: number;
}

type Task =
  | { k: 'walk'; x: number; y: number; adjacent?: boolean; via?: P[] }
  | { k: 'work'; t: number; anim?: Anim }
  | { k: 'do'; f: () => boolean | void };

export interface Settler {
  id: number;
  role: Role;
  x: number;
  y: number;
  path: P[] | null;
  tasks: Task[];
  carrying: Good | null;
  item: Item | null; // what a road carrier holds
  ri: number; // a road carrier's index along its road
  since: number; // game time a road carrier last had something to do
  home: number; // building, or road for carriers
  inside: boolean;
  atWork: boolean;
  returning: boolean;
  walking: boolean;
  anim: Anim;
  facing: 1 | -1;
  onAbort: (() => void) | null;
}

const SPEED = 1.7; // tiles per second
const ROAD_SPEED = 1.5; // multiplier on roads
const PILE = 4; // max finished goods a hut keeps before its worker pauses
const FLAG_CAP = 8;
const FLAG_SPACING = 4; // new roads get a flag about this often
const CARRIER_REST = 12; // seconds a carrier waits on an empty road before going home
export const CROP_GROW = 60; // seconds for sown grain to ripen

export const SAVE_VERSION = 2;

// A saved game. The map is rebuilt from the seed; only what changes during play is stored.
// Settlers are not stored: on load everyone is back in the HQ and the dispatcher sends them out again.
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
  private nextId = 1;
  private claimed = new Set<number>(); // tiles a worker is heading to
  private snubbed = new Map<number, number>(); // unreachable tiles -> retry time
  private dist = new Map<number, Map<number, number>>(); // per destination flag, cached for `distNet`
  private distNet = -1;
  private dispatchT = 0;
  private growT = 0;

  constructor(readonly seed: number) {
    this.world = new World(seed);
    const { x, y } = this.world.start;
    this.hq = this.addBuilding('hq', x, y);
    this.hq.built = true;
    this.hq.progress = 1;
    this.hq.stock = bag({ log: 6, plank: 24, stone: 14 });
    this.computeTerritory();
  }

  save(): SaveData {
    const buildings = structuredClone([...this.buildings.values()]);
    const flags = structuredClone([...this.flags.values()]);
    const roads = structuredClone([...this.roads.values()]);
    const bs = new Map(buildings.map((b) => [b.id, b]));
    const fs = new Map(flags.map((f) => [f.id, f]));
    // Put back whatever settlers are holding, so no goods are lost when they all go home.
    for (const s of this.settlers.values()) {
      const r = this.roads.get(s.home);
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
      if (b.type !== 'hq') b.status = b.built ? this.builtStatus(b) : 'Waiting for a builder';
    }
    for (const r of roads) r.carrier = 0;
    return {
      v: SAVE_VERSION, seed: this.seed, time: this.time, pool: this.population, nextId: this.nextId, hq: this.hq.id,
      tiles: this.world.tiles.map((t) => [t.tree, t.conifer ? 1 : 0, t.rock, t.b, t.flag, t.road, t.crop]),
      buildings, flags, roads,
    };
  }

  static load(d: SaveData): Game {
    if (d.v !== 1 && d.v !== SAVE_VERSION) throw new Error('This save is from a different version of Hitoria');
    const g = new Game(d.seed);
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
    g.computeTerritory();
    return g;
  }

  get population() {
    return this.pool + this.settlers.size;
  }

  passable = (x: number, y: number) => {
    const t = this.world.at(x, y);
    return t.t !== 'water' && t.t !== 'mountain' && t.tree < 0.5 && t.rock === 0 && t.b === 0;
  };

  private walkCost = (x: number, y: number) => {
    const t = this.world.at(x, y);
    return t.road || t.flag ? 1 / ROAD_SPEED : 1;
  };

  private roadable = (x: number, y: number) => {
    if (!this.world.inside(x, y) || !this.world.territory[y * W + x]) return false;
    const t = this.world.at(x, y);
    return (t.t === 'grass' || t.t === 'sand') && !t.tree && !t.rock && !t.b && !t.road && !t.flag;
  };

  // A flag may go on free ground or on a road, but never right next to another flag.
  private flaggable(x: number, y: number) {
    if (!this.world.inside(x, y)) return false;
    if (!this.world.at(x, y).road && !this.roadable(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.world.inside(x + dx, y + dy) && this.world.at(x + dx, y + dy).flag) return false;
    return true;
  }

  canPlace(type: BType, x: number, y: number): string | null {
    if (!this.world.inside(x, y) || !this.world.inside(x, y + 1)) return 'Outside the map';
    const t = this.world.at(x, y);
    if (t.b || t.flag || t.road) return 'Occupied';
    if (!this.world.territory[y * W + x]) return 'Outside your land';
    if (t.t !== 'grass') return 'Needs flat grass';
    if (t.tree) return 'A tree is in the way';
    if (t.rock) return 'A boulder is in the way';
    if (type === 'mine' && !this.near(x, y, BDEFS.mine.radius, (n) => n.t === 'mountain')) return 'Must be next to a mountain';
    if (type === 'fisher' && !this.near(x, y, BDEFS.fisher.radius, (n) => n.t === 'water')) return 'Must be near water';
    const front = this.world.at(x, y + 1);
    const flagOk = front.flag ? !this.flags.get(front.flag)!.building : this.flaggable(x, y + 1);
    if (!flagOk) return 'No room for its flag in front';
    // Players can't fell trees themselves, so a flag walled in by trees would never get a road.
    const hq = this.flags.get(this.hq.flag)!;
    const reach = (tx: number, ty: number) => (tx !== x || ty !== y) && (this.roadable(tx, ty) || !!this.world.at(tx, ty).road || !!this.world.at(tx, ty).flag);
    if (!findPath(hq.x, hq.y, x, y + 1, reach)) return 'No road can reach it';
    return BDEFS[type] ? null : 'Unknown building';
  }

  place(type: BType, x: number, y: number) {
    const b = this.addBuilding(type, x, y);
    b.status = 'Waiting for a builder';
    return b;
  }

  // Is there a tile within `r` of (x, y) that passes `ok`?
  private near(x: number, y: number, r: number, ok: (t: Tile) => boolean) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.hypot(dx, dy) <= r && this.world.inside(x + dx, y + dy) && ok(this.world.at(x + dx, y + dy))) return true;
    return false;
  }

  // The HQ and every finished storehouse keep goods for the whole settlement.
  isStore(b: Building) {
    return b.type === 'hq' || (b.type === 'storehouse' && b.built);
  }

  // All goods kept in the HQ and storehouses.
  get stored(): Bag {
    const sum = bag();
    for (const b of this.buildings.values()) if (this.isStore(b)) for (const g of GOODS) sum[g] += b.stock[g];
    return sum;
  }

  private builtStatus(b: Building) {
    return BDEFS[b.type].worker ? 'Waiting for a worker' : 'Storing goods';
  }

  // Is the building joined to the HQ by roads?
  linked(b: Building) {
    return this.distTo(b.flag).has(this.hq.flag);
  }

  update(dt: number) {
    this.time += dt;
    this.dispatchT -= dt;
    if (this.dispatchT <= 0) {
      this.dispatchT = 0.25;
      this.dispatch();
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
      if (!b.built) this.construct(b, dt);
      else if (b.type === 'house') this.raise(b, dt);
    }
    for (const s of this.settlers.values()) this.step(s, dt);
  }

  // --- roads and flags -----------------------------------------------------

  flagAt(t: P): Flag | null {
    if (!this.world.inside(t.x, t.y)) return null;
    const tile = this.world.at(t.x, t.y);
    if (tile.flag) return this.flags.get(tile.flag)!;
    if (tile.b) return this.flags.get(this.buildings.get(tile.b)!.flag)!;
    return null;
  }

  // Where a road may start: an existing flag, a building's flag, or a new flag on free ground or a road.
  startFlag(t: P): Flag | string {
    const f = this.flagAt(t);
    if (f) return f;
    if (this.flaggable(t.x, t.y)) return this.ensureFlag(t.x, t.y);
    return 'Roads start at a flag, a building, or free ground away from other flags';
  }

  // The tiles a road from `fromId` to `t` would use, both flag tiles included.
  planRoad(fromId: number, t: P): P[] | null {
    const from = this.flags.get(fromId);
    if (!from || !this.world.inside(t.x, t.y)) return null;
    const end = this.flagAt(t) ?? t;
    if (end.x === from.x && end.y === from.y) return null;
    if (!this.world.at(end.x, end.y).flag && !this.flaggable(end.x, end.y)) return null;
    const p = findPath(from.x, from.y, end.x, end.y, this.roadable, 3000);
    return p ? [{ x: from.x, y: from.y }, ...p] : null;
  }

  buildRoad(fromId: number, t: P): Flag | string {
    const path = this.planRoad(fromId, t);
    if (!path) return 'No room for a road there';
    const last = path[path.length - 1];
    const end = this.ensureFlag(last.x, last.y);
    this.createRoad(fromId, end.id, path);
    // Flags along long roads let several carriers share the work.
    let since = 0;
    for (let i = 1; i < path.length - 2; i++) {
      if (++since < FLAG_SPACING || !this.flaggable(path[i].x, path[i].y)) continue;
      this.ensureFlag(path[i].x, path[i].y);
      since = 0;
    }
    return end;
  }

  removeAt(t: P): string | null {
    if (!this.world.inside(t.x, t.y)) return 'Nothing to remove here';
    const tile = this.world.at(t.x, t.y);
    if (tile.flag) return this.removeFlag(tile.flag);
    if (tile.road) {
      this.removeRoad(tile.road);
      return null;
    }
    if (tile.b) return 'Demolishing buildings is not in yet';
    return 'Nothing to remove here';
  }

  private newFlag(x: number, y: number) {
    const f: Flag = { id: this.nextId++, x, y, items: [], roads: [], building: 0 };
    this.flags.set(f.id, f);
    Object.assign(this.world.at(x, y), { flag: f.id, crop: 0 });
    this.net++;
    return f;
  }

  private ensureFlag(x: number, y: number): Flag {
    const tile = this.world.at(x, y);
    if (tile.flag) return this.flags.get(tile.flag)!;
    if (tile.road) return this.splitRoad(tile.road, x, y);
    return this.newFlag(x, y);
  }

  private createRoad(a: number, b: number, path: P[]) {
    const r: Road = { id: this.nextId++, a, b, path, carrier: 0 };
    for (let i = 1; i < path.length - 1; i++) Object.assign(this.world.at(path[i].x, path[i].y), { road: r.id, crop: 0 });
    this.flags.get(a)!.roads.push(r.id);
    this.flags.get(b)!.roads.push(r.id);
    this.roads.set(r.id, r);
    this.net++;
    return r;
  }

  private splitRoad(rid: number, x: number, y: number) {
    const r = this.roads.get(rid)!;
    const i = r.path.findIndex((p) => p.x === x && p.y === y);
    this.removeRoad(rid);
    const f = this.newFlag(x, y);
    this.createRoad(r.a, f.id, r.path.slice(0, i + 1));
    this.createRoad(f.id, r.b, r.path.slice(i));
    return f;
  }

  private removeRoad(rid: number) {
    const r = this.roads.get(rid);
    if (!r) return;
    for (const p of r.path) {
      const t = this.world.at(p.x, p.y);
      if (t.road === rid) t.road = 0;
    }
    for (const fid of [r.a, r.b]) {
      const f = this.flags.get(fid);
      if (f) f.roads = f.roads.filter((id) => id !== rid);
    }
    this.roads.delete(rid);
    this.net++;
    const s = this.settlers.get(r.carrier);
    if (!s) return;
    if (s.item) {
      const f = this.flags.get(s.ri < r.path.length / 2 ? r.a : r.b);
      if (f) f.items.push(s.item);
      else this.dropItem(s.item);
    }
    s.item = null;
    s.carrying = null;
    s.onAbort = null;
    s.atWork = false;
    s.home = 0;
    s.path = null;
    s.walking = false;
    s.anim = '';
    s.tasks = [{ k: 'walk', x: this.hq.x, y: this.hq.y }, { k: 'do', f: () => this.despawn(s) }];
  }

  private removeFlag(fid: number): string | null {
    const f = this.flags.get(fid)!;
    if (f.building) return "A building's own flag can't be removed";
    for (const rid of [...f.roads]) this.removeRoad(rid);
    for (const it of f.items) this.dropItem(it);
    this.world.at(f.x, f.y).flag = 0;
    this.flags.delete(fid);
    this.net++;
    return null;
  }

  // Goods stranded by a removed road or flag go back into the HQ's stock.
  private dropItem(it: Item) {
    const dest = this.buildings.get(it.dest);
    if (dest) dest.incoming[it.g]--;
    this.hq.stock[it.g]++;
  }

  // Road distance from every flag to flag `to` (only flags connected to it appear).
  private distTo(to: number) {
    if (this.distNet !== this.net) {
      this.dist.clear();
      this.distNet = this.net;
    }
    let d = this.dist.get(to);
    if (d) return d;
    d = new Map([[to, 0]]);
    const open = [to];
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (d.get(open[i])! < d.get(open[bi])!) bi = i;
      const cur = open.splice(bi, 1)[0];
      const cd = d.get(cur)!;
      for (const rid of this.flags.get(cur)!.roads) {
        const r = this.roads.get(rid)!;
        const o = r.a === cur ? r.b : r.a;
        const nd = cd + r.path.length - 1;
        if (nd < (d.get(o) ?? Infinity)) {
          if (!d.has(o)) open.push(o);
          d.set(o, nd);
        }
      }
    }
    this.dist.set(to, d);
    return d;
  }

  // The road a good on flag `f` should take next to reach flag `to`.
  private nextRoad(f: Flag, to: number) {
    const dist = this.distTo(to);
    let best = 0, bd = Infinity;
    for (const rid of f.roads) {
      const r = this.roads.get(rid)!;
      const d = r.path.length - 1 + (dist.get(r.a === f.id ? r.b : r.a) ?? Infinity);
      if (d < bd) { bd = d; best = rid; }
    }
    return best;
  }

  // --- logistics -----------------------------------------------------------

  private want(b: Building, g: Good) {
    if (!b.built) return BDEFS[b.type].cost[g] ?? 0;
    if (b.type === 'house') return this.pantry(b, g);
    const rc = RECIPES[b.type];
    if (!rc?.from.includes(g)) return 0;
    // Several inputs share one pile, so a mine keeps PILE food of any kind.
    let other = 0;
    for (const o of rc.from) if (o !== g) other += b.stock[o] + b.incoming[o];
    return Math.max(0, PILE - other);
  }

  private missing(b: Building, g: Good) {
    return this.want(b, g) - b.stock[g] - b.incoming[g];
  }

  private dispatch() {
    // Staff: a carrier for every road with goods to move, a builder for every site, a worker for every hut.
    for (const r of this.roads.values()) {
      if (r.carrier || !this.cargo(r, 0) && !this.cargo(r, 1)) continue;
      const s = this.takeSettler('carrier');
      if (!s) break;
      r.carrier = s.id;
      s.home = r.id;
      const mid = r.path.length >> 1;
      s.onAbort = () => { r.carrier = 0; this.despawn(s); };
      s.tasks = [{ k: 'walk', ...r.path[mid] }, { k: 'do', f: () => { s.atWork = true; s.ri = mid; s.since = this.time; s.onAbort = null; } }];
    }
    for (const b of this.buildings.values()) {
      if (!b.built && !b.builder) {
        const s = this.takeSettler('builder');
        if (!s) break;
        b.builder = s.id;
        s.home = b.id;
        s.onAbort = () => this.giveUp(s, b, 'builder');
        s.tasks = [{ k: 'walk', x: b.x, y: b.y, adjacent: true }, { k: 'do', f: () => { s.atWork = true; s.onAbort = null; } }];
      }
      const role = BDEFS[b.type].worker;
      if (b.built && role && !b.worker) {
        const s = this.takeSettler(role);
        if (!s) break;
        b.worker = s.id;
        s.home = b.id;
        s.onAbort = () => this.giveUp(s, b, 'worker');
        s.tasks = [{ k: 'walk', x: b.x, y: b.y }, { k: 'do', f: () => { s.inside = true; s.onAbort = null; } }];
      }
    }

    // Finished goods go out onto the building's flag.
    for (const b of this.buildings.values()) {
      if (b === this.hq || !b.built) continue;
      const f = this.flags.get(b.flag)!;
      for (const g of GOODS)
        while (b.out[g] > 0 && f.items.length < FLAG_CAP) {
          b.out[g]--;
          f.items.push({ g, dest: 0 });
        }
    }

    // Every good on a flag gets somewhere to go; goods at their destination's flag go inside.
    for (const f of this.flags.values()) {
      f.items = f.items.filter((it) => {
        let dest = this.buildings.get(it.dest);
        if (dest && !this.distTo(dest.flag).has(f.id)) {
          dest.incoming[it.g]--;
          it.dest = 0;
          dest = undefined;
        }
        if (!dest) {
          dest = this.pickDest(f, it.g);
          if (!dest) return true;
          it.dest = dest.id;
          dest.incoming[it.g]++;
        }
        if (dest.flag !== f.id) return true;
        dest.incoming[it.g]--;
        dest.stock[it.g]++;
        return false;
      });
    }

    // Stores send out what buildings still need, the nearest store by road first.
    for (const b of this.buildings.values()) {
      if (this.isStore(b)) continue;
      const dist = this.distTo(b.flag);
      const stores = [...this.buildings.values()]
        .filter((s) => this.isStore(s) && dist.has(s.flag))
        .sort((p, q) => dist.get(p.flag)! - dist.get(q.flag)!);
      for (const g of GOODS)
        while (this.missing(b, g) > 0) {
          const s = stores.find((s) => s.stock[g] > 0 && this.flags.get(s.flag)!.items.length < FLAG_CAP);
          if (!s) break;
          s.stock[g]--;
          b.incoming[g]++;
          this.flags.get(s.flag)!.items.push({ g, dest: b.id });
        }
    }
  }

  // Nearest building (by road) that wants this good, else the nearest store.
  private pickDest(f: Flag, g: Good) {
    let best: Building | undefined, bd = Infinity;
    for (const b of this.buildings.values()) {
      if (this.isStore(b) || this.missing(b, g) <= 0) continue;
      const d = this.distTo(b.flag).get(f.id);
      if (d !== undefined && d < bd) { bd = d; best = b; }
    }
    if (best) return best;
    for (const b of this.buildings.values()) {
      if (!this.isStore(b)) continue;
      const d = this.distTo(b.flag).get(f.id);
      if (d !== undefined && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // --- buildings -----------------------------------------------------------

  private addBuilding(type: BType, x: number, y: number) {
    const b: Building = {
      id: this.nextId++, type, x, y, flag: 0, built: false, progress: 0,
      stock: bag(), out: bag(), incoming: bag(),
      worker: 0, builder: 0, busy: false, using: null, status: '', born: 0, grow: 0,
    };
    this.buildings.set(b.id, b);
    Object.assign(this.world.at(x, y), { b: b.id, crop: 0 });
    const f = this.ensureFlag(x, y + 1);
    f.building = b.id;
    b.flag = f.id;
    return b;
  }

  private construct(b: Building, dt: number) {
    const def = BDEFS[b.type];
    const builder = this.settlers.get(b.builder);
    let need = 0, have = 0;
    for (const g of GOODS) {
      need += def.cost[g] ?? 0;
      have += Math.min(b.stock[g], def.cost[g] ?? 0);
    }
    const cap = need ? have / need : 1;
    if (!builder?.atWork) {
      b.status = builder ? 'Builder on the way' : 'Waiting for a free settler';
      return;
    }
    if (b.progress >= cap) {
      builder.anim = '';
      b.status = this.linked(b) ? 'Waiting for materials' : 'Needs a road to your HQ';
      return;
    }
    builder.anim = 'hammer';
    b.status = 'Under construction';
    b.progress = Math.min(cap, b.progress + dt / def.buildTime);
    if (b.progress < 1) return;

    b.built = true;
    b.stock = bag();
    b.builder = 0;
    b.status = this.builtStatus(b);
    builder.atWork = false;
    builder.anim = '';
    builder.tasks = [{ k: 'walk', x: this.hq.x, y: this.hq.y }, { k: 'do', f: () => this.despawn(builder) }];
    if (b.type === 'lookout') this.computeTerritory();
    this.toasts.push(`${def.icon} ${def.name} finished`);
  }

  // A house keeps a little food of any kind, but never more than its last settlers need.
  private pantry(b: Building, g: Good) {
    if (!HOUSE_FOOD.includes(g)) return 0;
    let other = 0;
    for (const o of HOUSE_FOOD) if (o !== g) other += b.stock[o] + b.incoming[o];
    const left = HOUSE_SIZE - b.born - (b.busy ? 1 : 0);
    return Math.max(0, Math.min(HOUSE_PANTRY, left) - other);
  }

  // A house eats one food, and a new settler moves into the HQ once it has grown up.
  private raise(b: Building, dt: number) {
    if (b.born >= HOUSE_SIZE) {
      b.status = 'House is full';
      return;
    }
    if (!b.busy) {
      const g = HOUSE_FOOD.find((g) => b.stock[g] > 0);
      if (!g) {
        b.status = this.linked(b) ? 'Waiting for fish or bread' : 'Needs a road to your HQ';
        return;
      }
      b.stock[g]--;
      b.busy = true;
      b.using = g;
      b.grow = HOUSE_GROW;
    }
    b.status = 'A settler will be born soon';
    b.grow -= dt;
    if (b.grow > 0) return;
    b.busy = false;
    b.using = null;
    b.born++;
    this.pool++;
    this.toasts.push('👶 A new settler was born');
  }

  computeTerritory() {
    const t = this.world.territory;
    t.fill(0);
    for (const b of this.buildings.values()) {
      if (!b.built || (b.type !== 'hq' && b.type !== 'lookout')) continue;
      const r = BDEFS[b.type].radius;
      for (let y = b.y - r; y <= b.y + r; y++)
        for (let x = b.x - r; x <= b.x + r; x++)
          if (this.world.inside(x, y) && Math.hypot(x - b.x, y - b.y) <= r + 0.3) t[y * W + x] = 1;
    }
  }

  // --- settlers ------------------------------------------------------------

  private takeSettler(role: Role): Settler | null {
    if (this.pool <= 0) return null;
    this.pool--;
    const s: Settler = {
      id: this.nextId++, role, x: this.hq.x, y: this.hq.y, path: null, tasks: [], carrying: null, item: null, ri: 0, since: 0,
      home: 0, inside: false, atWork: false, returning: false, walking: false, anim: '', facing: 1, onAbort: null,
    };
    this.settlers.set(s.id, s);
    return s;
  }

  // A settler couldn't reach their post: send them back inside and let the dispatcher retry later.
  private giveUp(s: Settler, b: Building, slot: 'builder' | 'worker') {
    b[slot] = 0;
    b.status = 'Unreachable, retrying soon';
    this.despawn(s);
  }

  private despawn(s: Settler) {
    this.settlers.delete(s.id);
    this.pool++;
  }

  private abort(s: Settler) {
    s.tasks = [];
    s.path = null;
    s.walking = false;
    s.anim = '';
    const f = s.onAbort;
    s.onAbort = null;
    f?.();
  }

  private step(s: Settler, dt: number) {
    if (!s.tasks.length) {
      this.idle(s);
      if (!s.tasks.length) return;
    }
    const t = s.tasks[0];
    if (t.k === 'do') {
      s.tasks.shift();
      if (t.f() === false) this.abort(s);
    } else if (t.k === 'work') {
      s.anim = t.anim ?? '';
      t.t -= dt;
      if (t.t <= 0) {
        s.tasks.shift();
        s.anim = '';
      }
    } else {
      if (!s.path) {
        const p = t.via ? [...t.via] : findPath(Math.round(s.x), Math.round(s.y), t.x, t.y, this.passable, 6000, this.walkCost);
        if (!p) return this.abort(s);
        if (t.adjacent) p.pop();
        s.path = p;
        s.inside = false;
      }
      s.walking = true;
      s.anim = '';
      const here = this.world.at(Math.round(s.x), Math.round(s.y));
      let left = SPEED * dt * (here.road || here.flag ? ROAD_SPEED : 1);
      while (left > 0 && s.path.length) {
        const n = s.path[0];
        const dx = n.x - s.x, dy = n.y - s.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.01) s.facing = dx - dy >= 0 ? 1 : -1;
        if (d <= left) {
          s.x = n.x;
          s.y = n.y;
          s.path.shift();
          left -= d;
        } else {
          s.x += (dx / d) * left;
          s.y += (dy / d) * left;
          left = 0;
        }
      }
      if (!s.path.length) {
        s.path = null;
        s.walking = false;
        s.tasks.shift();
      }
    }
  }

  private idle(s: Settler) {
    if (s.role === 'carrier') return this.carry(s);
    const home = this.buildings.get(s.home);
    if (!home || s.role === 'builder') return;
    const rest = (t: number, status: string) => {
      home.status = status;
      s.tasks = [{ k: 'work', t }];
    };
    const r = BDEFS[home.type].radius;

    switch (s.role) {
      case 'woodcutter':
      case 'stonecutter': {
        const wood = s.role === 'woodcutter';
        const good: Good = wood ? 'log' : 'stone';
        if (home.out[good] >= PILE) return rest(2, 'Flag is full, waiting for a carrier');
        const at = this.findTile(home, r, (t) => (wood ? t.tree >= 1 : t.rock > 0));
        if (!at) return rest(3, wood ? 'No grown trees in range' : 'No boulders in range');
        home.status = wood ? 'Felling a tree' : 'Breaking stone';
        const i = this.claim(s, at);
        const tile = this.world.at(at.x, at.y);
        s.tasks = [
          { k: 'walk', ...at, adjacent: true },
          { k: 'work', t: wood ? 3.5 : 4, anim: wood ? 'chop' : 'mine' },
          { k: 'do', f: () => {
            this.claimed.delete(i);
            if (wood) tile.tree = 0; else tile.rock--;
            s.carrying = good;
          } },
          { k: 'walk', x: home.x, y: home.y },
          { k: 'do', f: () => { s.carrying = null; s.onAbort = null; s.inside = true; home.out[good]++; } },
          { k: 'work', t: 1.5 },
        ];
        return;
      }
      case 'forester': {
        const at = this.findTile(home, r, this.plantable, true);
        if (!at) return rest(4, 'No free ground to plant on');
        home.status = 'Planting a tree';
        const i = this.claim(s, at);
        const tile = this.world.at(at.x, at.y);
        s.tasks = [
          { k: 'walk', ...at },
          { k: 'work', t: 2.5, anim: 'plant' },
          { k: 'do', f: () => {
            this.claimed.delete(i);
            if (!tile.tree && !tile.crop && !tile.b && !tile.road && !tile.flag) {
              tile.tree = 0.05;
              tile.conifer = Math.random() < 0.4;
            }
          } },
          { k: 'walk', x: home.x, y: home.y },
          { k: 'do', f: () => { s.onAbort = null; s.inside = true; } },
          { k: 'work', t: 4 },
        ];
        return;
      }
      case 'fisher': {
        if (home.out.fish >= PILE) return rest(2, 'Flag is full, waiting for a carrier');
        const at = this.findTile(home, r, (t, x, y) => t.t !== 'water' && this.passable(x, y) && this.near(x, y, 1, (n) => n.t === 'water'));
        if (!at) return rest(3, 'No shore in range');
        home.status = 'Fishing';
        const i = this.claim(s, at);
        s.tasks = [
          { k: 'walk', ...at },
          { k: 'work', t: 6, anim: 'fish' },
          { k: 'do', f: () => { this.claimed.delete(i); s.carrying = 'fish'; } },
          { k: 'walk', x: home.x, y: home.y },
          { k: 'do', f: () => { s.carrying = null; s.onAbort = null; s.inside = true; home.out.fish++; } },
          { k: 'work', t: 2 },
        ];
        return;
      }
      case 'farmer': {
        // Harvest ripe grain first, then sow new fields.
        const ripe = home.out.grain < PILE ? this.findTile(home, r, (t) => t.crop >= 1) : null;
        const at = ripe ?? this.findTile(home, r, this.plantable, true);
        if (!at) return rest(3, home.out.grain >= PILE ? 'Flag is full, waiting for a carrier' : 'Waiting for the grain to ripen');
        home.status = ripe ? 'Harvesting grain' : 'Sowing grain';
        const i = this.claim(s, at);
        const tile = this.world.at(at.x, at.y);
        s.tasks = [
          { k: 'walk', ...at },
          { k: 'work', t: ripe ? 3 : 2.5, anim: ripe ? 'reap' : 'plant' },
          { k: 'do', f: () => {
            this.claimed.delete(i);
            if (ripe && tile.crop >= 1) {
              tile.crop = 0;
              s.carrying = 'grain';
            } else if (!ripe && !tile.crop && !tile.tree && !tile.b && !tile.road && !tile.flag) tile.crop = 0.02;
          } },
          { k: 'walk', x: home.x, y: home.y },
          { k: 'do', f: () => {
            if (s.carrying) home.out.grain++;
            s.carrying = null;
            s.onAbort = null;
            s.inside = true;
          } },
          { k: 'work', t: 1.5 },
        ];
        return;
      }
      case 'sawyer':
      case 'miller':
      case 'baker':
      case 'miner': {
        const rc = RECIPES[home.type]!;
        if (home.out[rc.to] >= PILE) return rest(2, 'Flag is full, waiting for a carrier');
        const g = rc.from.find((g) => home.stock[g] > 0);
        if (!g) return rest(1, rc.waiting);
        home.status = rc.doing;
        s.tasks = [
          { k: 'do', f: () => { home.stock[g]--; home.busy = true; home.using = g; } },
          { k: 'work', t: rc.t },
          { k: 'do', f: () => { home.out[rc.to] += rc.n; home.busy = false; home.using = null; } },
        ];
        return;
      }
      case 'scout':
        return rest(5, 'Keeping watch over your land');
    }
  }

  // A good waiting at one end of road `r` (0 = flag a, 1 = flag b) that this road should take.
  private cargo(r: Road, end: 0 | 1) {
    const from = this.flags.get(end ? r.b : r.a)!, to = this.flags.get(end ? r.a : r.b)!;
    return from.items.find((it) => {
      const d = this.buildings.get(it.dest);
      if (!d || d.flag === from.id) return false; // arrived; the dispatcher takes it inside
      return this.nextRoad(from, d.flag) === r.id && (to.items.length < FLAG_CAP || d.flag === to.id);
    });
  }

  // A road carrier takes one good at a time from one end of their road to the other.
  private carry(s: Settler) {
    const r = this.roads.get(s.home);
    if (!r || !s.atWork) return;
    const last = r.path.length - 1;
    for (const end of [0, 1] as const) {
      const item = this.cargo(r, end);
      if (!item) continue;
      const from = this.flags.get(end ? r.b : r.a)!, to = this.flags.get(end ? r.a : r.b)!;
      const i = end ? last : 0, j = end ? 0 : last;
      s.tasks = [
        { k: 'walk', ...r.path[i], via: this.along(r, s.ri, i) },
        { k: 'do', f: () => {
          s.ri = i;
          const k = from.items.indexOf(item);
          if (k < 0 || !item.dest) return false;
          from.items.splice(k, 1);
          s.item = item;
          s.carrying = item.g;
        } },
        { k: 'walk', ...r.path[j], via: this.along(r, i, j) },
        { k: 'do', f: () => {
          s.ri = j;
          s.since = this.time;
          to.items.push(item);
          s.item = null;
          s.carrying = null;
        } },
      ];
      return;
    }
    // Nothing to carry for a while: free the road and go home, so the settler can take other work.
    if (this.time - s.since >= CARRIER_REST) {
      r.carrier = 0;
      s.home = 0;
      s.atWork = false;
      s.onAbort = () => this.despawn(s);
      s.tasks = [{ k: 'walk', x: this.hq.x, y: this.hq.y }, { k: 'do', f: () => this.despawn(s) }];
      return;
    }
    const mid = r.path.length >> 1;
    s.tasks = s.ri === mid
      ? [{ k: 'work', t: 0.3 }]
      : [{ k: 'walk', ...r.path[mid], via: this.along(r, s.ri, mid) }, { k: 'do', f: () => { s.ri = mid; } }];
  }

  private along(r: Road, i: number, j: number) {
    return i <= j ? r.path.slice(i + 1, j + 1) : r.path.slice(j, i).reverse();
  }

  private claim(s: Settler, at: P) {
    const i = at.y * W + at.x;
    this.claimed.add(i);
    s.onAbort = () => {
      this.claimed.delete(i);
      this.snubbed.set(i, this.time + 30); // couldn't get there; try elsewhere for a while
      s.carrying = null;
    };
    return i;
  }

  // Free grass in your land where a tree or grain can grow.
  private plantable = (t: Tile, x: number, y: number) =>
    t.t === 'grass' && !t.tree && !t.crop && !t.rock && !t.b && !t.road && !t.flag
    && !!this.world.territory[y * W + x] && !this.besideBuildingOrFlag(x, y);

  // Trees next to a flag could wall it in, so nothing is planted there.
  private besideBuildingOrFlag(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!this.world.inside(x + dx, y + dy)) continue;
        const t = this.world.at(x + dx, y + dy);
        if (t.b || t.flag) return true;
      }
    return false;
  }

  private findTile(b: Building, r: number, ok: (t: Tile, x: number, y: number) => boolean, random = false): P | null {
    let best: P | null = null, bd = Infinity;
    const cands: P[] = [];
    for (let y = b.y - r; y <= b.y + r; y++) {
      for (let x = b.x - r; x <= b.x + r; x++) {
        if (!this.world.inside(x, y)) continue;
        const d = Math.hypot(x - b.x, y - b.y);
        const i = y * W + x;
        if (d > r || this.claimed.has(i) || (this.snubbed.get(i) ?? 0) > this.time) continue;
        if (!ok(this.world.at(x, y), x, y)) continue;
        if (random) cands.push({ x, y });
        else if (d < bd) { bd = d; best = { x, y }; }
      }
    }
    return random ? cands[Math.floor(Math.random() * cands.length)] ?? null : best;
  }
}
