// Pack donkeys: when many goods wait to move, donkeys join the carriers and carry two goods at once.
// They are not settlers. They live in a stall at their home, so they never take a settler from it.
import { send, nearestFree } from './carriers';
import type { Game } from './game';
import { homeOf } from './homes';
import type { Job, Settler } from './types';

export const DONKEY_BUSY = 8; // goods waiting to move before donkeys help
export const DONKEY_LOAD = 2; // goods a donkey carries at once
const BUILDINGS_PER_DONKEY = 4;

// How many donkeys may be out at once: one for every 4 buildings, counting the HQ.
export const donkeyCap = (g: Game) => Math.ceil(g.buildings.size / BUILDINGS_PER_DONKEY);

// Send a donkey on trip `job`, which carries DONKEY_LOAD goods. Returns false when no donkey can go.
export function hireDonkey(g: Game, job: Job): boolean {
  const from = g.buildings.get(job.from)!;
  const base = homeOf(g, from);
  if (!base) return false;
  const d = nearestFree([...g.donkeys.values()].filter((d) => d.base === base.id), from)
    ?? (g.donkeys.size < donkeyCap(g) ? newDonkey(g, base.id, base.x, base.y) : null);
  if (!d) return false;
  send(g, d, { ...job, n: DONKEY_LOAD });
  return true;
}

// A donkey steps out of its stall at home `base`.
function newDonkey(g: Game, base: number, x: number, y: number): Settler {
  const d: Settler = {
    id: g.nextId++, role: 'carrier', donkey: true, x, y, path: null, tasks: [], carrying: null, job: null,
    home: 0, base, inside: false, atWork: false, returning: false, walking: false, anim: '', facing: 1, onAbort: null,
  };
  g.donkeys.set(d.id, d);
  if (!g.metDonkey) g.toasts.push('🫏 A pack donkey joins your carriers');
  g.metDonkey = true;
  return d;
}
