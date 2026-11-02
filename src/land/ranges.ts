// Mountain ranges, from map version 6. High ground folds into long, bending ridges that run side
// by side with valleys between them, and the guaranteed mountains stretch into short ridges.
import { rng, noise } from './noise';

// Ridges start to show on land this high, and are full strength from FULL up.
const LOW = 0.45;
const FULL = 0.62;
// How far apart the ridges run, in tiles.
const SPACING = 10;
// How much the ridges bend: how many ridge spacings they drift, and how big the bends are in tiles.
const BEND = 1.2;
const BEND_CELL = 14;
// A higher number makes the ridges narrower and the valleys wider.
const SHARP = 1.5;
// How much a ridge lifts the land at its top.
const LIFT = 0.3;
// How much a valley lowers the land: at least DROP, and deeper in high ground, where it cuts down
// CARVE of the way to VALLEY. So a big high plateau breaks up into ridges too.
const DROP = 0.15;
const CARVE = 0.9;
const VALLEY = 0.6;
// How many times the land is smoothed, so ridges rise gently and never form a cliff.
const SMOOTH = 4;

// Shapes land heights into ridges and valleys. `base` gives the land height at (x, y) before
// the ridges, and the returned function gives it after. Ridges rise only from high land.
// `strength` gives how strongly ridges show at (x, y), from 0 to 1, so they can fade out where
// the land must stay gentle. The map is `W` by `H` tiles. It takes its own random numbers, so the rest of the map keeps its shape.
export function ranges(seed: number, base: (x: number, y: number) => number, strength: (x: number, y: number) => number, W: number, H: number) {
  const rand = rng(seed ^ 0x7a9e);
  const angle = rand() * Math.PI, bend = noise(rand, BEND_CELL, W, H);
  const ax = Math.cos(angle), ay = Math.sin(angle);
  let land = new Float64Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const h = base(x, y);
      const on = Math.min(1, Math.max(0, (h - LOW) / (FULL - LOW))) * strength(x, y);
      // Waves across the map, at right angles to `angle`. Each crest of a wave is a ridge.
      const wave = ((x * ax + y * ay) / SPACING + (bend(x, y) - 0.5) * BEND) * 2 * Math.PI;
      const crest = ((1 + Math.sin(wave)) / 2) ** SHARP;
      const cut = Math.max(DROP, CARVE * (h - VALLEY));
      land[y * W + x] = h + on * (crest * LIFT - (1 - crest) * cut);
    }
  for (let i = 0; i < SMOOTH; i++) land = blur(land, W, H);
  return (x: number, y: number) => land[y * W + x];
}

// Each height becomes the average of itself and the heights around it.
function blur(v: Float64Array, W: number, H: number) {
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          sum += v[ny * W + nx];
          n++;
        }
      out[y * W + x] = sum / n;
    }
  return out;
}

type Point = { x: number; y: number };

// How far (x, y) is from the ridge line that runs straight from `a` to `b`.
export function toRidge(x: number, y: number, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len)) : 0;
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
}
