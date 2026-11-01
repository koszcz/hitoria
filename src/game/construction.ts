// Placing buildings and building them: where they may go, and how builders turn materials into a building.
import { findPath } from '../path';
import { W } from '../world';
import { BDEFS, BType, FARM_FIELDS, GOODS, MINES, ORE_MINES, bag } from './defs';
import { claimFields, pickFields } from './fields';
import type { Game } from './game';
import { computeTerritory, isDoorstep, near, nearOre, openGround, passable } from './land';
import { dockAt } from './harbour';
import { noteRichMine } from './geology';
import { homeOf, homes } from './homes';
import { sendHome } from './settlers';
import type { Building } from './types';

export function canPlace(g: Game, type: BType, x: number, y: number): string | null {
  if (!g.world.inside(x, y) || !g.world.inside(x, y + 1)) return 'Outside the map';
  const t = g.world.at(x, y);
  if (t.b) return 'Occupied';
  if (isDoorstep(g, x, y)) return 'In front of the door of another building';
  if (!g.world.territory[y * W + x]) return 'Outside your land';
  if (t.t !== 'grass') return 'Needs flat grass';
  if (t.tree) return 'A tree is in the way';
  if (t.rock) return 'A boulder is in the way';
  if (t.field) return 'This is a farm field';
  if (MINES.includes(type) && !near(g, x, y, BDEFS[type].radius, (n) => n.t === 'mountain')) return 'Must be next to a mountain';
  if (type === 'geologist' && !near(g, x, y, BDEFS.geologist.radius, (n) => n.t === 'mountain')) return 'Must be near a mountain';
  if (ORE_MINES.includes(type) && !nearOre(g, x, y, BDEFS[type].radius)) return 'Coal and iron lie only in the mountains of the other island';
  if (type === 'fisher' && !near(g, x, y, BDEFS.fisher.radius, (n) => n.t === 'water')) return 'Must be near water';
  if (type === 'harbour' && !dockAt(g, x, y)) return 'Must be on the shore by open water';
  const fields = type === 'farm' ? pickFields(g, x, y) : [];
  if (type === 'farm' && fields.length < FARM_FIELDS) return 'No room for its fields';
  if (!openGround(g, x, y + 1) || !g.world.territory[(y + 1) * W + x]) return 'No room in front of its door';
  // Players can't fell trees themselves, so a door walled in by trees would never be reached.
  // Saplings count too, because they grow into trees.
  const reach = (tx: number, ty: number) => (tx !== x || ty !== y) && passable(g, tx, ty) && !g.world.at(tx, ty).tree;
  const fromHome = (h: Building) => !!findPath(h.x, h.y + 1, x, y + 1, reach);
  if (!homes(g).some(fromHome)) return 'Settlers cannot walk there';
  return BDEFS[type] ? null : 'Unknown building';
}

// A new building site. Settlers walk to it across the open ground.
export function place(g: Game, type: BType, x: number, y: number) {
  const b = placeSite(g, type, x, y);
  noteRichMine(g, b);
  return b;
}

// A new building site, with no word yet about a rich spot.
export function placeSite(g: Game, type: BType, x: number, y: number) {
  const b = addBuilding(g, type, x, y);
  b.status = 'Waiting for a builder';
  if (type === 'farm') claimFields(g, b);
  return b;
}

export function addBuilding(g: Game, type: BType, x: number, y: number) {
  const b: Building = {
    id: g.nextId++, type, x, y, built: false, progress: 0,
    stock: bag(), out: bag(), incoming: bag(), sending: bag(),
    worker: 0, builder: 0, busy: false, using: null, status: '', born: 0, grow: 0,
  };
  g.buildings.set(b.id, b);
  Object.assign(g.world.at(x, y), { b: b.id, crop: 0 });
  return b;
}

export function builtStatus(b: Building) {
  return BDEFS[b.type].worker ? 'Waiting for a worker' : 'Storing goods';
}

// Can settlers walk from a home to the building?
export function linked(g: Game, b: Building) {
  return !!homeOf(g, b);
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
