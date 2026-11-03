// The shape of the second island and the far island: how big each is, where it sits, and how its
// mountain ridge runs. From map version 10, the second island is bigger, with a longer ridge. From
// map version 11, the far island is bigger still, the largest of the three. From map version 13,
// both are about 32 tiles across, the same size.
import { rng } from './noise';
import { cos, hypot, sin } from '../math/exact';

// From map version 10, the second island is about 20 tiles across instead of 13.
export const BIG_ISLE_FROM = 10;

export interface IsleSize {
  // How far the island reaches from its centre, in tiles.
  size: number;
  // How far past the head of the bay the island's centre sits.
  away: number;
  // How far past the island's centre the top of its mountain sits, away from the home island.
  peakAway: number;
  // How many tiles the mountain's ridge runs each way from its top, across the island.
  ridge: number;
  // On a meadow island, the grove: how far it sits towards the home side of the island's centre,
  // how far off to one side, and how wide it is.
  groveIn: number;
  groveSide: number;
  grove: number;
}

// The far island, and the second island before map version 10.
export const SMALL_ISLE: IsleSize = { size: 6.5, away: 14, peakAway: 1.5, ridge: 1.5, groveIn: -5, groveSide: 3, grove: 4 };
// The second island from map version 10. It sits farther out, so the strait to the home island
// stays as wide as before. Its ridge is about three times as long, so it holds more ore.
export const BIG_ISLE: IsleSize = { size: 10, away: 17.5, peakAway: 0, ridge: 4.5, groveIn: -5, groveSide: 3, grove: 4 };

// From map version 11, the far island is about 26 tiles across instead of 13.
export const BIG_FAR_FROM = 11;
// The far island from map version 11. Its ridge runs across the middle and is about four times as
// long, with room to walk around both ends. Its `away` is not used: see FAR_AWAY.
export const BIG_FAR: IsleSize = { size: 13, away: 0, peakAway: -2, ridge: 6, groveIn: 8, groveSide: 6, grove: 4 };

// From map version 13, the map is 128 by 128 tiles, and both islands share one shape. Each is about
// 32 tiles across, about half the home island's land: its shore lies a little inside `size`. Its
// ridge is twice as long as on version 10, with room to walk around both ends. The ridge sits
// towards the home island, as far from the near shore as on older maps, so coal and iron mines
// still fit in a landing harbour's land. The grove sits on the far side. The island sits farther
// out, so its strait to the home island stays as wide as before.
export const HUGE_ISLES_FROM = 13;
export const HUGE_ISLE: IsleSize = { size: 17.5, away: 24, peakAway: -6.5, ridge: 9, groveIn: -8, groveSide: 5, grove: 6 };

// From map version 14, both islands' ridges bend along the island's far shore, at the top of the
// screen, so the sea lies behind them and the rest of the island lies in front, in full view. The
// middle of the ridge sits TOP_MID tiles up the screen from the island's centre. Its two ends sit
// TOP_ENDS tiles up the screen, `ridge` tiles out to each side, so the ridge follows the shore.
export const TOP_RIDGES_FROM = 14;
const TOP_MID = 10;
const TOP_ENDS = 6;
// One tile up the screen, and one tile to the right of the screen, in map tiles. The camera looks
// from the bottom right of the map towards the top left.
export const UP = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
export const RIGHT = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };

type Point = { x: number; y: number };

// The points the ridge of an island with centre `c` and shape `s` runs through, on a map of
// generator version `map`. Before map version 14, it runs straight across the island, at right
// angles to `out`, `s.peakAway` tiles past the centre.
export function ridgeLine(map: number, c: Point, out: Point, s: IsleSize): Point[] {
  const at = (up: number, right: number) => ({ x: c.x + UP.x * up + RIGHT.x * right, y: c.y + UP.y * up + RIGHT.y * right });
  if (map >= TOP_RIDGES_FROM) return [at(TOP_ENDS, -s.ridge), at(TOP_MID, 0), at(TOP_ENDS, s.ridge)];
  const top = { x: c.x + out.x * s.peakAway, y: c.y + out.y * s.peakAway };
  return [-1, 1].map((k) => ({ x: top.x - out.y * s.ridge * k, y: top.y + out.x * s.ridge * k }));
}

