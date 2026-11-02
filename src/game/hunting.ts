// Hunting: a hunter stalks a deer or hare near the hut and brings home meat, and caught animals slowly come back.
import { BDEFS, Good } from './defs';
import { addAnimal, openSpot } from './animals';
import type { Game } from './game';
import type { Animal, AnimalKind, Building, Settler, Task } from './types';
import { hypot } from '../math/exact';

export const HUNT_RANGE = BDEFS.hunter.radius;
export const ANIMAL_RETURN = 60; // seconds until a caught animal is replaced by a new one
const PREY: AnimalKind[] = ['deer', 'hare'];
const AIM = 2.5; // seconds the hunter takes aim before the catch
const spared = new WeakMap<Animal, number>(); // animals a hunter could not reach -> game time to try again

// The tasks for one hunt, or null when no prey is in range.
export function hunt(g: Game, s: Settler, home: Building, make: (good: Good) => void): Task[] | null {
  const prey = nearestPrey(g, home);
  if (!prey) return null;
  stalk(prey, s);
  s.onAbort = () => {
    if (prey.hunter === s.id) prey.hunter = 0;
    spared.set(prey, g.time + 30); // couldn't get there; hunt something else for a while
    s.carrying = null;
  };
  return [
    { k: 'walk', x: Math.round(prey.x), y: Math.round(prey.y), adjacent: true },
    { k: 'work', t: AIM, anim: 'hunt' },
    { k: 'do', f: () => {
      if (g.animals.get(prey.id) !== prey) return false;
      g.animals.delete(prey.id);
      g.caught.push({ kind: prey.kind, home: prey.home });
      s.carrying = 'meat';
    } },
    { k: 'walk', x: home.x, y: home.y },
    { k: 'do', f: () => { s.carrying = null; s.onAbort = null; s.inside = true; make('meat'); } },
    { k: 'work', t: 2 },
  ];
}

// The animal stops where it is and stays still until it is caught.
function stalk(a: Animal, s: Settler) {
  a.hunter = s.id;
  a.path = null;
  a.fleeing = false;
}

function nearestPrey(g: Game, b: Building) {
  let best: Animal | null = null, bd = Infinity;
  for (const a of g.animals.values()) {
    if (!PREY.includes(a.kind) || a.hunter || (spared.get(a) ?? 0) > g.time) continue;
    const d = hypot(a.x - b.x, a.y - b.y);
    if (d <= HUNT_RANGE && d < bd) { bd = d; best = a; }
  }
  return best;
}

// Every ANIMAL_RETURN seconds while the island has fewer animals than it began with, one comes back.
// It comes back where a caught animal of its kind lived, so a hunter's meadow fills up again.
export function regrow(g: Game, dt: number) {
  const have: Record<AnimalKind, number> = { deer: 0, hare: 0, fox: 0 };
  for (const a of g.animals.values()) have[a.kind]++;
  const short = (Object.keys(have) as AnimalKind[]).find((k) => have[k] < g.wildCount[k]);
  if (!short) {
    g.wildT = 0;
    return;
  }
  g.wildT += dt;
  if (g.wildT < ANIMAL_RETURN) return;
  const i = g.caught.findIndex((c) => c.kind === short);
  const old = i >= 0 ? g.caught.splice(i, 1)[0].home : null;
  const at = old && g.passable(old.x, old.y) ? old : openSpot(g, short, g.rand);
  if (!at) return; // try again next step
  g.wildT = 0;
  addAnimal(g, short, at.x, at.y, g.rand);
}
