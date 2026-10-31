// Wild animals: where they live when a game starts, how they roam, and how they step aside for settlers.
import { findPath } from '../path';
import { rng, W, H } from '../world';
import type { Game } from './game';
import type { Animal, AnimalKind } from './types';

const HERDS = 3; // deer herds of 2 or 3
const HARES = 5;
const FOXES = 3;
const AWAY = 6; // animals start at least this far from the HQ

export function spawnAnimals(g: Game) {
  const rand = rng(g.seed ^ 0xa11a);
  const pick = (ok: (x: number, y: number) => boolean) => {
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(rand() * W), y = Math.floor(rand() * H);
      if (open(g, x, y) && ok(x, y)) return { x, y };
    }
    return null;
  };
  const add = (kind: AnimalKind, x: number, y: number) => {
    const a: Animal = { id: g.animals.size + 1, kind, x, y, home: { x, y }, path: null, wait: rand() * 4, fleeing: false, facing: 1 };
    g.animals.set(a.id, a);
  };
  for (let i = 0; i < HERDS; i++) {
    const c = pick((x, y) => treesNear(g, x, y, 2) === 0);
    if (!c) continue;
    const size = 2 + Math.floor(rand() * 2);
    for (let k = 0, n = 0; k < 20 && n < size; k++) {
      const x = c.x + Math.floor(rand() * 3) - 1, y = c.y + Math.floor(rand() * 3) - 1;
      if (!open(g, x, y) || [...g.animals.values()].some((a) => a.x === x && a.y === y)) continue;
      add('deer', x, y);
      n++;
    }
  }
  for (let i = 0; i < HARES; i++) {
    const c = pick(() => true);
    if (c) add('hare', c.x, c.y);
  }
  for (let i = 0; i < FOXES; i++) {
    const c = pick((x, y) => treesNear(g, x, y, 1) > 0);
    if (c) add('fox', c.x, c.y);
  }
}

// Open grass an animal can stand on, away from the HQ.
function open(g: Game, x: number, y: number) {
  if (!g.world.inside(x, y) || !g.passable(x, y)) return false;
  return g.world.at(x, y).t === 'grass' && Math.hypot(x - g.hq.x, y - g.hq.y) >= AWAY;
}

function treesNear(g: Game, x: number, y: number, r: number) {
  let n = 0;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (g.world.inside(x + dx, y + dy) && g.world.at(x + dx, y + dy).tree) n++;
  return n;
}

// How far an animal roams from its home spot, in tiles.
export const ROAM = 4;
// Walking speed in tiles per second, and how close a settler may come before the animal steps aside.
export const ANIMAL: Record<AnimalKind, { speed: number; shy: number }> = {
  deer: { speed: 1.1, shy: 2.5 },
  hare: { speed: 1.4, shy: 2 },
  fox: { speed: 1.2, shy: 2.5 },
};
const FLEE_SPEED = 2.2; // multiplier while stepping aside
const FLEE = 3; // how far an animal steps aside, in tiles

export function stepAnimal(g: Game, a: Animal, dt: number) {
  const s = closeSettler(g, a);
  if (s && !a.fleeing) flee(g, a, s);
  if (!a.path) {
    a.wait -= dt;
    if (a.wait > 0) return;
    a.path = roam(g, a);
    if (!a.path) {
      a.wait = 1;
      return;
    }
  }
  let left = ANIMAL[a.kind].speed * (a.fleeing ? FLEE_SPEED : 1) * dt;
  while (left > 0 && a.path.length) {
    const n = a.path[0];
    const dx = n.x - a.x, dy = n.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0.01) a.facing = dx - dy >= 0 ? 1 : -1;
    if (d <= left) {
      a.x = n.x;
      a.y = n.y;
      a.path.shift();
      left -= d;
    } else {
      a.x += (dx / d) * left;
      a.y += (dy / d) * left;
      left = 0;
    }
  }
  if (!a.path.length) {
    a.path = null;
    a.fleeing = false;
    a.wait = 2 + Math.random() * 5; // graze a while
  }
}

// A path to a random free tile near home, or null if none was found this time.
function roam(g: Game, a: Animal) {
  for (let i = 0; i < 6; i++) {
    const x = a.home.x + Math.round((Math.random() * 2 - 1) * ROAM);
    const y = a.home.y + Math.round((Math.random() * 2 - 1) * ROAM);
    if (Math.hypot(x - a.home.x, y - a.home.y) > ROAM) continue;
    const p = pathTo(g, a, x, y);
    if (p) return p;
  }
  return null;
}

// Step aside: walk a few tiles straight away from the settler, staying near home.
function flee(g: Game, a: Animal, s: { x: number; y: number }) {
  const away = Math.atan2(a.y - s.y, a.x - s.x);
  for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const x = Math.round(a.x + Math.cos(away + turn) * FLEE), y = Math.round(a.y + Math.sin(away + turn) * FLEE);
    if (Math.hypot(x - a.home.x, y - a.home.y) > ROAM + 2) continue;
    const p = pathTo(g, a, x, y);
    if (!p) continue;
    a.path = p;
    a.fleeing = true;
    a.wait = 0;
    return;
  }
}

function pathTo(g: Game, a: Animal, x: number, y: number) {
  if (!g.world.inside(x, y) || !g.passable(x, y)) return null;
  const p = findPath(Math.round(a.x), Math.round(a.y), x, y, g.passable, 300);
  return p && p.length ? p : null;
}

function closeSettler(g: Game, a: Animal) {
  const shy = ANIMAL[a.kind].shy;
  for (const s of g.settlers.values())
    if (!s.inside && Math.hypot(s.x - a.x, s.y - a.y) < shy) return s;
  return null;
}
