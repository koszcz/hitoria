// The Feast Square and its wedding feast. You order a feast, carriers bring the food, and at the
// next dusk every worker gathers at the square until midnight. Two new settlers arrive at dawn.
import { BEDTIME, DAY_LENGTH, WAKE, nextDusk } from '../seasons/day';
import { seasonCount } from '../seasons/year';
import type { Good } from './defs';
import type { Game } from './game';
import { addPool, homeOf } from './homes';
import { noteFeast } from './chronicle';
import type { Building, Settler } from './types';
import { walkDist } from './walking';

// The food one wedding feast needs.
export const FEAST_FOOD: Partial<Record<Good, number>> = { fish: 10, bread: 10, meat: 10 };
export const FEAST_NEWCOMERS = 2; // settlers who arrive at dawn after a feast
export const AT_FEAST = 'At the wedding feast'; // the status of a hut or site while its worker feasts
const SPREAD = 2; // how far from the square the guests stand, in tiles

// Seconds from the dusk a feast begins to midnight, when it ends, and to dawn, when the newcomers arrive.
const UNTIL_MIDNIGHT = (1 - BEDTIME) * DAY_LENGTH;
const UNTIL_DAWN = (1 - BEDTIME + WAKE) * DAY_LENGTH;

const squares = (g: Game) => [...g.buildings.values()].filter((b) => b.type === 'square');

// Why square `b` can't hold a feast now, or null if it can.
export function canFeast(g: Game, b: Building): string | null {
  if (b.type !== 'square') return 'Only a Feast Square can hold a feast';
  if (!b.built) return 'Finish building it first';
  if (squares(g).some((s) => s.feast)) return 'A wedding feast is already planned';
  if (g.feastSeason === seasonCount(g.time)) return 'You can hold one feast each season';
  return null;
}

// Order a wedding feast at square `b`. Returns why it can't, or null.
export function orderFeast(g: Game, b: Building): string | null {
  const why = canFeast(g, b);
  if (why) return why;
  b.feast = {};
  g.feastSeason = seasonCount(g.time);
  return null;
}

// How many of good `k` a square still wants for its feast, counting what it has.
export function feastWant(b: Building, k: Good) {
  return b.feast && b.feast.at === undefined ? FEAST_FOOD[k] ?? 0 : 0;
}

const stocked = (b: Building) => (Object.keys(FEAST_FOOD) as Good[]).every((k) => b.stock[k] >= FEAST_FOOD[k]!);

// The square whose feast is on right now, between dusk and midnight, or null.
export function feastOn(g: Game): Building | null {
  for (const b of squares(g)) {
    const at = b.feast?.at;
    if (at !== undefined && g.time >= at && g.time < at + UNTIL_MIDNIGHT) return b;
  }
  return null;
}

// Called often. Sets the feast date once the food is in, serves the food at dusk, and brings
// the newcomers at dawn.
export function stepFeasts(g: Game) {
  for (const b of squares(g)) {
    if (!b.built) continue;
    const f = b.feast;
    if (!f) {
      b.status = 'Ready to hold a feast';
      continue;
    }
    if (f.at === undefined) {
      if (!stocked(b)) {
        b.status = 'Waiting for the feast food';
        continue;
      }
      f.at = nextDusk(g.time);
    }
    if (g.time < f.at) {
      b.status = 'The feast begins at dusk';
      continue;
    }
    if (!f.eaten) {
      for (const k of Object.keys(FEAST_FOOD) as Good[]) b.stock[k] -= FEAST_FOOD[k]!;
      f.eaten = true;
      g.toasts.push('🎉 The wedding feast has begun');
    }
    if (g.time < f.at + UNTIL_MIDNIGHT) {
      b.status = 'The wedding feast is on';
      continue;
    }
    if (g.time < f.at + UNTIL_DAWN) {
      b.status = 'The newlyweds arrive at dawn';
      continue;
    }
    addPool(g, homeOf(g, b) ?? g.hq, FEAST_NEWCOMERS);
    b.feast = undefined;
    b.status = 'Ready to hold a feast';
    g.toasts.push('💍 Two newlyweds joined your village');
    noteFeast(g);
  }
}

// At night, a worker or builder with nothing to do goes to the feast while it is on, and stays
// there until midnight. Returns true when it took care of them. Workers who can't walk to the square go to bed.
export function joinFeast(g: Game, s: Settler, post: Building): boolean {
  const sq = feastOn(g);
  if (!sq) {
    s.feast = undefined;
    return false;
  }
  if (s.feast !== sq.id && walkDist(g, sq, post) === Infinity) return false;
  post.status = AT_FEAST;
  s.atWork = false;
  s.anim = '';
  if (s.feast === sq.id) {
    s.tasks = [{ k: 'work', t: 1 }];
    return true;
  }
  const join = () => {
    s.feast = sq.id;
    s.onAbort = null;
    s.facing = sq.x - s.x - (sq.y - s.y) >= 0 ? 1 : -1;
  };
  // A guest who can't reach their spot celebrates where they stand.
  s.onAbort = join;
  s.tasks = [{ k: 'walk', ...spotNear(g, sq) }, { k: 'do', f: join }];
  return true;
}

// A free tile near the square for one guest to stand on.
function spotNear(g: Game, sq: Building) {
  const free: { x: number; y: number }[] = [];
  for (let y = sq.y - SPREAD; y <= sq.y + SPREAD; y++)
    for (let x = sq.x - SPREAD; x <= sq.x + SPREAD; x++)
      if ((x !== sq.x || y !== sq.y) && g.world.inside(x, y) && g.passable(x, y)) free.push({ x, y });
  return free[Math.floor(g.rand() * free.length)] ?? { x: sq.x, y: sq.y };
}
