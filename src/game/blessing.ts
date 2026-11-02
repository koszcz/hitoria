// The blessing a religious feast leaves behind: for the whole next day, every worker and builder works 25% faster.
import { DAY_LENGTH, WAKE } from '../seasons/day';
import type { Game } from './game';
import type { Task } from './types';

export const BLESSED_SPEED = 1.25; // how many times faster a blessed worker or builder works

// Is the village blessed right now?
export const blessed = (g: Game) => g.time < g.blessedUntil;

// Bless the village from `dawn` until the midnight after it.
export function bless(g: Game, dawn: number) {
  g.blessedUntil = dawn + (1 - WAKE) * DAY_LENGTH;
}

// How many times faster work goes now: 1.25 while the village is blessed, else 1.
export const blessing = (g: Game) => (blessed(g) ? BLESSED_SPEED : 1);

// Shorten each piece of work while the village is blessed. Walking takes as long as before.
export function hasten(g: Game, tasks: Task[]) {
  const k = blessing(g);
  if (k !== 1) for (const t of tasks) if (t.k === 'work') t.t /= k;
}
