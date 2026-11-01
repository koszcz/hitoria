// What the clock in the top bar shows for a game time: the time of day, the season and the day.
import { clock, dayNumber } from './day';
import { seasonAt, yearAt, type Season } from './year';

export type Dial = {
  angle: number; // where the hand points, in degrees clockwise from the top: 0 midday, ±180 midnight
  night: boolean; // the hand shows the moon, not the sun
  season: Season;
  seasonPart: number; // how far through the season it is, 0 to just under 1
  day: number; // the day count, from 1
};

export function dialAt(time: number): Dial {
  const f = clock(time);
  let angle = (f - 0.5) * 360;
  if (angle <= -180) angle += 360;
  const quarter = yearAt(time) * 4;
  return {
    angle,
    night: f < 0.25 || f >= 0.75,
    season: seasonAt(yearAt(time)),
    seasonPart: quarter - Math.floor(quarter),
    day: dayNumber(time),
  };
}
