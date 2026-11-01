// Where the sea meets the land: how far each tile lies from the shore, and which tiles the
// foam runs along. Tiles off the map count as open sea.
import type { Terrain } from '../world';

// The part of the map these functions read, so tests can pass a small hand-made map.
export interface Shoreland {
  inside(x: number, y: number): boolean;
  at(x: number, y: number): { t: Terrain };
}

// Farther than this from land, a tile counts as open sea.
export const FAR = 8;

const wet = (m: Shoreland, x: number, y: number) => !m.inside(x, y) || m.at(x, y).t === 'water';

// For each tile, the number of steps (diagonal steps too) to the nearest land tile, up to FAR.
// Land tiles are 0.
export function landDistance(m: Shoreland, w: number, h: number) {
  const d = new Uint8Array(w * h).fill(FAR);
  let edge: number[] = [];
  for (let i = 0; i < w * h; i++)
    if (!wet(m, i % w, Math.floor(i / w))) {
      d[i] = 0;
      edge.push(i);
    }
  for (let step = 1; step < FAR && edge.length; step++) {
    const next: number[] = [];
    for (const i of edge) {
      const x = i % w, y = Math.floor(i / w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = ny * w + nx;
          if (d[k] > step) {
            d[k] = step;
            next.push(k);
          }
        }
    }
    edge = next;
  }
  return d;
}

// Tiles where water and land touch, on either side of the line. The foam is drawn over these.
export function shoreBand(m: Shoreland, w: number, h: number) {
  const out: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const self = wet(m, x, y);
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++)
        for (let dx = -1; dx <= 1 && !touches; dx++) touches = wet(m, x + dx, y + dy) !== self;
      if (touches) out.push(y * w + x);
    }
  return out;
}
