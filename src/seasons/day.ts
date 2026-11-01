// The day clock: how far through the day the game is, and which day it is.
// The clock is a day fraction: 0 is midnight, 0.25 dawn, 0.5 midday and 0.75 dusk.

export const DAY_LENGTH = 480; // seconds of game time in one day
const START = 0.3; // a new game starts in the early morning

// Day fraction for a game time, so pausing stops the clock and a save keeps its time of day.
export function clock(time: number) {
  const f = time / DAY_LENGTH + START;
  return f - Math.floor(f);
}

// Which day it is, counting from 1. A new day starts at midnight.
export function dayNumber(time: number) {
  return Math.floor(time / DAY_LENGTH + START) + 1;
}

// Workers go to bed once dusk is nearly over and get up at dawn. The light is darkest in between.
export const BEDTIME = 0.76;
export const WAKE = 0.24;

// Is it night, when workers sleep and work stops?
export function isNight(time: number) {
  const f = clock(time);
  return f >= BEDTIME || f < WAKE;
}
