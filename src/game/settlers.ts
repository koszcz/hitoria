// Settlers leaving and entering their home (the HQ or a landing harbour), and how each one walks through their list of tasks.
import { findPath } from '../path';
import { Role, SPEED } from './defs';
import type { Game } from './game';
import { walkCost, walkSpeed } from './land';
import type { Building, Settler } from './types';
import { addPool, homeOf, isHome, poolOf } from './homes';
import { tread } from './wear';
import { idle } from './work';
import { hypot } from '../math/exact';

// A settler comes out of the home that can walk to building `to`. The HQ sends one when no home
// can, or when `to` is not given.
export function takeSettler(g: Game, role: Role, to?: Building): Settler | null {
  const base = (to && homeOf(g, to)) || g.hq;
  if (poolOf(g, base) <= 0) return null;
  addPool(g, base, -1);
  const s: Settler = {
    id: g.nextId++, role, x: base.x, y: base.y, path: null, tasks: [], carrying: null, job: null,
    home: 0, base: base.id, inside: false, atWork: false, returning: false, walking: false, anim: '', facing: 1, onAbort: null,
  };
  g.settlers.set(s.id, s);
  return s;
}

// A settler couldn't reach their post: send them back inside and let the dispatcher retry later.
export function giveUp(g: Game, s: Settler, b: Building, slot: 'builder' | 'worker') {
  b[slot] = 0;
  b.status = 'Unreachable, retrying soon';
  despawn(g, s);
}

export function sendHome(g: Game, s: Settler) {
  s.atWork = false;
  s.anim = '';
  const b = baseOf(g, s);
  s.tasks = [{ k: 'walk', x: b.x, y: b.y }, { k: 'do', f: () => despawn(g, s) }];
}

// The home a settler came out of. If it is gone, the HQ.
export function baseOf(g: Game, s: Settler) {
  const b = g.buildings.get(s.base);
  return b && isHome(b) ? b : g.hq;
}

export function despawn(g: Game, s: Settler) {
  g.settlers.delete(s.id);
  addPool(g, baseOf(g, s), 1);
}

function abort(s: Settler) {
  s.tasks = [];
  s.path = null;
  s.walking = false;
  s.anim = '';
  const f = s.onAbort;
  s.onAbort = null;
  f?.();
}

export function step(g: Game, s: Settler, dt: number) {
  if (!s.tasks.length) {
    idle(g, s);
    if (!s.tasks.length) return;
  }
  const t = s.tasks[0];
  if (t.k === 'do') {
    s.tasks.shift();
    if (t.f() === false) abort(s);
  } else if (t.k === 'work') {
    s.anim = t.anim ?? '';
    t.t -= dt;
    if (t.t <= 0) {
      s.tasks.shift();
      s.anim = '';
    }
  } else {
    if (!s.path) {
      const p = t.via ? [...t.via] : findPath(g.world, Math.round(s.x), Math.round(s.y), t.x, t.y, g.passable, 6000, (x, y) => walkCost(g, x, y));
      if (!p) return abort(s);
      if (t.adjacent) p.pop();
      s.path = p;
      s.inside = false;
    }
    s.walking = true;
    s.anim = '';
    let left = SPEED * dt * walkSpeed(g, Math.round(s.x), Math.round(s.y));
    while (left > 0 && s.path.length) {
      const n = s.path[0];
      const dx = n.x - s.x, dy = n.y - s.y;
      const d = hypot(dx, dy);
      if (d > 0.01) s.facing = dx - dy >= 0 ? 1 : -1;
      if (d <= left) {
        s.x = n.x;
        s.y = n.y;
        s.path.shift();
        tread(g, n.x, n.y);
        left -= d;
      } else {
        s.x += (dx / d) * left;
        s.y += (dy / d) * left;
        left = 0;
      }
    }
    if (!s.path.length) {
      s.path = null;
      s.walking = false;
      s.tasks.shift();
    }
  }
}
