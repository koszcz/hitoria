// Sleep: after dusk, workers and builders walk to the nearest bed and stay inside until dawn.
// A bed is in the HQ, a landing harbour or a finished house. Carriers and donkeys keep working.
import { isNight } from '../seasons/day';
import type { Game } from './game';
import { isHome } from './homes';
import { joinFeast } from './feast';
import { giveUp } from './settlers';
import type { Building, Settler } from './types';
import { walkFrom } from './walking';

export const ASLEEP = 'Asleep until dawn'; // the status of a hut or site while its worker sleeps

export const night = (g: Game) => isNight(g.time);

// Carriers and donkeys keep going all night. Everyone else sleeps.
const sleeper = (s: Settler) => s.role !== 'carrier' && !s.donkey;

const isBed = (b: Building) => isHome(b) || (b.type === 'house' && b.built);

// Is it night, with every worker and builder in bed? True at night when nobody works at all.
export function allAsleep(g: Game) {
  if (!night(g)) return false;
  for (const s of g.settlers.values()) if (sleeper(s) && !s.asleep) return false;
  return true;
}

// The bed nearest to building `b` on foot, or null if no bed can be reached.
export function bedFor(g: Game, b: Building): Building | null {
  const d = walkFrom(g, b);
  let best: Building | null = null, bd = Infinity;
  for (const h of g.buildings.values()) {
    if (!isBed(h)) continue;
    const dist = d[h.y * g.world.w + h.x];
    if (dist < bd) { bd = dist; best = h; }
  }
  return best;
}

// Send a worker or builder with nothing to do to bed at night, or back to their post at dawn.
// Returns true when it took care of them, so they do no work now.
export function bedtime(g: Game, s: Settler, post: Building): boolean {
  if (night(g)) {
    if (s.asleep) return true;
    if (joinFeast(g, s, post)) return true;
    post.status = ASLEEP;
    s.atWork = false;
    s.anim = '';
    const lieDown = (bed: Building) => {
      s.asleep = bed.id;
      s.inside = true;
      s.onAbort = null;
    };
    // With no bed in reach, the worker sleeps at their post.
    const bed = bedFor(g, post);
    if (!bed) {
      lieDown(post);
      return true;
    }
    s.onAbort = () => lieDown(post);
    s.tasks = [{ k: 'walk', x: bed.x, y: bed.y }, { k: 'do', f: () => lieDown(bed) }];
    return true;
  }
  if (!s.asleep) return false;
  s.asleep = undefined;
  const builder = s.role === 'builder';
  s.onAbort = builder ? () => giveUp(g, s, post, 'builder') : null;
  s.tasks = [
    { k: 'walk', x: post.x, y: post.y, adjacent: builder },
    { k: 'do', f: () => {
      s.onAbort = null;
      if (builder) s.atWork = true;
      else s.inside = true;
    } },
  ];
  return true;
}
