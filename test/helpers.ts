import { expect } from 'bun:test';
import { Game, GOODS, Bag, bag } from '../src/game';
import { W } from '../src/world';

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

// Every good in the game, wherever it is: in buildings, on flags, or in someone's hands.
export function totalGoods(g: Game): Bag {
  const sum = bag();
  for (const b of g.buildings.values())
    for (const k of GOODS) sum[k] += b.stock[k] + b.out[k];
  for (const f of g.flags.values()) for (const it of f.items) sum[it.g]++;
  for (const s of g.settlers.values()) {
    if (s.item) sum[s.item.g]++;
    else if (s.carrying) sum[s.carrying]++;
  }
  return sum;
}

// `incoming` counts goods routed to a building. It must match the goods actually on their way.
export function expectIncomingConsistent(g: Game) {
  const routed = new Map<number, Bag>();
  const add = (dest: number, k: keyof Bag) => {
    if (!dest) return;
    const r = routed.get(dest) ?? bag();
    r[k]++;
    routed.set(dest, r);
  };
  for (const f of g.flags.values()) for (const it of f.items) add(it.dest, it.g);
  for (const s of g.settlers.values()) if (s.item) add(s.item.dest, s.item.g);
  for (const b of g.buildings.values()) {
    const r = routed.get(b.id) ?? bag();
    for (const k of GOODS)
      if (b.incoming[k] !== r[k])
        throw new Error(`${b.type} #${b.id} expects ${b.incoming[k]} ${k} but ${r[k]} are on the way`);
  }
}

// Place a building and join its flag to the HQ's flag with a road.
export function placeLinked(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = g.place(type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  expect(g.linked(b)).toBe(true);
  return b;
}

// Is the tile at (x, y) part of your land?
export const inside = (g: Game, x: number, y: number) => !!g.world.territory[y * W + x];
