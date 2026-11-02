// The survive winter goal: it watches a whole winter and fails it if a hut worker or miner goes hungry too long.
// Houses don't count: a house waiting for food only waits to grow a settler, and no one in it goes hungry.
// Nights don't count either, because everyone sleeps. On a colony, hunger counts only once the
// colony has its own finished food maker, so a new colony that starves does not spoil the goal.
import { isNight } from '../seasons/day';
import { isWinter } from '../seasons/year';
import { note } from './chronicle';
import type { Game } from './game';
import { isleOf, type Isle } from './islandstock';
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

// The buildings that make the food that workers eat: fish, meat and bread.
const FOOD_MAKERS = new Set(['fisher', 'hunter', 'bakery']);

// The islands where hunger counts for the winter goal: the home island, and each colony with a
// finished food maker of its own.
export function fedIsles(g: Game): Set<Isle> {
  const isles = new Set<Isle>(['home']);
  for (const b of g.buildings.values()) if (b.built && FOOD_MAKERS.has(b.type)) isles.add(isleOf(g, b.x, b.y));
  return isles;
}

export type WinterWatch = { state: WinterState; since: Map<number, number> };

// Follow winter watch `w` one step. Returns true when a whole winter has just passed with no one
// hungry. With `quiet`, it makes no toast when someone goes hungry.
function follow(g: Game, w: WinterWatch, quiet = false): boolean {
  if (!isWinter(g.time)) {
    const calm = w.state === 'watch';
    w.state = 'ready';
    w.since.clear();
    return calm;
  }
  if (w.state === 'ready') w.state = 'watch';
  if (w.state !== 'watch') return false;
  // Workers sleep at night, so no one counts as hungry until dawn.
  if (isNight(g.time)) {
    w.since.clear();
    return false;
  }
  for (const id of w.since.keys()) if (!g.buildings.has(id)) w.since.delete(id);
  const counted = fedIsles(g);
  for (const b of g.buildings.values()) {
    if (!waiting(b) || !counted.has(isleOf(g, b.x, b.y))) {
      w.since.delete(b.id);
      continue;
    }
    const t = w.since.get(b.id);
    if (t === undefined) w.since.set(b.id, g.time);
    else if (g.time - t >= HUNGRY_AFTER) {
      w.state = 'hungry';
      w.since.clear();
      if (!quiet) g.toasts.push('🥶 A settler went hungry this winter');
      return false;
    }
  }
  return false;
}

// Called often while the winter goal is the goal the player is on.
export function watchWinter(g: Game) {
  if (g.winter.state !== 'done' && follow(g, g.winter)) g.winter.state = 'done';
}

// Called often, on any goal. Notes in the chronicle each winter that passed with no one hungry.
export function noteWinters(g: Game) {
  if (follow(g, g.winters, true)) note(g, { what: 'winter' });
}