// The shape of the second island on a map of generator version `map`.
export const isleShape = (map: number) => (map >= HUGE_ISLES_FROM ? HUGE_ISLE : map >= BIG_ISLE_FROM ? BIG_ISLE : SMALL_ISLE);
// The shape of the far island on a map of generator version `map`.
export const farShape = (map: number) => (map >= HUGE_ISLES_FROM ? HUGE_ISLE : map >= BIG_FAR_FROM ? BIG_FAR : SMALL_ISLE);

// How far the far island's centre stays from the second island's centre. Both islands keep about
// 8 tiles of sea between them.
const farApart = (map: number) => (map >= HUGE_ISLES_FROM ? 43 : map >= BIG_FAR_FROM ? 31 : map >= BIG_ISLE_FROM ? 25 : 21);
// How far the far island's centre sits from the start. From map versions 11 and 13, it sits farther
// out, so the strait to the home island stays about as wide.
const FAR_AWAY = (map: number) => (map >= HUGE_ISLES_FROM ? 35 : map >= BIG_FAR_FROM ? 31 : 24);
// How far the far island may turn from the bay's direction, in degrees.
const FAR_TURN = [50, 130];
// Open sea runs this many tiles wide around the edge of the map.
export const EDGE_SEA = 3;

export interface FarPlace {
  x: number;
  y: number;
  // The way the island faces out to sea.
  out: { x: number; y: number };
}

// Where the far island sits on a `size` by `size` map of generator version `map`: to the left or
// right of the bay, as seen from the start, facing away from the start. Of the spots that fit
// inside the sea at the map's edge and keep clear of the second island, it takes the one farthest
// from the start. It takes its own random numbers, so the rest of the map keeps its shape.
export function placeFar(seed: number, map: number, size: number, start: { x: number; y: number }, bay: { x: number; y: number }, isle: { x: number; y: number }) {
  const k = rng(seed ^ 0xfa12)() < 0.5 ? 1 : -1;
  const room = farShape(map).size + EDGE_SEA + 2;
  const fit = (v: number) => Math.max(room, Math.min(size - 1 - room, v));
  const len = hypot(bay.x, bay.y), ux = bay.x / len, uy = bay.y / len;
  let best: FarPlace | null = null, bd = -1;
  for (let deg = FAR_TURN[0]; deg <= FAR_TURN[1]; deg += 5) {
    // The bay's direction, turned by `deg` degrees.
    const a = (k * deg * Math.PI) / 180, c = cos(a), s = sin(a);
    const out = { x: ux * c - uy * s, y: ux * s + uy * c };
    const x = fit(start.x + out.x * FAR_AWAY(map)), y = fit(start.y + out.y * FAR_AWAY(map));
    const d = hypot(x - start.x, y - start.y);
    if (hypot(x - isle.x, y - isle.y) < farApart(map) || d <= bd) continue;
    best = { x, y, out };
    bd = d;
  }
  return best!;
}

// How wide the strait of water around an island is. The strait runs on out to the open sea.
const STRAIT = 3.5;
// Land rises at most this much per tile on the island's banks.
const SLOPE = 0.065;

// The height of land near an island of size `size`, which is `dx, dy` from the island's centre
// and faces `out`. The strait lowers the home island's coast into sea, with a sandy shore and a
// bank like the bay's. The island rises from a sandy beach to a low, grassy middle, with `bump`
// from the noise so its shore is not a perfect circle.
export function island(h: number, dx: number, dy: number, out: { x: number; y: number }, bump: number, size: number) {
  const past = Math.max(0, dx * out.x + dy * out.y);
  const side = hypot(dx - out.x * past, dy - out.y * past);
  const shore = size + STRAIT + 1.2;
  h = Math.min(h, side < size + STRAIT ? 0.22 : side < shore ? 0.32 : 0.62 + (side - shore) * SLOPE);
  const r = hypot(dx, dy) / size;
  return r < 1 ? Math.max(h, 0.24 + (1 - r * r) * 0.38 + (bump - 0.5) * 0.08) : h;
}
