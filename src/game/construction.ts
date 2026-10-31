// Placing buildings and building them: where they may go, and how builders turn materials into a building.
import { findPath } from '../path';
import { W } from '../world';
import { autoRoad } from './autoroad';
import { BDEFS, BType, GOODS, bag } from './defs';
import type { Game } from './game';
import { computeTerritory, flaggable, near, roadable } from './land';
import { ensureFlag } from './roads';
import { distTo } from './routes';
import { sendHome } from './settlers';
import type { Building } from './types';

export function canPlace(g: Game, type: BType, x: number, y: number): string | null {
  if (!g.world.inside(x, y) || !g.world.inside(x, y + 1)) return 'Outside the map';
  const t = g.world.at(x, y);
  if (t.b || t.flag || t.road) return 'Occupied';
  if (!g.world.territory[y * W + x]) return 'Outside your land';
  if (t.t !== 'grass') return 'Needs flat grass';
  if (t.tree) return 'A tree is in the way';
  if (t.rock) return 'A boulder is in the way';
  if (type === 'mine' && !near(g, x, y, BDEFS.mine.radius, (n) => n.t === 'mountain')) return 'Must be next to a mountain';
  if (type === 'fisher' && !near(g, x, y, BDEFS.fisher.radius, (n) => n.t === 'water')) return 'Must be near water';
  const front = g.world.at(x, y + 1);
  const flagOk = front.flag ? !g.flags.get(front.flag)!.building : flaggable(g, x, y + 1);
  if (!flagOk) return 'No room for its flag in front';
  // Players can't fell trees themselves, so a flag walled in by trees would never get a road.
  const hq = g.flags.get(g.hq.flag)!;
  const reach = (tx: number, ty: number) => (tx !== x || ty !== y) && (roadable(g, tx, ty) || !!g.world.at(tx, ty).road || !!g.world.at(tx, ty).flag);
  if (!findPath(hq.x, hq.y, x, y + 1, reach)) return 'No road can reach it';
  return BDEFS[type] ? null : 'Unknown building';
}

// A new building site, with its road to your roads if one fits.
export function place(g: Game, type: BType, x: number, y: number) {
  const b = placeSite(g, type, x, y);
  autoRoad(g, b);
  return b;
}

// A new building site with no road yet.
export function placeSite(g: Game, type: BType, x: number, y: number) {
  const b = addBuilding(g, type, x, y);
  b.status = 'Waiting for a builder';
  return b;
}

export function addBuilding(g: Game, type: BType, x: number, y: number) {
  const b: Building = {
    id: g.nextId++, type, x, y, flag: 0, built: false, progress: 0,
    stock: bag(), out: bag(), incoming: bag(),
    worker: 0, builder: 0, busy: false, using: null, status: '', born: 0, grow: 0,
  };
  g.buildings.set(b.id, b);
  Object.assign(g.world.at(x, y), { b: b.id, crop: 0 });
  const f = ensureFlag(g, x, y + 1);
  f.building = b.id;
  b.flag = f.id;
  return b;
}

export function builtStatus(b: Building) {
  return BDEFS[b.type].worker ? 'Waiting for a worker' : 'Storing goods';
}

// Is the building joined to the HQ by roads?
export function linked(g: Game, b: Building) {
  return distTo(g, b.flag).has(g.hq.flag);
}

export function construct(g: Game, b: Building, dt: number) {
  const def = BDEFS[b.type];
  const builder = g.settlers.get(b.builder);
  let need = 0, have = 0;
  for (const k of GOODS) {
    need += def.cost[k] ?? 0;
    have += Math.min(b.stock[k], def.cost[k] ?? 0);
  }
  const cap = need ? have / need : 1;
  if (!builder?.atWork) {
    b.status = builder ? 'Builder on the way' : linked(g, b) ? 'Waiting for a free settler' : 'Needs a road to your HQ';
    return;
  }
  if (b.progress >= cap) {
    builder.anim = '';
    if (linked(g, b)) b.status = 'Waiting for materials';
    else {
      // No materials can reach the site, so the builder goes home to help elsewhere.
      b.status = 'Needs a road to your HQ';
      b.builder = 0;
      sendHome(g, builder);
    }
    return;
  }
  builder.anim = 'hammer';
  b.status = 'Under construction';
  b.progress = Math.min(cap, b.progress + dt / def.buildTime);
  if (b.progress < 1) return;

  b.built = true;
  b.stock = bag();
  b.builder = 0;
  b.status = builtStatus(b);
  sendHome(g, builder);
  if (b.type === 'lookout') computeTerritory(g);
  g.toasts.push(`${def.icon} ${def.name} finished`);
}
