// Would a new building cut another one off? Nobody walks through a building, so a building placed in
// a narrow gap can close the last path between another building and every HQ or harbour.
import type { Game } from './game';
import { homes, isHome } from './homes';
import { passable } from './land';
import { walkNow } from './walking';

export const CUTS_OFF = 'This would cut off another building from your HQ';

const FRESH = 2; // seconds of game time an answer is kept, unless a building is placed or removed

// The placement preview asks about the tile under the pointer every frame, so keep the last answer.
const kept = new WeakMap<Game, { x: number; y: number; t: number; n: number; id: number; cuts: boolean }>();

// Would a building on tile (x, y) leave a building that settlers can reach now with no way to a home?
export function cutsOff(g: Game, x: number, y: number): boolean {
  const k = kept.get(g);
  if (k && k.x === x && k.y === y && k.n === g.buildings.size && k.id === g.nextId && g.time - k.t < FRESH && g.time >= k.t) return k.cuts;
  const cuts = !walkersGoAround(g, x, y) && strands(g, y * g.world.w + x);
  kept.set(g, { x, y, t: g.time, n: g.buildings.size, id: g.nextId, cuts });
  return cuts;
}

function strands(g: Game, tile: number) {
  const hs = homes(g);
  const before = hs.map((h) => walkNow(g, h));
  const after = hs.map((h) => walkNow(g, h, tile));
  for (const b of g.buildings.values()) {
    if (isHome(b)) continue;
    const i = b.y * g.world.w + b.x;
    const reached = before.some((d) => d[i] < Infinity);
    if (reached && !after.some((d) => d[i] < Infinity)) return true;
  }
  return false;
}

// The 8 tiles around a tile, in order round the ring.
const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

// A quick test that needs no search of the whole map. If the open tiles around (x, y) still join up
// with (x, y) closed, and every building beside it can still step onto one of them, any path that
// went through (x, y) can go around it. When this says no, the full search decides.
export function walkersGoAround(g: Game, x: number, y: number) {
  const ring = (dx: number, dy: number) => (dx !== 0 || dy !== 0) && g.world.inside(x + dx, y + dy);
  const open = (dx: number, dy: number) => ring(dx, dy) && passable(g, x + dx, y + dy);
  const into = (dx: number, dy: number) => ring(dx, dy) && g.world.at(x + dx, y + dy).b !== 0;
  // Can a walker step from one tile of the ring to the next? A diagonal step needs both corners open.
  const step = (ax: number, ay: number, bx: number, by: number) =>
    Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1 && (ax === bx || ay === by || (open(bx, ay) && open(ax, by)));
  const opens = RING.filter(([dx, dy]) => open(dx, dy));
  if (!opens.length) return false;
  const seen = new Set([opens[0]]);
  for (const todo = [opens[0]]; todo.length; ) {
    const [ax, ay] = todo.pop()!;
    for (const o of opens)
      if (!seen.has(o) && step(ax, ay, o[0], o[1])) {
        seen.add(o);
        todo.push(o);
      }
  }
  if (seen.size < opens.length) return false;
  return RING.every(([dx, dy]) => !into(dx, dy) || opens.some(([ox, oy]) => step(dx, dy, ox, oy)));
}
