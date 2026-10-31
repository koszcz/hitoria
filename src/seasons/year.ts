// The year: spring, summer, autumn and winter, and how the island looks at each point in it.
// The clock is a year fraction: 0 is the start of spring, 0.25 summer, 0.5 autumn, 0.75 winter.

export const YEAR_LENGTH = 1200; // seconds of game time in one year, so 2.5 days
const START = 0.08; // a new game starts in spring, once the last snow has melted

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// Year fraction for a game time. Pausing stops the year, and a save keeps its season.
export function yearAt(time: number) {
  const f = time / YEAR_LENGTH + START;
  return f - Math.floor(f);
}

export function seasonAt(year: number) {
  return SEASONS[Math.min(3, Math.floor((year - Math.floor(year)) * 4))];
}

// Grain grows only in the warm months. In winter the fields rest, so food must be stored ahead.
export function fieldsGrow(time: number) {
  return !isWinter(time);
}

export function isWinter(time: number) {
  return seasonAt(yearAt(time)) === 'winter';
}

export type SeasonLook = {
  autumn: number; // 0 green leaves, 1 fully orange and red
  bare: number; // 0 leafy trees in leaf, 1 bare branches
  snow: number; // 0 no snow on the ground, 1 fully white
  snowfall: number; // how hard snow falls, 0 to 1
  dry: number; // grass colour: -1 fresh spring green, 0 summer, 1 dry autumn gold
  blossom: boolean; // blossom trees show pink flowers
  flowers: boolean; // meadow flowers are out
};

type Level = Omit<SeasonLook, 'blossom' | 'flowers'>;
const level = (autumn: number, bare: number, snow: number, snowfall: number, dry: number): Level => ({ autumn, bare, snow, snowfall, dry });

// Year fraction where each look is at its fullest. Between two keys the look blends smoothly.
const KEYS: [number, Level][] = [
  [0, level(0, 0.5, 0.4, 0, 0)], // late snow melts
  [0.06, level(0, 0, 0, 0, -1)], // fresh spring
  [0.2, level(0, 0, 0, 0, -0.6)],
  [0.3, level(0, 0, 0, 0, 0)], // summer
  [0.47, level(0, 0, 0, 0, 0.3)],
  [0.57, level(1, 0, 0, 0, 0.9)], // autumn colours
  [0.68, level(1, 0.15, 0, 0, 1)],
  [0.77, level(1, 1, 0, 0.3, 0.6)], // leaves fall, first snow
  [0.84, level(1, 1, 1, 1, 0)], // deep winter
  [0.94, level(1, 1, 1, 0.5, 0)],
  [1, level(0, 0.5, 0.4, 0, 0)],
];

export function seasonLook(year: number): SeasonLook {
  const f = year - Math.floor(year);
  let i = 0;
  while (KEYS[i + 1][0] < f) i++;
  const [f0, a] = KEYS[i], [f1, b] = KEYS[i + 1];
  const t = smooth((f - f0) / (f1 - f0));
  const mix = (k: keyof Level) => a[k] + (b[k] - a[k]) * t;
  return {
    autumn: mix('autumn'),
    bare: mix('bare'),
    snow: mix('snow'),
    snowfall: mix('snowfall'),
    dry: mix('dry'),
    blossom: f > 0.04 && f < 0.22,
    flowers: f > 0.05 && f < 0.6,
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
