// Carriers: each one fetches a good from a building and walks it on foot to the building
// that needs it. With no trip to make, a carrier walks back to its home and can be sent out again on the way.
// Pack donkeys make the same trips with two goods at a time; see donkeys.ts.
import type { Game } from './game';
import { homeOf } from './homes';
import { baseOf, despawn, takeSettler } from './settlers';
import { isStore } from './stores';
import type { Building, Job, Settler, Task } from './types';

const carriers = (g: Game) => [...g.settlers.values()].filter((s) => s.role === 'carrier');

// Send a carrier on trip `job`. Returns false when there is nobody to send.
// At most one carrier per building is out at a time, so carriers never use up every settler.
export function hire(g: Game, job: Job): boolean {
  const from = g.buildings.get(job.from)!;
  const all = carriers(g);
  // Only carriers from the home that can walk to the trip, so nobody is sent across the sea.
  const base = homeOf(g, from);
  const s = nearestFree(all.filter((c) => c.base === base?.id), from) ?? (all.length < g.buildings.size ? takeSettler(g, 'carrier', from) : null);
  if (!s) return false;
  send(g, s, job);
  return true;
}

// Start carrier or donkey `s` on trip `job`: walk to `from`, pick up the goods, walk to `to`, drop them.
export function send(g: Game, s: Settler, job: Job) {
  const from = g.buildings.get(job.from)!, to = g.buildings.get(job.to)!;
  const n = job.n ?? 1;
  from.sending[job.g] += n;
  to.incoming[job.g] += n;
  s.job = job;
  s.path = null;
  s.walking = false;
  s.onAbort = () => { cancel(g, s); leave(g, s); };
  s.tasks = [
    wayTo(from),
    { k: 'do', f: () => {
      from.sending[job.g] -= n;
      if (isStore(from)) from.stock[job.g] -= n;
      else from.out[job.g] -= n;
      s.carrying = job.g;
      s.load = n;
    } },
    wayTo(to),
    { k: 'do', f: () => {
      to.incoming[job.g] -= n;
      to.stock[job.g] += n;
      s.carrying = null;
      s.load = 0;
      s.job = null;
      s.onAbort = null;
    } },
  ];
}

// A carrier with no trip goes back to its home.
export function carry(g: Game, s: Settler) {
  if (s.job) return;
  s.onAbort = () => leave(g, s);
  s.tasks = [wayTo(baseOf(g, s)), { k: 'do', f: () => leave(g, s) }];
}

// Undo a trip that can't be finished. Goods already picked up go into the stock of the carrier's home.
export function cancel(g: Game, s: Settler) {
  const job = s.job;
  if (!job) return;
  const n = job.n ?? 1;
  const from = g.buildings.get(job.from), to = g.buildings.get(job.to);
  if (to) to.incoming[job.g] -= n;
  if (s.carrying) baseOf(g, s).stock[s.carrying] += s.load ?? 1;
  else if (from) from.sending[job.g] -= n;
  s.carrying = null;
  s.load = 0;
  s.job = null;
}

// A carrier goes back inside its home. A donkey goes back to its stall there.
function leave(g: Game, s: Settler) {
  if (s.donkey) g.donkeys.delete(s.id);
  else despawn(g, s);
}

// The free carrier closest to building `b`.
export function nearestFree(all: Settler[], b: Building) {
  let best: Settler | null = null, bd = Infinity;
  for (const s of all) {
    if (s.job) continue;
    const d = Math.hypot(s.x - b.x, s.y - b.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Walk to building `b` the cheapest way on foot. Worn paths are quicker, so carriers keep to them when they help.
function wayTo(b: Building): Task {
  return { k: 'walk', x: b.x, y: b.y };
}
