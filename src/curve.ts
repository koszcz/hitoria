import type { P } from './path';

// Rounds the corners of a tile path with Chaikin corner cutting. Each pass replaces every
// corner with two points a quarter of the way along its neighbouring segments. The ends stay
// put, so a road still meets its flags, and straight stretches stay straight.
export function smoothPath(path: P[], passes = 3): P[] {
  let pts = path;
  for (let n = 0; n < passes && pts.length > 2; n++) {
    const next: P[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (i > 0) next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      if (i < pts.length - 2) next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}
