// Demolishing a building: taking it off the map and sending its goods and people back to the HQ.
import { BDEFS, GOODS } from './defs';
import { cancel } from './carriers';
import type { Game } from './game';
import { computeTerritory } from './land';
import { sendHome } from './settlers';
import type { Building } from './types';

export function demolish(g: Game, b: Building): string | null {
  if (b === g.hq) return 'The HQ cannot be demolished';
  for (const s of g.settlers.values()) {
    if (s.job?.from !== b.id && s.job?.to !== b.id) continue;
    cancel(g, s); // a good already picked up goes into the HQ
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
  for (const k of GOODS) g.hq.stock[k] += b.stock[k] + b.out[k];
  g.flags.get(b.flag)!.building = 0; // the flag and its roads stay
  g.world.at(b.x, b.y).b = 0;
  g.buildings.delete(b.id);
  if (b.type === 'lookout' && b.built) computeTerritory(g);
  g.toasts.push(`${BDEFS[b.type].icon} ${BDEFS[b.type].name} demolished`);
  return null;
}
