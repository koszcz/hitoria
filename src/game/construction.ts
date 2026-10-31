// Placing buildings and building them: where they may go, and how builders turn materials into a building.
import { findPath } from '../path';
import { W } from '../world';
import { autoRoad } from './autoroad';
import { BDEFS, BType, FARM_FIELDS, GOODS, MINES, bag } from './defs';
import { claimFields, pickFields } from './fields';
import type { Game } from './game';
import { computeTerritory, flaggable, near, roadable } from './land';
import { ensureFlag } from './roads';
import { sendHome } from './settlers';
import type { Building } from './types';
import { walkDist } from './walking';

export function canPlace(g: Game, type: BType, x: number, y: number): string | null {
  if (!g.world.inside(x, y) || !g.world.inside(x, y + 1)) return 'Outside the map';
  const t = g.world.at(x, y);
  if (t.b || t.flag || t.road) return 'Occupied';
  if (!g.world.territory[y * W + x]) return 'Outside your land';
  if (t.t !== 'grass') return 'Needs flat grass';
  if (t.tree) return 'A tree is in the way';
  if (t.rock) return 'A boulder is in the way';
  if (t.field) return 'This is a farm field';
  if (MINES.includes(type) && !near(g, x, y, BDEFS[type].radius, (n) => n.t === 'mountain')) return 'Must be next to a mountain';
  if (type === 'fisher' && !near(g, x, y, BDEFS.fisher.radius, (n) => n.t === 'water')) return 'Must be near water';
  const fields = type === 'farm' ? pickFields(g, x, y) : [];
  if (type === 'farm' && fields.length < FARM_FIELDS) return 'No room for its fields';
  const front = g.world.at(x, y + 1);
  const flagOk = front.flag ? !g.flags.get(front.flag)!.building : flaggable(g, x, y + 1);
  if (!flagOk) return 'No room for its flag in front';
  // Players can't fell trees themselves, so a flag walled in by trees would never get a road.
  const hq = g.flags.get(g.hq.flag)!;
  const onField = (tx: number, ty: number) => fields.some((p) => p.x === tx && p.y === ty);
  const reach = (tx: number, ty: number) => (tx !== x || ty !== y) && !onField(tx, ty) && (roadable(g, tx, ty) || !!g.world.at(tx, ty).road || !!g.world.at(tx, ty).flag);
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
  if (type === 'farm') claimFields(g, b);
  return b;
}

export function addBuilding(g: Game, type: BType, x: number, y: number) {
  const b: Building = {
    id: g.nextId++, type, x, y, flag: 0, built: false, progress: 0,
    stock: bag(), out: bag(), incoming: bag(), sending: bag(),
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

// Can settlers walk from the HQ to the building?
export function linked(g: Game, b: Building) {
  return b === g.hq || walkDist(g, g.hq, b) < Infinity;
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
    b.status = builder ? 'Builder on the way' : linked(g, b) ? 'Waiting for a free settler' : 'No way to walk to your HQ';
    return;
  }
  if (b.progress >= cap) {
    builder.anim = '';
    if (linked(g, b)) b.status = 'Waiting for materials';
    else {
      // No materials can reach the site, so the builder goes home to help elsewhere.
      b.status = 'No way to walk to your HQ';
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
