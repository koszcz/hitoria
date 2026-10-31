import { expect } from 'bun:test';
import { Game, GOODS, Bag, bag } from './index';
import { W } from '../world';
import { placeSite } from './construction';

// A game whose land around the HQ is flat grass with no trees or boulders, so tests can
// place things where they want without depending on how the map generator lays out a seed.
export function flatGame(seed = 1, radius = 16) {
  const g = new Game(seed);
  const { x: hx, y: hy } = g.hq;
  for (let y = hy - radius; y <= hy + radius; y++)
    for (let x = hx - radius; x <= hx + radius; x++) {
      if (!g.world.inside(x, y)) continue;
      const t = g.world.at(x, y);
      if (t.b || t.flag) continue;
      Object.assign(t, { t: 'grass', h: 0.5, tree: 0, rock: 0 });
    }
  return g;
}

// Advance the game in fixed steps. `check` runs after every step.
export function run(g: Game, seconds: number, check?: () => void, dt = 0.1) {
  for (let t = 0; t < seconds; t += dt) {
    g.update(dt);
    check?.();
  }
}

// Run until `done` is true, failing the test if it takes longer than `limit` seconds.
export function runUntil(g: Game, done: () => boolean, limit = 300, check?: () => void, dt = 0.1) {
  for (let t = 0; t < limit; t += dt) {
    if (done()) return t;
    g.update(dt);
    check?.();
  }
  throw new Error(`Condition not met within ${limit}s of game time`);
}

// Every good in the game, wherever it is: in buildings or in someone's hands.
export function totalGoods(g: Game): Bag {
  const sum = bag();
  for (const b of g.buildings.values())
    for (const k of GOODS) sum[k] += b.stock[k] + b.out[k];
  for (const s of g.settlers.values()) if (s.carrying) sum[s.carrying]++;
  return sum;
}

// `incoming` and `sending` count the goods of carrier trips. They must match the trips under way.
export function expectIncomingConsistent(g: Game) {
  const coming = new Map<number, Bag>(), going = new Map<number, Bag>();
  const add = (m: Map<number, Bag>, id: number, k: keyof Bag) => {
    const r = m.get(id) ?? bag();
    r[k]++;
    m.set(id, r);
  };
  for (const s of g.settlers.values()) {
    if (!s.job) continue;
    add(coming, s.job.to, s.job.g);
    if (!s.carrying) add(going, s.job.from, s.job.g);
  }
  for (const b of g.buildings.values()) {
    const c = coming.get(b.id) ?? bag(), o = going.get(b.id) ?? bag();
    for (const k of GOODS) {
      if (b.incoming[k] !== c[k])
        throw new Error(`${b.type} #${b.id} expects ${b.incoming[k]} ${k} but ${c[k]} are on the way`);
      if (b.sending[k] !== o[k])
        throw new Error(`${b.type} #${b.id} is sending ${b.sending[k]} ${k} but ${o[k]} carriers are coming for them`);
    }
  }
}

// Place a building site without the road it would get on its own, so a test can lay roads itself.
export function placeBare(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  return placeSite(g, type, x, y);
}

// Place a building and join its flag to the HQ's flag with a road straight to it.
export function placeLinked(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = placeBare(g, type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  expect(g.linked(b)).toBe(true);
  return b;
}

// Ring building `b` with water two tiles out, so nobody can walk to it. Settlers inside the ring stay where they are.
export function wallOff(g: Game, b: { x: number; y: number }) {
  for (let dy = -2; dy <= 3; dy++)
    for (let dx = -2; dx <= 2; dx++)
      if (Math.abs(dx) === 2 || dy === -2 || dy === 3) g.world.at(b.x + dx, b.y + dy).t = 'water';
}

// Is the tile at (x, y) part of your land?
export const inside = (g: Game, x: number, y: number) => !!g.world.territory[y * W + x];
