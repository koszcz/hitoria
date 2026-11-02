// The Feast Square and its feasts. You order a feast, carriers bring the food, and at the next
// dusk every worker gathers at the square until midnight. At dawn, a wedding feast brings two new
// settlers, and a religious feast blesses the village for the day.
import { BEDTIME, DAY_LENGTH, WAKE, nextDusk } from '../seasons/day';
import { seasonCount } from '../seasons/year';
import type { Good } from './defs';
import type { Game } from './game';
import { bless } from './blessing';
import { addPool, homeOf } from './homes';
import { noteFeast } from './chronicle';
import type { Building, FeastKind, Settler } from './types';
import { walkDist } from './walking';

// The food one feast needs. Both kinds of feast need the same.
export const FEAST_FOOD: Partial<Record<Good, number>> = { fish: 10, bread: 10, meat: 10 };
export const FEAST_NEWCOMERS = 2; // settlers who arrive at dawn after a feast
// What each kind of feast says: the status of a hut while its worker feasts, the square's status
// during the feast and until dawn, and the toasts at dusk and dawn.
export const FEAST_TEXT: Record<FeastKind, { at: string; on: string; after: string; begun: string; dawn: string }> = {
  wedding: {
    at: 'At the wedding feast',
    on: 'The wedding feast is on',
    after: 'The newlyweds arrive at dawn',
    begun: '🎉 The wedding feast has begun',
    dawn: '💍 Two newlyweds joined your village',
  },
  religious: {
    at: 'At the religious feast',
    on: 'The religious feast is on',
    after: 'The blessing comes at dawn',
    begun: '🕯️ The religious feast has begun',
    dawn: '🙏 The village is blessed: everyone works 25% faster today',
  },
};
export const AT_FEAST = FEAST_TEXT.wedding.at; // the status of a hut or site while its worker feasts at a wedding
const kindOf = (b: Building): FeastKind => b.feast?.kind ?? 'wedding'; // older saves have only weddings
const SPREAD = 2; // how far from the square the guests stand, in tiles

// Seconds from the dusk a feast begins to midnight, when it ends, and to dawn, when the newcomers arrive.
const UNTIL_MIDNIGHT = (1 - BEDTIME) * DAY_LENGTH;
const UNTIL_DAWN = (1 - BEDTIME + WAKE) * DAY_LENGTH;

const squares = (g: Game) => [...g.buildings.values()].filter((b) => b.type === 'square');

// Why square `b` can't hold a feast now, or null if it can.
export function canFeast(g: Game, b: Building): string | null {
  if (b.type !== 'square') return 'Only a Feast Square can hold a feast';
  if (!b.built) return 'Finish building it first';
  if (squares(g).some((s) => s.feast)) return 'A feast is already planned';
  if (g.feastSeason === seasonCount(g.time)) return 'You can hold one feast each season';
  return null;
}

// Order a feast of kind `kind` at square `b`. Returns why it can't, or null.
export function orderFeast(g: Game, b: Building, kind: FeastKind = 'wedding'): string | null {
  const why = canFeast(g, b);
  if (why) return why;
  b.feast = kind === 'wedding' ? {} : { kind };
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

// Called often. Sets the feast date once the food is in, serves the food at dusk, and at dawn
// brings the newcomers or the blessing.
export function stepFeasts(g: Game) {
  for (const b of squares(g)) {
    if (!b.built) continue;
    const f = b.feast;
    const x = FEAST_TEXT[kindOf(b)];
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
      g.toasts.push(x.begun);
    }
    if (g.time < f.at + UNTIL_MIDNIGHT) {
      b.status = x.on;
      continue;
    }
    if (g.time < f.at + UNTIL_DAWN) {
      b.status = x.after;
      continue;
    }
    if (f.kind === 'religious') bless(g, f.at + UNTIL_DAWN);
    else {
      addPool(g, homeOf(g, b) ?? g.hq, FEAST_NEWCOMERS);
      noteFeast(g);
    }
    b.feast = undefined;
    b.status = 'Ready to hold a feast';
    g.toasts.push(x.dawn);
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
  post.status = FEAST_TEXT[kindOf(sq)].at;
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
