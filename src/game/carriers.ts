// Carriers: each one fetches a good from a building and walks it along the roads to the building
// that needs it. With no trip to make, a carrier walks back to the HQ and can be sent out again on the way.
import type { Game } from './game';
import { roadWay } from './routes';
import { despawn, takeSettler } from './settlers';
import { isStore } from './stores';
import type { Building, Job, Settler, Task } from './types';

const carriers = (g: Game) => [...g.settlers.values()].filter((s) => s.role === 'carrier');

// Send a carrier on trip `job`. Returns false when there is nobody to send.
// At most one carrier per building is out at a time, so carriers never use up every settler.
export function hire(g: Game, job: Job): boolean {
  const from = g.buildings.get(job.from)!, to = g.buildings.get(job.to)!;
  const all = carriers(g);
  const s = nearestFree(all, from) ?? (all.length < g.buildings.size ? takeSettler(g, 'carrier') : null);
  if (!s) return false;
  from.sending[job.g]++;
  to.incoming[job.g]++;
  s.job = job;
  s.path = null;
  s.walking = false;
  s.onAbort = () => { cancel(g, s); despawn(g, s); };
  s.tasks = [
    { k: 'do', f: () => { s.tasks.unshift(wayTo(g, s, from)); } },
    { k: 'do', f: () => {
      from.sending[job.g]--;
      if (isStore(from)) from.stock[job.g]--;
      else from.out[job.g]--;
      s.carrying = job.g;
    } },
    { k: 'do', f: () => { s.tasks.unshift(wayTo(g, s, to)); } },
    { k: 'do', f: () => {
      to.incoming[job.g]--;
      to.stock[job.g]++;
      s.carrying = null;
      s.job = null;
      s.onAbort = null;
    } },
  ];
  return true;
}

// A carrier with no trip goes back to the HQ.
export function carry(g: Game, s: Settler) {
  if (s.job) return;
  s.onAbort = () => despawn(g, s);
  s.tasks = [wayTo(g, s, g.hq), { k: 'do', f: () => despawn(g, s) }];
}

// Undo a trip that can't be finished. A good already picked up goes into the HQ's stock.
export function cancel(g: Game, s: Settler) {
  const job = s.job;
  if (!job) return;
  const from = g.buildings.get(job.from), to = g.buildings.get(job.to);
  if (to) to.incoming[job.g]--;
  if (s.carrying) g.hq.stock[s.carrying]++;
  else if (from) from.sending[job.g]--;
  s.carrying = null;
  s.job = null;
}

// The free carrier closest to building `b`.
function nearestFree(all: Settler[], b: Building) {
  let best: Settler | null = null, bd = Infinity;
  for (const s of all) {
    if (s.job) continue;
    const d = Math.hypot(s.x - b.x, s.y - b.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Walk to building `b`: along the roads when standing at a building or a flag, else the shortest way.
function wayTo(g: Game, s: Settler, b: Building): Task {
  const tile = g.world.at(Math.round(s.x), Math.round(s.y));
  const at = tile.b ? g.buildings.get(tile.b) : undefined;
  const start = at ? at.flag : tile.flag;
  const way = start ? roadWay(g, start, b.flag) : null;
  if (!way) return { k: 'walk', x: b.x, y: b.y };
  if (!at) way.shift(); // already standing on the first flag
  return { k: 'walk', x: b.x, y: b.y, via: [...way, { x: b.x, y: b.y }] };
}
