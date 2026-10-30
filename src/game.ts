import { World, W, Tile } from './world';
import { findPath, P } from './path';

export type Good = 'log' | 'plank' | 'stone';
export const GOODS: Good[] = ['log', 'plank', 'stone'];
export type Bag = Record<Good, number>;
export const bag = (p: Partial<Bag> = {}): Bag => ({ log: 0, plank: 0, stone: 0, ...p });

export type Role = 'carrier' | 'builder' | 'woodcutter' | 'forester' | 'stonecutter' | 'sawyer' | 'scout';
export type BType = 'hq' | 'woodcutter' | 'forester' | 'quarry' | 'sawmill' | 'lookout';
export type Anim = '' | 'chop' | 'mine' | 'hammer' | 'plant';

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
};
export const BUILDABLE: BType[] = ['woodcutter', 'forester', 'quarry', 'sawmill', 'lookout'];

export interface Building {
  id: number;
  type: BType;
  x: number;
  y: number;
  built: boolean;
  progress: number; // construction 0..1
  stock: Bag; // construction materials or production inputs (the HQ's warehouse)
  out: Bag; // finished goods waiting for a carrier
  incoming: Bag; // goods a carrier is on the way with
  reserved: Bag; // goods a carrier is on the way to fetch
  worker: number;
  builder: number;
  busy: boolean;
  status: string;
}

type Task =
  | { k: 'walk'; x: number; y: number; adjacent?: boolean }
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
  home: number;
  inside: boolean;
  atWork: boolean;
  returning: boolean;
  walking: boolean;
  anim: Anim;
  facing: 1 | -1;
  onAbort: (() => void) | null;
}

const SPEED = 1.7; // tiles per second
const PILE = 4; // max finished goods a hut keeps before its worker pauses

export class Game {
  world: World;
  buildings = new Map<number, Building>();
  settlers = new Map<number, Settler>();
  hq: Building;
  pool = 18; // idle settlers inside the HQ
  time = 0;
  toasts: string[] = [];
  private nextId = 1;
  private claimed = new Set<number>(); // tiles a worker is heading to
  private snubbed = new Map<number, number>(); // unreachable tiles -> retry time
  private dispatchT = 0;
  private growT = 0;

  constructor(seed: number) {
    this.world = new World(seed);
    const { x, y } = this.world.start;
    this.hq = this.addBuilding('hq', x, y);
    this.hq.built = true;
    this.hq.progress = 1;
    this.hq.stock = bag({ log: 6, plank: 24, stone: 14 });
    this.computeTerritory();
  }

  get population() {
    return this.pool + this.settlers.size;
  }

  passable = (x: number, y: number) => {
    const t = this.world.at(x, y);
    return t.t !== 'water' && t.t !== 'mountain' && t.tree < 0.5 && t.rock === 0 && t.b === 0;
  };

