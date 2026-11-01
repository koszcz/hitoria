// The survive winter goal: it watches a whole winter and fails it if a hut worker or miner goes hungry too long.
// Houses don't count: a house waiting for food only waits to grow a settler, and no one in it goes hungry.
import { isWinter } from '../seasons/year';
import type { Game } from './game';
import { eats } from './meals';
import type { Building } from './types';

export const HUNGRY_AFTER = 20; // seconds a worker or miner can go without food before the winter is spoiled

// How the winter goal is going:
// late: a winter was under way when the goal began, so the goal waits for the next one.
// ready: it is not winter, and the next winter will count.
// watch: in a winter that counts, and no one has gone hungry yet.
// hungry: someone went hungry this winter, so the goal waits for the next one.
// done: a whole winter passed with no one hungry.
export type WinterState = 'late' | 'ready' | 'watch' | 'hungry' | 'done';

export const WINTER_NOTES: Record<WinterState, string> = {
  late: 'Winter has begun. Get ready for the next one',
  ready: 'Store food before winter comes',
  watch: 'Winter: no one has gone hungry yet',
  hungry: 'Someone went hungry. Try again next winter',
  done: 'You got through the winter',
};

const MINES = new Set(['mine', 'coalmine', 'ironmine']);
const waiting = (b: Building) =>
  b.built && ((MINES.has(b.type) && b.status === 'Waiting for food') || (eats(b) && !!b.hungry));

// Called often while the winter goal is the goal the player is on.
export function watchWinter(g: Game) {
  const w = g.winter;
  if (w.state === 'done') return;
  if (!isWinter(g.time)) {
    w.state = w.state === 'watch' ? 'done' : 'ready';
    w.since.clear();
    return;
  }
  if (w.state === 'ready') w.state = 'watch';
  if (w.state !== 'watch') return;
  for (const id of w.since.keys()) if (!g.buildings.has(id)) w.since.delete(id);
  for (const b of g.buildings.values()) {
    if (!waiting(b)) {
      w.since.delete(b.id);
      continue;
    }
    const t = w.since.get(b.id);
    if (t === undefined) w.since.set(b.id, g.time);
    else if (g.time - t >= HUNGRY_AFTER) {
      w.state = 'hungry';
      w.since.clear();
      g.toasts.push('🥶 A settler went hungry this winter');
      return;
    }
  }
}
