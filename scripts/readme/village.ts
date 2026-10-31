// Grows the village shown in the README screenshot: places a fixed list of buildings near the HQ
// on a fixed island, each with a road, then lets the game run until the village is built.
import { Game, type BType } from '../../src/game';

export const SEED = 214;

// Placed in this order, each on the free spot nearest the HQ. The lookouts in the first round
// widen the land, so the second round has room.
const ROUNDS: BType[][] = [
  ['woodcutter', 'forester', 'sawmill', 'quarry', 'lookout', 'lookout'],
  ['fisher', 'farm', 'well', 'mill', 'bakery', 'house', 'storehouse', 'mine', 'woodcutter', 'house'],
];
const RADIUS = 9; // how far from the HQ to look for a spot
const GAP = 2; // free tiles to keep between buildings, so each one is easy to see
const ROUND_SECONDS = 900; // game time each round gets to build

function spots(g: Game) {
  const { x: hx, y: hy } = g.hq;
  const all: { x: number; y: number }[] = [];
  for (let y = hy - RADIUS; y <= hy + RADIUS; y++)
    for (let x = hx - RADIUS; x <= hx + RADIUS; x++) all.push({ x, y });
  return all.sort((a, b) => Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy));
}

const crowded = (g: Game, x: number, y: number) =>
  [...g.buildings.values()].some((b) => Math.abs(b.x - x) <= GAP && Math.abs(b.y - y) <= GAP);

// Places what fits. A building with no spot that has a road to it is left out.
function placeRound(g: Game, round: BType[]) {
  for (const type of round) {
    const at = spots(g).find(
      ({ x, y }) => !g.canPlace(type, x, y) && !crowded(g, x, y) && g.planAutoRoad(type, x, y),
    );
    if (at) g.place(type, at.x, at.y);
  }
}

export function growVillage(seed = SEED) {
  const g = new Game(seed);
  for (const round of ROUNDS) {
    placeRound(g, round);
    for (let t = 0; t < ROUND_SECONDS; t += 0.1) g.update(0.1);
  }
  return g;
}