  canPlace(type: BType, x: number, y: number): string | null {
    if (!this.world.inside(x, y)) return 'Outside the map';
    const t = this.world.at(x, y);
    if (t.b) return 'Occupied';
    if (!this.world.territory[y * W + x]) return 'Outside your land';
    if (t.t !== 'grass') return 'Needs flat grass';
    if (t.tree) return 'A tree is in the way';
    if (t.rock) return 'A boulder is in the way';
    let access = false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && this.world.inside(x + dx, y + dy) && this.passable(x + dx, y + dy)) access = true;
    if (!access) return 'No free tile to reach it';
    if (!findPath(this.hq.x, this.hq.y, x, y, this.passable)) return 'Settlers cannot walk there';
    return BDEFS[type] ? null : 'Unknown building';
  }

  place(type: BType, x: number, y: number) {
    const b = this.addBuilding(type, x, y);
    b.status = 'Waiting for a builder';
    return b;
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
      this.growT = 1;
      for (const t of this.world.tiles) if (t.tree > 0 && t.tree < 1) t.tree = Math.min(1, t.tree + 1 / 40);
    }
    for (const b of this.buildings.values()) if (!b.built) this.construct(b, dt);
    for (const s of this.settlers.values()) this.step(s, dt);
  }

  // --- logistics -----------------------------------------------------------

  private want(b: Building, g: Good) {
    if (!b.built) return BDEFS[b.type].cost[g] ?? 0;
    if (b.type === 'sawmill' && g === 'log') return PILE;
    return 0;
  }

  private avail(b: Building, g: Good) {
    return (b === this.hq ? b.stock[g] : b.built ? b.out[g] : 0) - b.reserved[g];
  }

  private dispatch() {
    // Builders and workers come out of the HQ for every site and hut that lacks one.
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
    // Deliver what buildings ask for, from the nearest source.
    for (const b of this.buildings.values()) {
      for (const g of GOODS) {
        let missing = this.want(b, g) - b.stock[g] - b.incoming[g];
        while (missing-- > 0) {
          const src = this.nearest(b, (o) => o !== b && this.avail(o, g) > 0);
          if (!src) break;
          const c = this.findCarrier(src);
          if (!c) return;
          this.haul(c, src, b, g);
        }
      }
    }
    // Anything left in a hut goes home to the HQ.
    for (const b of this.buildings.values()) {
      if (b === this.hq || !b.built) continue;
      for (const g of GOODS) {
        while (this.avail(b, g) > 0) {
          const c = this.findCarrier(b);
          if (!c) return;
          this.haul(c, b, this.hq, g);
        }
      }
    }
  }

  private nearest(to: P, ok: (b: Building) => boolean) {
    let best: Building | null = null, bd = Infinity;
    for (const b of this.buildings.values()) {
      if (!ok(b)) continue;
      const d = Math.hypot(b.x - to.x, b.y - to.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private findCarrier(near: P) {
    let best: Settler | null = null, bd = Infinity;
    for (const s of this.settlers.values()) {
      if (s.role !== 'carrier' || (s.tasks.length && !s.returning)) continue;
      const d = Math.hypot(s.x - near.x, s.y - near.y);
      if (d < bd) { bd = d; best = s; }
    }
    if (this.pool > 0 && Math.hypot(this.hq.x - near.x, this.hq.y - near.y) < bd) return this.takeSettler('carrier');
    if (best) {
      best.tasks = [];
      best.path = null;
      best.walking = false;
      best.returning = false;
    }
    return best;
  }

  private haul(c: Settler, src: Building, dst: Building, g: Good) {
    src.reserved[g]++;
    dst.incoming[g]++;
    let picked = false;
    c.onAbort = () => {
      if (picked) this.hq.stock[g]++; // dropped goods find their way back to the HQ
      else src.reserved[g]--;
      dst.incoming[g]--;
      c.carrying = null;
    };
    c.tasks = [
      { k: 'walk', x: src.x, y: src.y },
      { k: 'do', f: () => {
        src.reserved[g]--;
        if (src === this.hq) src.stock[g]--; else src.out[g]--;
        picked = true;
        c.carrying = g;
      } },
      { k: 'walk', x: dst.x, y: dst.y },
      { k: 'do', f: () => {
        dst.incoming[g]--;
        dst.stock[g]++;
        c.carrying = null;
        c.onAbort = null;
      } },
    ];
  }

  // --- buildings -----------------------------------------------------------

  private addBuilding(type: BType, x: number, y: number) {
    const b: Building = {
      id: this.nextId++, type, x, y, built: false, progress: 0,
      stock: bag(), out: bag(), incoming: bag(), reserved: bag(),
      worker: 0, builder: 0, busy: false, status: '',
    };
    this.buildings.set(b.id, b);
    this.world.at(x, y).b = b.id;
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
      b.status = 'Waiting for materials';
      return;
    }
    builder.anim = 'hammer';
    b.status = 'Under construction';
    b.progress = Math.min(cap, b.progress + dt / def.buildTime);
    if (b.progress < 1) return;

    b.built = true;
    b.stock = bag();
    b.builder = 0;
    b.status = 'Waiting for a worker';
    builder.atWork = false;
    builder.anim = '';
    builder.tasks = [{ k: 'walk', x: this.hq.x, y: this.hq.y }, { k: 'do', f: () => this.despawn(builder) }];
    if (b.type === 'lookout') this.computeTerritory();
    this.toasts.push(`${def.icon} ${def.name} finished`);
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
      id: this.nextId++, role, x: this.hq.x, y: this.hq.y, path: null, tasks: [], carrying: null,
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
        const p = findPath(Math.round(s.x), Math.round(s.y), t.x, t.y, this.passable);
        if (!p) return this.abort(s);
        if (t.adjacent) p.pop();
        s.path = p;
        s.inside = false;
      }
      s.walking = true;
      s.anim = '';
      let left = SPEED * dt;
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
    if (s.role === 'carrier') {
      if (s.returning) return;
      s.returning = true;
      s.tasks = [{ k: 'walk', x: this.hq.x, y: this.hq.y }, { k: 'do', f: () => this.despawn(s) }];
      return;
    }
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
        if (home.out[good] >= PILE) return rest(2, 'Waiting for a carrier');
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
        const at = this.findTile(home, r, (t, x, y) => t.t === 'grass' && !t.tree && !t.rock && !t.b
          && !!this.world.territory[y * W + x] && !this.besideBuilding(x, y), true);
        if (!at) return rest(4, 'No free ground to plant on');
        home.status = 'Planting a tree';
        const i = this.claim(s, at);
        const tile = this.world.at(at.x, at.y);
        s.tasks = [
          { k: 'walk', ...at },
          { k: 'work', t: 2.5, anim: 'plant' },
          { k: 'do', f: () => {
            this.claimed.delete(i);
            if (!tile.tree && !tile.b) {
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
      case 'sawyer': {
        if (home.out.plank >= PILE) return rest(2, 'Waiting for a carrier');
        if (home.stock.log < 1) return rest(1, 'Waiting for logs');
        home.status = 'Sawing planks';
        s.tasks = [
          { k: 'do', f: () => { home.stock.log--; home.busy = true; } },
          { k: 'work', t: 5 },
          { k: 'do', f: () => { home.out.plank++; home.busy = false; } },
        ];
        return;
      }
      case 'scout':
        return rest(5, 'Keeping watch over your land');
    }
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

  private besideBuilding(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.world.inside(x + dx, y + dy) && this.world.at(x + dx, y + dy).b) return true;
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
