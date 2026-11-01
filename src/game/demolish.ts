// Demolishing a building: taking it off the map and sending its goods and people back to their home.
import { BDEFS, GOODS } from './defs';
import { cancel } from './carriers';
import { freeFields } from './fields';
import type { Game } from './game';
import { homeOf, isHome } from './homes';
import { computeTerritory } from './land';
import { sendHome } from './settlers';
import type { P } from '../path';
import type { Building } from './types';

export function demolish(g: Game, b: Building): string | null {
  if (b === g.hq) return 'The HQ cannot be demolished';
  if (isHome(b)) return 'A landing harbour cannot be demolished';
  const home = homeOf(g, b) ?? g.hq;
  for (const s of g.settlers.values()) {
    if (s.job?.from !== b.id && s.job?.to !== b.id) continue;
    cancel(g, s); // a good already picked up goes into the carrier's home
    s.tasks = [];
    s.path = null;
    s.walking = false;
    s.onAbort = null;
  }
  for (const s of g.settlers.values()) {
    if (s.home !== b.id) continue;
    s.onAbort?.(); // frees the tile a worker was heading to
    s.onAbort = null;
    if (!g.settlers.has(s.id)) continue; // a worker still on the way went straight back inside
    s.home = 0;
    s.path = null;
    s.walking = false;
    s.inside = false;
    sendHome(g, s);
  }
  for (const k of GOODS) home.stock[k] += b.stock[k] + b.out[k];
  if (b.tooled) home.stock.tool++; // the worker brings their tool back
  g.world.at(b.x, b.y).b = 0;
  freeFields(g, b);
  g.buildings.delete(b.id);
  g.walks.delete(b.id);
  if (b.type === 'lookout' && b.built) computeTerritory(g);
  g.toasts.push(`${BDEFS[b.type].icon} ${BDEFS[b.type].name} demolished`);
  return null;
}

// Demolish the building on tile `t`, if there is one.
export function removeAt(g: Game, t: P): string | null {
  const id = g.world.inside(t.x, t.y) ? g.world.at(t.x, t.y).b : 0;
  return id ? demolish(g, g.buildings.get(id)!) : 'Nothing to remove here';
}
