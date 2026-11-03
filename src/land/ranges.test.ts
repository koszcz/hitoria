// Mountain ranges: from map version 6, mountains form long ridges with valleys between them.
import { describe, expect, test } from 'bun:test';
import { World } from '../world';
import { toRidge } from './ranges';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
// Pieces of mountain smaller than this are too small to have a shape.
const BIG = 10;

// Every piece of mountain on the map, as lists of tiles. Tiles touching sideways are one piece.
function mountains(w: World) {
  const W = w.w;
  const seen = new Set<number>();
  const pieces: { x: number; y: number }[][] = [];
  for (let i = 0; i < w.tiles.length; i++) {
    if (seen.has(i) || w.tiles[i].t !== 'mountain') continue;
    const piece: { x: number; y: number }[] = [];
    const todo = [i];
    seen.add(i);
    while (todo.length) {
      const j = todo.pop()!, x = j % W, y = Math.floor(j / W);
      piece.push({ x, y });
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = ny * W + nx;
        if (!w.inside(nx, ny) || seen.has(k) || w.tiles[k].t !== 'mountain') continue;
        seen.add(k);
        todo.push(k);
      }
    }
    pieces.push(piece);
  }
  return pieces;
}

// How long a piece is for its width: 1 for a round blob, higher for a long ridge. It compares
// the spread of its tiles along its longest line with the spread across it.
function stretch(piece: { x: number; y: number }[]) {
  const n = piece.length;
  const mx = piece.reduce((s, p) => s + p.x, 0) / n, my = piece.reduce((s, p) => s + p.y, 0) / n;
  let xx = 0, yy = 0, xy = 0;
  for (const p of piece) {
    xx += (p.x - mx) ** 2 / n;
    yy += (p.y - my) ** 2 / n;
    xy += ((p.x - mx) * (p.y - my)) / n;
  }
  const mid = (xx + yy) / 2, gap = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
  return Math.sqrt((mid + gap) / Math.max(1e-9, mid - gap));
}

// From map version 7, the far island's strait cuts some ranges short, so the tests of a range's
// shape look at map version 6, where ranges began.
const RANGES = 6;

const big = (w: World) => mountains(w).filter((p) => p.length >= BIG);
const average = (ns: number[]) => ns.reduce((s, n) => s + n, 0) / ns.length;

describe('mountain ranges', () => {
  test('a round blob has a stretch of about 1, and a line has more', () => {
    const blob = [];
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) <= 3) blob.push({ x, y });
    expect(stretch(blob)).toBeCloseTo(1, 1);
    const line = Array.from({ length: 12 }, (_, i) => ({ x: i, y: Math.floor(i / 4) }));
    expect(stretch(line)).toBeGreaterThan(3);
  });

  test('mountains are longer for their width than on older maps', () => {
    const now = average(SEEDS.flatMap((s) => big(new World(s)).map(stretch)));
    const before = average(SEEDS.flatMap((s) => big(new World(s, 5)).map(stretch)));
    expect(now).toBeGreaterThan(before + 0.3);
    expect(now).toBeGreaterThan(1.8);
  });

  for (const seed of SEEDS)
    test(`seed ${seed} has a ridge for a start mountain, not a round peak`, () => {
      const w = new World(seed, RANGES);
      const { x: sx, y: sy } = w.start;
      const near = (p: { x: number; y: number }[]) => Math.min(...p.map((t) => Math.hypot(t.x - sx, t.y - sy)));
      const start = mountains(w).sort((a, b) => near(a) - near(b))[0];
      expect(stretch(start)).toBeGreaterThan(1.6);
    });

  // A valley tile is land but not mountain, with mountain on both sides, at most 4 tiles away.
  function valleys(map?: number) {
    let n = 0;
    for (const seed of SEEDS) {
      const w = new World(seed, map);
      const hill = (x: number, y: number) => w.inside(x, y) && w.at(x, y).t === 'mountain';
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < w.w; x++) {
          if (w.at(x, y).t === 'mountain' || w.at(x, y).t === 'water') continue;
          const across = ([dx, dy]: number[]) =>
            [1, -1].every((k) => [1, 2, 3, 4].some((r) => hill(x + dx * r * k, y + dy * r * k)));
          if ([[1, 0], [0, 1], [1, 1], [1, -1]].some(across)) n++;
        }
    }
    return n;
  }

  test('valleys of low land lie between the ridges, far more than on older maps', () => {
    expect(valleys(RANGES)).toBeGreaterThan(valleys(5) * 2);
    // From map version 13, the bigger map draws its noise over more tiles, so the same seeds
    // give other ranges, with a few fewer valleys.
    expect(valleys()).toBeGreaterThan(valleys(5) * 1.6);
  });

  // The second island's mountain was built this steep on purpose. Ridges are never steeper.
  // Sea cliffs on a pine island are cliffs on purpose, so they don't count. Bare rock that a peak
  // hides keeps the height its ground had, so its steps don't count either.
  const STEEPEST = 0.121;
  for (const seed of SEEDS)
    test(`seed ${seed} has no cliff anywhere in its mountains`, () => {
      const w = new World(seed);
      let step = 0, W = w.w;
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < W; x++)
          for (const [nx, ny] of [[x + 1, y], [x, y + 1]])
            if (w.inside(nx, ny) && !w.cliff[y * W + x] && !w.cliff[ny * W + nx] && !w.bare[y * W + x] && !w.bare[ny * W + nx] &&
              (w.at(x, y).t === 'mountain' || w.at(nx, ny).t === 'mountain'))
              step = Math.max(step, Math.abs(w.at(x, y).h - w.at(nx, ny).h));
      expect(step).toBeLessThan(STEEPEST);
    });

  test('toRidge measures the distance to a line between two points', () => {
    const a = { x: 0, y: 0 }, b = { x: 4, y: 0 };
    expect(toRidge(2, 3, a, b)).toBeCloseTo(3);
    expect(toRidge(-3, 4, a, b)).toBeCloseTo(5);
    expect(toRidge(7, 0, a, b)).toBeCloseTo(3);
    expect(toRidge(1, 1, a, a)).toBeCloseTo(Math.SQRT2);
  });
});
