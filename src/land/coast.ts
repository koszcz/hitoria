// Ragged coasts, from map version 15: the second island and the far island each get their own
// outline, drawn from the seed, with capes, deep bays and sometimes a long arm, instead of a round
// shore. Every outline is star-shaped around the island's centre, so the island stays in one piece.
import { rng } from './noise';
import { cos, hypot, sin } from '../math/exact';
import { UP } from './isle';

export const RAGGED_FROM = 15;
// Each island draws its outline from the seed mixed with its own salt, so the two differ.
export const COAST_SALT = { other: 0x15c0, far: 0xfc0a };

// How far an island reaches in each direction, as a part of its size, is at most 1, so its shore
// stays inside the strait around it. It is never less than MIN, so bays leave the middle whole.
export const MIN = 0.5;
// The outline's land, measured as the mean of the squared reach over all directions. Every island
// cuts its bays to this, so both islands keep about the same land.
const AREA = 0.8;
// The gentle wiggles along the shore: harmonics 2 to WIGGLES of the angle around the centre.
const WIGGLES = 6;
// How many deep bays an island has, at least and at most, and how wide each is, in degrees from its
// middle to its edge.
const BAYS = [2, 3];
const BAY_WIDE = [16, 30];
// How often an island has a long arm, and how wide the arm is from its middle line, in tiles. The
// arm starts ARM_FROM of the island's size out from the centre and reaches to the island's size.
const ARM_CHANCE = 0.5;
const ARM_HALF = 2.3;
const ARM_FROM = 0.35;
// No bay or arm points this close to straight up the screen, where the ridge stands: this is the
// cosine of the angle between them.
const NOT_UP = 0.3;
// On the cove island, no bay or arm points this close to the lagoon's way out to sea, so the
// lagoon never cuts a strip of shore off the island. Also the cosine of the angle between them.
const NOT_COVE = 0.4;
// Bays flank the arm on both sides, this many degrees off it, so the arm stands out into the sea.
const ARM_BAY_OFF = 26;
// The island's shore lies where its height `0.24 + (1 - r²) * 0.38` meets the sand, near r = 0.92.
export const SHORE = 0.92;
// How many directions the outline's land is measured in.
const SAMPLES = 90;

type Dir = { x: number; y: number };
export interface Coast {
  at(dx: number, dy: number): number;
  arm: Dir | null;
}
const dirOf = (deg: number): Dir => ({ x: cos((deg * Math.PI) / 180), y: sin((deg * Math.PI) / 180) });

// The outline of an island of size `size`, drawn from `seed` and `salt`, so each island gets its
// own. Its `at` gives, for a point `dx, dy` from the island's centre, how far out it lies as a part
// of the island's reach in that direction: below 1 is on the island. `arm` is the way its long arm
// points, or null if it has none. On the cove island, `cove` is the way the lagoon opens to sea.
export function coastOf(seed: number, salt: number, size: number, cove?: Dir): Coast {
  const rand = rng(seed ^ salt);
  const pick = (lo: number, hi: number) => lo + rand() * (hi - lo);
  // The wiggles: a size and a turn for each harmonic.
  const waves = Array.from({ length: WIGGLES - 1 }, (_, i) => ({ k: i + 2, amp: rand() / (i + 2), turn: pick(0, 2 * Math.PI) }));
  const waveSum = waves.reduce((s, w) => s + w.amp, 0);
  const bays: { at: Dir; wide: number; deep: number }[] = [];
  const bay = (deg: number, wide: number, deep: number) => bays.push({ at: dirOf(deg), wide: cos((wide * Math.PI) / 180), deep });
  const nBays = BAYS[0] + Math.floor(rand() * (BAYS[1] - BAYS[0] + 1));
  // A direction at random, turned away from straight up the screen, where the ridge would fill a
  // bay or hide an arm, and away from the lagoon. `off` are angles off it that must stay clear too.
  const clear = (deg: number) => {
    const u = dirOf(deg);
    return u.x * UP.x + u.y * UP.y <= NOT_UP && (!cove || u.x * cove.x + u.y * cove.y <= NOT_COVE);
  };
  // Null if no direction all the way round is clear.
  const free = (off: number[]) => {
    const from = pick(0, 360);
    for (let deg = from; deg < from + 360; deg += 10) if (off.every((o) => clear(deg + o))) return deg;
    return null;
  };
  for (let i = 0; i < nBays; i++) {
    const deg = free([0]), wide = pick(BAY_WIDE[0], BAY_WIDE[1]), deep = pick(0.6, 1);
    if (deg !== null) bay(deg, wide, deep);
  }
  let arm: Dir | null = null;
  const armDeg = rand() < ARM_CHANCE ? free([-ARM_BAY_OFF, 0, ARM_BAY_OFF]) : null;
  if (armDeg !== null) {
    const deg = armDeg;
    arm = dirOf(deg);
    for (const k of [-1, 1]) bay(deg + k * ARM_BAY_OFF, BAY_WIDE[0], 1);
  }

  // How much the shore is cut back in direction `u`, before it is scaled.
  const cut = (u: Dir) => {
    let wave = 0, re = 1, im = 0;
    for (let k = 1, w = 0; w < waves.length; k++) {
      [re, im] = [re * u.x - im * u.y, re * u.y + im * u.x];
      if (k < waves[w].k) continue;
      wave += waves[w].amp * (re * cos(waves[w].turn) - im * sin(waves[w].turn));
      w++;
    }
    let c = 0.5 * (1 + wave / waveSum) * 0.25;
    for (const b of bays) {
      const t = Math.max(0, Math.min(1, (u.x * b.at.x + u.y * b.at.y - b.wide) / (1 - b.wide)));
      c += b.deep * t * t * (3 - 2 * t);
    }
    return c;
  };
  const cuts = Array.from({ length: SAMPLES }, (_, i) => cut(dirOf((360 * i) / SAMPLES)));
  const area = (k: number) => cuts.reduce((s, c) => s + Math.max(MIN, 1 - k * c) * Math.max(MIN, 1 - k * c), 0) / SAMPLES;
  // Scale the cuts so the outline holds AREA of land. Less cut means more land.
  let lo = 0, hi = 2;
  for (let i = 0; i < 30; i++) {
    const k = (lo + hi) / 2;
    if (area(k) > AREA) lo = k;
    else hi = k;
  }
  const scale = lo;
  const reach = (u: Dir) => Math.max(MIN, 1 - scale * cut(u));

  const at = (dx: number, dy: number) => {
    const d = hypot(dx, dy);
    if (d === 0) return 0;
    const body = d / (size * reach({ x: dx / d, y: dy / d }));
    if (!arm) return body;
    // How far the point lies from the arm's middle line, in tiles.
    const along = Math.max(ARM_FROM * size, Math.min(size - ARM_HALF, dx * arm.x + dy * arm.y));
    const off = hypot(dx - arm.x * along, dy - arm.y * along);
    return Math.min(body, (SHORE * off) / ARM_HALF);
  };
  return { at, arm };
}
