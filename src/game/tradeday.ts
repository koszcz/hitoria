// The trade ship's hours: it sets out in the morning and casts off before sunset, so a visit
// never runs into the night, when the clock runs fast.
import { DAY_LENGTH, clock, dayNumber } from '../seasons/day';

export const SAIL_FROM = 0.25; // dawn: the earliest a ship sets out
export const SAIL_BY = 0.5; // midday: the latest a ship sets out, so it still has time to trade
export const CAST_OFF = 0.7; // late afternoon: the ship leaves the dock, before dusk

// Seconds of game time from `time` until day fraction `f` next comes round.
const until = (time: number, f: number) => ((((f - clock(time)) % 1) + 1) % 1) * DAY_LENGTH;

// May a ship set out at `time`? Only in the morning, and once a day.
// `last` is the day the last ship set out, or 0 if none has.
export function maySail(time: number, last: number) {
  const f = clock(time);
  return f >= SAIL_FROM && f < SAIL_BY && dayNumber(time) > last;
}

// Seconds until the next ship may set out, or 0 if one may now.
export function untilSail(time: number, last: number) {
  return maySail(time, last) ? 0 : until(time, SAIL_FROM);
}

// Seconds a ship tied up at `time` may stay before it casts off. 0 once it is time to go.
export function untilCastOff(time: number) {
  const f = clock(time);
  return f >= SAIL_FROM && f < CAST_OFF ? (CAST_OFF - f) * DAY_LENGTH : 0;
}
