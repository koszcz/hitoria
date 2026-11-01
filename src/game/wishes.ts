// Village wishes: after the last goal, the village asks for one gentle wish at a time, with a
// season to meet it by. A granted wish is counted. A missed wish just passes, and a new one comes.
import { seasonAt, yearAt, YEAR_LENGTH, type Season } from '../seasons/year';
import { HOUSE_FOOD } from './defs';
import { noteWish } from './chronicle';
import { GOALS } from './goals';
import { landings, onFar } from './isles';
import { madeIron, upgraded } from './upgrades';
import type { Game } from './game';

export interface Wish {
  id: string;
  text: (n: number) => string; // what the wish asks for, when it needs n
  need: number;
  count: (g: Game) => number;
  grow: boolean; // true: the count must grow by `need` while the wish lasts; false: it must reach `need`
  more?: number; // a store wish asks for at least this many more than the stores hold when it starts
  can?: (g: Game) => boolean; // the village makes the wish only when you can grant it
}

const built = (g: Game, type: string) => [...g.buildings.values()].some((b) => b.type === type && b.built);
const harbour = (g: Game) => built(g, 'harbour');
const onFarIsle = (g: Game) => landings(g).filter((b) => onFar(g, b.x, b.y)).length;

export const WISHES: Wish[] = [
  { id: 'food', text: (n) => `Store ${n} fish, meat or bread`, need: 40, count: (g) => HOUSE_FOOD.reduce((n, k) => n + g.stored[k], 0), grow: false, more: 20 },
  { id: 'stone', text: (n) => `Store ${n} stone`, need: 40, count: (g) => g.stored.stone, grow: false, more: 20 },
  { id: 'planks', text: () => 'Make 40 planks', need: 40, count: (g) => g.made.plank, grow: true },
  { id: 'bread', text: () => 'Bake 15 bread', need: 15, count: (g) => g.made.bread, grow: true },
  { id: 'fish', text: () => 'Catch 20 fish', need: 20, count: (g) => g.made.fish, grow: true },
  { id: 'meat', text: () => 'Bring home 10 meat', need: 10, count: (g) => g.made.meat, grow: true },
  { id: 'tools', text: () => 'Make 5 tools', need: 5, count: (g) => g.made.tool, grow: true },
  { id: 'settlers', text: () => 'Welcome 4 new settlers', need: 4, count: (g) => g.population, grow: true },
  { id: 'trade', text: () => 'Welcome 1 trade ship', need: 1, count: (g) => g.tradeVisits, grow: true, can: harbour },
  // Late-game wishes point the player at iron, upgrades, the trader's wants and the far island.
  { id: 'iron', text: () => 'Make 10 iron', need: 10, count: (g) => g.made.iron, grow: true, can: (g) => built(g, 'smelter') },
  { id: 'upgrades', text: () => 'Upgrade 2 buildings', need: 2, count: (g) => [...g.buildings.values()].filter(upgraded).length, grow: true, can: madeIron },
  { id: 'wanted', text: () => 'Sell the trader 8 goods it wants', need: 8, count: (g) => g.wantedSold, grow: true, can: harbour },
  { id: 'far', text: () => 'Land on the far island', need: 1, count: onFarIsle, grow: false, can: (g) => !!g.world.far && harbour(g) && !onFarIsle(g) },
];

// The wish the village has now. `base` is the count when it began; `until` is the game time it ends.
// `need` is set for a store wish, which asks for more than the stores held when it began.
export type WishState = { id: string; base: number; until: number; need?: number };

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
const needOf = (w: Wish, s: WishState) => s.need ?? w.need;

// How much a wish asks for when it starts with the count at `base`. A store wish asks for at
// least `more` above what the stores hold, rounded up to ten, so it is never granted for free.
const needAt = (w: Wish, base: number) => (w.more ? Math.max(w.need, Math.ceil((base + w.more) / 10) * 10) : w.need);

// The wish now, with its progress and the season it must be met before, or null while goals remain.
export function wishNow(g: Game): { id: string; text: string; have: number; need: number; before: Season; granted: number } | null {
  const w = g.wish && wishById(g.wish.id);
  if (!g.wish || !w) return null;
  const need = needOf(w, g.wish);
  const have = Math.min(need, progress(g, w, g.wish.base));
  return { id: w.id, text: w.text(need), have, need, before: seasonAt(yearAt(g.wish.until + 1)), granted: g.wishesGranted };
}

// The wishes the village may make next: those you can grant, never the same as the last one.
export function wishChoices(g: Game) {
  return WISHES.filter((w) => w.id !== g.wish?.id && (w.can?.(g) ?? true));
}

// Start wish `id` now.
export function beginWish(g: Game, id: string) {
  const w = wishById(id)!, base = w.count(g), need = needAt(w, base);
  g.wish = { id, base, until: wishUntil(g.time), ...(need !== w.need && { need }) };
  g.toasts.push(`🌟 The village wishes: ${w.text(need)}`);
}

function nextWish(g: Game) {
  const choices = wishChoices(g);
  beginWish(g, choices[Math.floor(g.rand() * choices.length)].id);
}

// Called often. Once every goal is reached, grant or let pass the wish, and start the next one.
export function checkWishes(g: Game) {
  if (GOALS[g.goal]) return;
  const w = g.wish && wishById(g.wish.id);
  if (!g.wish || !w) return nextWish(g);
  const need = needOf(w, g.wish);
  if (progress(g, w, g.wish.base) >= need) {
    g.wishesGranted++;
    noteWish(g);
    g.toasts.push(`🌟 Wish granted: ${w.text(need)}`);
    nextWish(g);
  } else if (g.time >= g.wish.until) {
    g.toasts.push(`🍂 The wish passed: ${w.text(need)}`);
    nextWish(g);
  }
}
