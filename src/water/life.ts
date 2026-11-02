// Fish that jump now and then, and ducks that paddle near the shore: where they live and where
// each one is at a moment in time. Nothing here changes the game; it is only there to look at.
import { hash } from '../render/kit';

export interface Spot { x: number; y: number } // the middle of a tile, in tile coordinates

// Picks up to `count` water tiles whose distance to land (from `landDistance`) is between `near`
// and `far`, at least `apart` tiles from each other. Spots close to `home` (the start) come first,
// so the player sees them, with some randomness. The same map always gives the same spots.
export function pickSpots(dist: Uint8Array, w: number, home: Spot, near: number, far: number, apart: number, count: number, salt: number): Spot[] {
  const free: number[] = [];
  for (let i = 0; i < dist.length; i++) if (dist[i] >= near && dist[i] <= far) free.push(i);
  const away = (i: number) => Math.hypot((i % w) + 0.5 - home.x, Math.floor(i / w) + 0.5 - home.y);
  const order = free.map((i) => [away(i) * (0.5 + hash(i * 0.37 + salt, salt * 1.9)), i]).sort((a, b) => a[0] - b[0]);
  const out: Spot[] = [];
  for (const [, i] of order) {
    if (out.length >= count) break;
    const s = { x: (i % w) + 0.5, y: Math.floor(i / w) + 0.5 };
    if (out.every((o) => Math.hypot(o.x - s.x, o.y - s.y) >= apart)) out.push(s);
  }
  return out;
}

// --- fish ------------------------------------------------------------------

export const JUMP = 0.9; // seconds a fish spends in the air
export const SPLASH = 1.2; // seconds the ring on the water takes to fade
export const JUMP_HIGH = 0.32; // how high a fish leaps, in tiles
const JUMP_LONG = 0.55; // how far a fish travels in one leap
const ROAM = 0.8; // each leap starts this far at most from the fish's spot

// How many seconds pass between two leaps of fish `i`. Each fish keeps its own pace.
export const fishPause = (i: number) => 6 + hash(i, 11) * 8;

export interface Leap {
  x: number;
  y: number;
  z: number; // height above the water
  heading: number; // as for settlers: atan2 of the x and y steps
  pitch: number; // nose up while rising, nose down while falling
  air: boolean; // false once the fish is back under water
  splash: number; // seconds since it last hit the water, or -1 if no ring is showing
  sx: number; // where it last hit the water
  sy: number;
}

// Where fish `i` from `spot` is at time `now`.
export function fishAt(spot: Spot, i: number, now: number): Leap {
  const pause = fishPause(i);
  const t = now + hash(i, 12) * pause;
  const n = Math.floor(t / pause), into = t - n * pause;
  const path = (k: number) => {
    const a = hash(k, i + 13) * Math.PI * 2, r = hash(i + 14, k) * ROAM, heading = hash(k + 15, i) * Math.PI * 2;
    const x0 = spot.x + Math.cos(a) * r, y0 = spot.y + Math.sin(a) * r;
    return { x0, y0, heading, dx: Math.sin(heading) * JUMP_LONG, dy: Math.cos(heading) * JUMP_LONG };
  };
  const p = path(n);
  const f = Math.min(1, into / JUMP);
  // The ring shows where the last leap came down: this one if it is over, else the one before.
  const last = into >= JUMP ? p : path(n - 1);
  const since = into >= JUMP ? into - JUMP : into + pause - JUMP;
  return {
    x: p.x0 + p.dx * f,
    y: p.y0 + p.dy * f,
    z: JUMP_HIGH * 4 * f * (1 - f),
    heading: p.heading,
    pitch: (0.5 - f) * 2.2,
    air: into < JUMP,
    splash: since < SPLASH ? since : -1,
    sx: last.x0 + last.dx,
    sy: last.y0 + last.dy,
  };
}

// --- ducks -----------------------------------------------------------------

export const PADDLE = 0.9; // a duck stays this close to its flock's spot, in tiles
const LAG = 0.55; // radians each duck trails behind the one in front

export interface Paddle {
  x: number;
  y: number;
  heading: number;
  dabble: boolean; // tail up and head under water, looking for food
}

// Where duck `k` of the flock at `spot` (flock number `f`) is at time `now`. The flock swims
// slow loops, each duck a little behind the one ahead.
export function duckAt(spot: Spot, f: number, k: number, now: number): Paddle {
  const speed = 0.12 + hash(f, 21) * 0.08, dir = hash(f, 22) < 0.5 ? -1 : 1;
  const a = dir * (now * speed + hash(f, 23) * 6.3) - dir * k * LAG;
  const rx = PADDLE * (0.7 + hash(f, 24) * 0.3), ry = PADDLE * (0.45 + hash(f, 25) * 0.3);
  const wobble = Math.sin(now * 0.31 + f) * 0.08;
  const x = spot.x + Math.cos(a) * (rx - wobble), y = spot.y + Math.sin(a) * (ry - wobble);
  // The way it swims is along the loop: the step from a moment ago to now.
  const vx = -Math.sin(a) * rx * dir, vy = Math.cos(a) * ry * dir;
  const dabble = Math.sin(now * 0.5 + f * 2.1 + k * 1.7) > 0.93;
  return { x, y, heading: Math.atan2(vx, vy), dabble };
}

// Ducks fly south for the winter: none on the water once snow lies on the ground.
export const ducksHome = (snow: number) => snow < 0.3;

// --- the hidden cove ---------------------------------------------------------

// Fish and ducks gather in the hidden cove's lagoon, where `cove` marks the water. Returns a copy
// of `dist` where every tile outside the lagoon counts as land, so pickSpots picks spots in the
// lagoon only, and the lagoon's middle. Returns null when the map has no lagoon.
export function inCove(dist: Uint8Array, cove: Uint8Array, w: number): { dist: Uint8Array; mid: Spot } | null {
  const only = dist.map((d, i) => (cove[i] ? d : 0));
  let n = 0, x = 0, y = 0;
  cove.forEach((c, i) => {
    if (!c) return;
    n++;
    x += (i % w) + 0.5;
    y += Math.floor(i / w) + 0.5;
  });
  return n ? { dist: only, mid: { x: x / n, y: y / n } } : null;
}
