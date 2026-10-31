import { describe, expect, test } from 'bun:test';
import { smoothPath } from '../src/curve';
import type { P } from '../src/path';

// The sharpest turn along a path, in radians. 0 means straight.
const sharpest = (pts: P[]) => {
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    const b = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    max = Math.max(max, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))));
  }
  return max;
};

// How far a point lies from the nearest segment of a path.
const distance = (p: P, path: P[]) => {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    min = Math.min(min, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return min;
};

const corner = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }];

describe('smoothPath', () => {
  test('leaves paths of two points or fewer alone', () => {
    expect(smoothPath([])).toEqual([]);
    expect(smoothPath([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
    expect(smoothPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  });

  test('keeps both ends where they are', () => {
    const out = smoothPath(corner);
    expect(out[0]).toEqual(corner[0]);
    expect(out.at(-1)).toEqual(corner.at(-1)!);
  });

  test('keeps a straight road straight', () => {
    const line = [0, 1, 2, 3, 4].map((x) => ({ x, y: 3 }));
    for (const p of smoothPath(line)) expect(p.y).toBe(3);
  });

  test('turns a right-angle corner into gentle bends', () => {
    expect(sharpest(corner)).toBeCloseTo(Math.PI / 2);
    expect(sharpest(smoothPath(corner))).toBeLessThan(Math.PI / 8);
  });

  test('more passes give a smoother curve', () => {
    expect(sharpest(smoothPath(corner, 4))).toBeLessThan(sharpest(smoothPath(corner, 1)));
  });

  test('stays close to the tiles the road runs over', () => {
    const zigzag = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }, { x: 4, y: 0 }];
    for (const path of [corner, zigzag]) {
      for (const p of smoothPath(path)) expect(distance(p, path)).toBeLessThan(0.36);
    }
  });
});
