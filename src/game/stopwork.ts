// Stopping work at a hut: its worker walks home, and nobody is sent there until you resume work.
// The hut keeps its tool. Use it when settlers run short, to free a worker for another hut.
import { BDEFS, RECIPES } from './defs';
import { builtStatus } from './construction';
import type { Game } from './game';
import { baseOf, sendHome } from './settlers';
import { dropTool } from './tools';
import type { Building, Settler } from './types';

// Only a finished hut with a worker can stop work. Stores and houses have no worker.
export const canStop = (b: Building) => b.built && !!BDEFS[b.type].worker;

// Stop work at hut `b`. Returns why it can't, or null.
export function stopWork(g: Game, b: Building): string | null {
  if (!canStop(b)) return 'Only a finished hut with a worker can stop work';
  if (b.stopped) return 'Work is already stopped';
  b.stopped = true;
  const s = g.settlers.get(b.worker);
  if (s) release(g, b, s);
  // A workshop that was mid-work gets its inputs back.
  if (b.busy && b.using) {
    b.stock[b.using]++;
    const also = RECIPES[b.type]?.with;
    if (also) b.stock[also]++;
  }
  Object.assign(b, { worker: 0, busy: false, using: null, hungry: false, status: builtStatus(b) });
  return null;
}

// Resume work at hut `b`. Returns why it can't, or null. A worker comes at the next chance.
export function resumeWork(_g: Game, b: Building): string | null {
  if (!b.stopped) return 'Work is not stopped';
  b.stopped = false;
  b.status = builtStatus(b);
  return null;
}

// Send the worker of stopped hut `b` home. A good in their hands stays at the hut.
function release(g: Game, b: Building, s: Settler) {
  if (s.carrying && s.carrying !== 'tool') {
    b.out[s.carrying]++;
    s.carrying = null;
  }
  dropTool(g, s, baseOf(g, s)); // a worker still on the way takes back the tool they fetched
  s.onAbort?.(); // frees the tile they were heading to. A worker still on the way goes straight back inside.
  s.onAbort = null;
  if (!g.settlers.has(s.id)) return;
  Object.assign(s, { home: 0, path: null, walking: false, inside: false, asleep: undefined, feast: undefined });
  sendHome(g, s);
}
