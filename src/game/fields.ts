// Farm fields: the tiles a farm keeps for its grain, so nothing else can take them.
import type { P } from '../path';
import { W } from '../world';
import { BDEFS, FARM_FIELDS } from './defs';
import type { Game } from './game';
import type { Building } from './types';

// The fields a farm at (x, y) would take: the nearest free grass in its reach. Tiles next to the
// farm or its flag stay free, so the farm and its flag can always be reached. `withCrops` lets
// tiles that already grow grain count, for farms from saves made before fields.
export function pickFields(g: Game, x: number, y: number, withCrops = false): P[] {
  const r = BDEFS.farm.radius;
  const found: (P & { d: number })[] = [];
  for (let ty = y - r; ty <= y + r; ty++)
    for (let tx = x - r; tx <= x + r; tx++) {
      const d = Math.hypot(tx - x, ty - y);
      if (d > r || !g.world.inside(tx, ty) || !g.world.territory[ty * W + tx]) continue;
      if (Math.abs(tx - x) <= 1 && ty >= y - 1 && ty <= y + 2) continue; // next to the farm or its flag
      const t = g.world.at(tx, ty);
      if (t.t !== 'grass' || t.tree || t.rock || t.b || t.road || t.flag || t.field) continue;
      if (t.crop && !withCrops) continue;
      if (besideOther(g, tx, ty)) continue;
      found.push({ x: tx, y: ty, d });
    }
  found.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  return found.slice(0, FARM_FIELDS).map(({ x, y }) => ({ x, y }));
}

// Next to some other building or flag, where fields could wall it in.
function besideOther(g: Game, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!g.world.inside(x + dx, y + dy)) continue;
      const t = g.world.at(x + dx, y + dy);
      if (t.b || t.flag) return true;
    }
  return false;
}

// Give farm `b` its fields.
export function claimFields(g: Game, b: Building, withCrops = false) {
  for (const p of pickFields(g, b.x, b.y, withCrops)) g.world.at(p.x, p.y).field = b.id;
}
