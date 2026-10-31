// Worn paths: each footstep wears the grass toward dirt, and paths nobody walks fade back to grass.
import { W } from '../world';
import { FADE_DELAY, FADE_TIME, WEAR_STEP } from './defs';
import type { Game } from './game';

// How many shades of wear the ground shows. The look counter changes only when a tile changes shade.
const SHADES = 6;
const shade = (w: number) => Math.round(w * SHADES);

// Only open ground wears. Roads and fields have their own look, and buildings stand on theirs.
function wearable(g: Game, x: number, y: number) {
  if (!g.world.inside(x, y)) return false;
  const t = g.world.at(x, y);
  return (t.t === 'grass' || t.t === 'sand') && !t.road && !t.flag && !t.field && !t.b;
}

// A settler stepped onto (x, y).
export function tread(g: Game, x: number, y: number) {
  if (!wearable(g, x, y)) return;
  const i = y * W + x, was = g.wear[i];
  g.wear[i] = Math.min(1, was + WEAR_STEP);
  g.trod[i] = g.time;
  if (shade(g.wear[i]) !== shade(was)) g.worn++;
}

// Called once a second. Paths that nobody has walked for FADE_DELAY seconds fade over FADE_TIME.
export function fade(g: Game) {
  const { wear, trod } = g;
  let changed = false;
  for (let i = 0; i < wear.length; i++) {
    const was = wear[i];
    if (!was || g.time - trod[i] < FADE_DELAY) continue;
    wear[i] = Math.max(0, was - 1 / FADE_TIME);
    if (wear[i] < 1e-4) wear[i] = 0;
    if (shade(wear[i]) !== shade(was)) changed = true;
  }
  if (changed) g.worn++;
}
