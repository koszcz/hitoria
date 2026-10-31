// Sending settlers out of the HQ: a carrier for every busy road, a builder for every site, a worker for every hut.
import { BDEFS } from './defs';
import { cargo } from './carriers';
import { linked } from './construction';
import type { Game } from './game';
import { despawn, giveUp, takeSettler } from './settlers';
import type { Building } from './types';

export function staff(g: Game) {
  for (const r of g.roads.values()) {
    if (r.carrier || !cargo(g, r, 0) && !cargo(g, r, 1)) continue;
    const s = takeSettler(g, 'carrier');
    if (!s) break;
    r.carrier = s.id;
    s.home = r.id;
    const mid = r.path.length >> 1;
    s.onAbort = () => { r.carrier = 0; despawn(g, s); };
    s.tasks = [{ k: 'walk', ...r.path[mid] }, { k: 'do', f: () => { s.atWork = true; s.ri = mid; s.since = g.time; s.onAbort = null; } }];
  }
  // Houses come first, because only they bring in more settlers.
  for (const b of g.buildings.values()) if (b.type === 'house' && !sendBuilder(g, b)) break;
  for (const b of g.buildings.values()) {
    if (!sendBuilder(g, b)) break;
    const role = BDEFS[b.type].worker;
    if (b.built && role && !b.worker) {
      const s = takeSettler(g, role);
      if (!s) break;
      b.worker = s.id;
      s.home = b.id;
      s.onAbort = () => giveUp(g, s, b, 'worker');
      s.tasks = [{ k: 'walk', x: b.x, y: b.y }, { k: 'do', f: () => { s.inside = true; s.onAbort = null; } }];
    }
  }
}

// Send a builder to a site that is joined to the HQ and has none yet.
// Returns false when the HQ has nobody left to send.
function sendBuilder(g: Game, b: Building) {
  if (b.built || b.builder || !linked(g, b)) return true;
  const s = takeSettler(g, 'builder');
  if (!s) return false;
  b.builder = s.id;
  s.home = b.id;
  s.onAbort = () => giveUp(g, s, b, 'builder');
  s.tasks = [{ k: 'walk', x: b.x, y: b.y, adjacent: true }, { k: 'do', f: () => { s.atWork = true; s.onAbort = null; } }];
  return true;
}
