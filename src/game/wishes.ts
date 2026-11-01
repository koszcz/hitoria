// Village wishes: after the last goal, the village asks for one gentle wish at a time, with a
// season to meet it by. A granted wish is counted. A missed wish just passes, and a new one comes.
import { seasonAt, yearAt, YEAR_LENGTH, type Season } from '../seasons/year';
import { HOUSE_FOOD } from './defs';
import { GOALS } from './goals';
import type { Game } from './game';

export interface Wish {
  id: string;
  text: string;
  need: number;
  count: (g: Game) => number;
  grow: boolean; // true: the count must grow by `need` while the wish lasts; false: it must reach `need`
}

export const WISHES: Wish[] = [
  { id: 'food', text: 'Store 40 fish, meat or bread', need: 40, count: (g) => HOUSE_FOOD.reduce((n, k) => n + g.stored[k], 0), grow: false },
  { id: 'stone', text: 'Store 40 stone', need: 40, count: (g) => g.stored.stone, grow: false },
  { id: 'planks', text: 'Make 40 planks', need: 40, count: (g) => g.made.plank, grow: true },
  { id: 'bread', text: 'Bake 15 bread', need: 15, count: (g) => g.made.bread, grow: true },
  { id: 'fish', text: 'Catch 20 fish', need: 20, count: (g) => g.made.fish, grow: true },
  { id: 'meat', text: 'Bring home 10 meat', need: 10, count: (g) => g.made.meat, grow: true },
  { id: 'tools', text: 'Make 5 tools', need: 5, count: (g) => g.made.tool, grow: true },
  { id: 'settlers', text: 'Welcome 4 new settlers', need: 4, count: (g) => g.population, grow: true },
  { id: 'trade', text: 'Welcome 2 trade ships', need: 2, count: (g) => g.tradeVisits, grow: true },
];

// The wish the village has now. `base` is the count when it began; `until` is the game time it ends.
export type WishState = { id: string; base: number; until: number };

export const WISH_MIN_TIME = 240; // a wish always lasts at least this many seconds of game time
const SEASON = YEAR_LENGTH / 4;

// When a wish made at `time` ends: at the start of a season, at least WISH_MIN_TIME away.
export function wishUntil(time: number) {
  const start = yearAt(0) * YEAR_LENGTH; // how far into the year a new game begins
  const t = Math.ceil((time + start) / SEASON) * SEASON - start;
  return t - time < WISH_MIN_TIME ? t + SEASON : t;
}

const wishById = (id: string) => WISHES.find((w) => w.id === id);
const progress = (g: Game, w: Wish, base: number) => Math.max(0, w.grow ? w.count(g) - base : w.count(g));

// The wish now, with its progress and the season it must be met before, or null while goals remain.
export function wishNow(g: Game): { id: string; text: string; have: number; need: number; before: Season; granted: number } | null {
  const w = g.wish && wishById(g.wish.id);
  if (!g.wish || !w) return null;
  const have = Math.min(w.need, progress(g, w, g.wish.base));
  return { id: w.id, text: w.text, have, need: w.need, before: seasonAt(yearAt(g.wish.until + 1)), granted: g.wishesGranted };
}

// Start a new wish, never the same as the last one.
function nextWish(g: Game) {
  const choices = WISHES.filter((w) => w.id !== g.wish?.id);
  const w = choices[Math.floor(g.rand() * choices.length)];
  g.wish = { id: w.id, base: w.count(g), until: wishUntil(g.time) };
  g.toasts.push(`🌟 The village wishes: ${w.text}`);
}

// Called often. Once every goal is reached, grant or let pass the wish, and start the next one.
export function checkWishes(g: Game) {
  if (GOALS[g.goal]) return;
  const w = g.wish && wishById(g.wish.id);
  if (!g.wish || !w) return nextWish(g);
  if (progress(g, w, g.wish.base) >= w.need) {
    g.wishesGranted++;
    g.toasts.push(`🌟 Wish granted: ${w.text}`);
    nextWish(g);
  } else if (g.time >= g.wish.until) {
    g.toasts.push(`🍂 The wish passed: ${w.text}`);
    nextWish(g);
  }
}
