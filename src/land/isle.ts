// The shape of the second island and the far island: how big each is, where it sits, and how its
// mountain ridge runs. From map version 10, the second island is bigger, with a longer ridge.

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
export const SMALL_ISLE: IsleSize = { size: 6.5, away: 14, peakAway: 1.5, ridge: 1.5, groveIn: 2.5, groveSide: 3.5, grove: 2 };
// The second island from map version 10. It sits farther out, so the strait to the home island
// stays as wide as before. Its ridge is about three times as long, so it holds more ore.
export const BIG_ISLE: IsleSize = { size: 10, away: 17.5, peakAway: 0, ridge: 4.5, groveIn: 3.8, groveSide: 5.4, grove: 3 };

// The shape of the second island on a map of generator version `map`.
export const isleShape = (map: number) => (map >= BIG_ISLE_FROM ? BIG_ISLE : SMALL_ISLE);

// How far the far island's centre stays from the second island's centre. Both islands keep about
// 8 tiles of sea between them.
export const farApart = (map: number) => (map >= BIG_ISLE_FROM ? 25 : 21);

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
  const side = Math.hypot(dx - out.x * past, dy - out.y * past);
  const shore = size + STRAIT + 1.2;
  h = Math.min(h, side < size + STRAIT ? 0.22 : side < shore ? 0.32 : 0.62 + (side - shore) * SLOPE);
  const r = Math.hypot(dx, dy) / size;
  return r < 1 ? Math.max(h, 0.24 + (1 - r * r) * 0.38 + (bump - 0.5) * 0.08) : h;
}
