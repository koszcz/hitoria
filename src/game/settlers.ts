// Settlers leaving and entering the HQ, and how each one walks through their list of tasks.
import { findPath } from '../path';
import { Role, ROAD_SPEED, SPEED } from './defs';
import type { Game } from './game';
import { passable, walkCost } from './land';
import type { Building, Settler } from './types';
import { idle } from './work';

export function takeSettler(g: Game, role: Role): Settler | null {
  if (g.pool <= 0) return null;
  g.pool--;
  const s: Settler = {
    id: g.nextId++, role, x: g.hq.x, y: g.hq.y, path: null, tasks: [], carrying: null, item: null, ri: 0, since: 0,
    home: 0, inside: false, atWork: false, returning: false, walking: false, anim: '', facing: 1, onAbort: null,
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
  s.tasks = [{ k: 'walk', x: g.hq.x, y: g.hq.y }, { k: 'do', f: () => despawn(g, s) }];
}

export function despawn(g: Game, s: Settler) {
  g.settlers.delete(s.id);
  g.pool++;
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
      const p = t.via ? [...t.via] : findPath(Math.round(s.x), Math.round(s.y), t.x, t.y, g.passable, 6000, (x, y) => walkCost(g, x, y));
      if (!p) return abort(s);
      if (t.adjacent) p.pop();
      s.path = p;
      s.inside = false;
    }
    s.walking = true;
    s.anim = '';
    const here = g.world.at(Math.round(s.x), Math.round(s.y));
    let left = SPEED * dt * (here.road || here.flag ? ROAD_SPEED : 1);
    while (left > 0 && s.path.length) {
      const n = s.path[0];
      const dx = n.x - s.x, dy = n.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01) s.facing = dx - dy >= 0 ? 1 : -1;
      if (d <= left) {
        s.x = n.x;
        s.y = n.y;
        s.path.shift();
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
