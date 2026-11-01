import { describe, expect, test } from 'bun:test';
import { crag, FINE, Relief } from './relief';

// A ramp of corner heights, from flat land on the left to a high peak on the right.
function ramp(w: number, h: number, top: number) {
  const c = new Float32Array((w + 1) * (h + 1));
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) c[j * (w + 1) + i] = (i / w) * top;
  return c;
}

const points = (n: number) => Array.from({ length: n }, (_, i) => [(i * 7.31) % 20, (i * 3.17) % 20] as const);

describe('crags', () => {
  test('leave flat building land alone', () => {
    for (const [x, y] of points(200)) expect(crag(x, y, 0.4)).toBe(0);
  });

  test('roughen mountains', () => {
    const v = points(400).map(([x, y]) => crag(x, y, 3));
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const spread = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    expect(spread).toBeGreaterThan(0.08);
  });

  test('grow bigger higher up, like alpine peaks', () => {
    const spread = (base: number) => {
      const v = points(400).map(([x, y]) => crag(x, y, base));
      return Math.max(...v) - Math.min(...v);
    };
    expect(spread(5)).toBeGreaterThan(spread(1.5) * 1.5);
  });

  test('lift the mountains above the smooth shape', () => {
    const v = points(400).map(([x, y]) => crag(x, y, 5));
    expect(v.reduce((a, b) => a + b, 0) / v.length).toBeGreaterThan(1);
  });

  test('stay smaller than the mountain itself', () => {
    for (const [x, y] of points(200)) expect(Math.abs(crag(x, y, 1.5))).toBeLessThan(1.5);
  });

  test('have no steps', () => {
    for (const [x, y] of points(300))
      for (const base of [0.7, 1.5, 3])
        expect(Math.abs(crag(x + 0.001, y, base + 0.003) - crag(x, y, base))).toBeLessThan(0.02);
  });

  test('are the same every time', () => {
    for (const [x, y] of points(50)) expect(crag(x, y, 2)).toBe(crag(x, y, 2));
  });
});

describe('crags near home', () => {
  test('add no extra height on top of the smooth mountain', () => {
    const v = points(400).map(([x, y]) => crag(x, y, 5, 0));
    expect(v.reduce((a, b) => a + b, 0) / v.length).toBeLessThan(0.1);
    expect(Math.max(...v)).toBeLessThan(0.8);
  });

  test('still roughen the mountain', () => {
    const v = points(400).map(([x, y]) => crag(x, y, 5, 0));
    expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(0.6);
  });
});

describe('relief', () => {
  test('has a point every quarter tile', () => {
    expect(FINE).toBe(4);
    const r = new Relief(ramp(8, 6, 0), 8, 6);
    expect(r.heights.length).toBe((8 * FINE + 1) * (6 * FINE + 1));
  });

  test('matches the tile corners on flat land', () => {
    const r = new Relief(ramp(8, 8, 0.4), 8, 8);
    for (let i = 0; i <= 8; i++) expect(r.at(i, 3)).toBeCloseTo((i / 8) * 0.4, 5);
    expect(r.at(2.5, 3.5)).toBeCloseTo(0.125, 5);
  });

  test('the height between points lies on the mesh', () => {
    const r = new Relief(ramp(8, 8, 6), 8, 8);
    const n = 8 * FINE + 1;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) expect(r.at(i / FINE, j / FINE)).toBeCloseTo(r.heights[j * n + i], 5);
    const a = r.heights[10 * n + 20], b = r.heights[10 * n + 21];
    expect(r.at(20.5 / FINE, 10 / FINE)).toBeCloseTo((a + b) / 2, 5);
  });

  test('clamps points outside the map to its edge', () => {
    const r = new Relief(ramp(8, 8, 0.4), 8, 8);
    expect(r.at(-3, 2)).toBeCloseTo(r.at(0, 2), 5);
    expect(r.at(20, 2)).toBeCloseTo(r.at(8, 2), 2);
  });

  test('mountains get steeper faces than the smooth slope', () => {
    const r = new Relief(ramp(8, 8, 6), 8, 8);
    const n = 8 * FINE + 1;
    let steepest = 0;
    for (let j = 0; j < n; j++)
      for (let i = (n - 1) / 2; i < n - 1; i++) steepest = Math.max(steepest, (r.heights[j * n + i + 1] - r.heights[j * n + i]) * FINE);
    expect(steepest).toBeGreaterThan(1.5 * (6 / 8));
  });

  test('marks steep faces as rock and leaves flat land bare', () => {
    const r = new Relief(ramp(8, 8, 6), 8, 8);
    const n = 8 * FINE + 1;
    expect(r.rock[4 * n + 1]).toBe(0);
    expect(Math.max(...r.rock.slice(4 * n + (n - 1) / 2, 5 * n))).toBeGreaterThan(0.5);
  });

  test('marks snow above the snow line only', () => {
    const r = new Relief(ramp(8, 8, 6), 8, 8, { snowLine: 2.4 });
    const n = 8 * FINE + 1;
    expect(r.snow[4 * n + 4]).toBe(0);
    expect(Math.max(...r.snow.filter((_, k) => k % n === n - 1))).toBeGreaterThan(0.9);
  });

  test('keeps snow off steep rock faces', () => {
    const r = new Relief(ramp(8, 8, 8), 8, 8, { snowLine: 2.4 });
    const n = r.n, H = r.heights;
    const slope = (k: number) => (Math.abs(H[k + 1] - H[k]) + Math.abs(H[k + n] - H[k])) * FINE;
    const steep = [...H.keys()].filter((k) => k % n < n - 1 && k + n < H.length && H[k] > 4 && slope(k) > 5.5);
    expect(steep.length).toBeGreaterThan(0);
    for (const k of steep) expect(r.snow[k]).toBe(0);
  });

  test('marks deep water below the sea', () => {
    const c = ramp(8, 8, 1).map((v) => v - 0.6);
    const r = new Relief(c, 8, 8, { snowLine: 2.4, sea: -0.04 });
    const n = 8 * FINE + 1;
    expect(r.deep[4 * n]).toBeGreaterThan(0.2);
    expect(r.deep[4 * n + n - 1]).toBe(0);
  });
});

describe('ray hits', () => {
  const r = new Relief(ramp(8, 8, 6), 8, 8);

  test('finds the ground under a ray from above', () => {
    const p = r.hit({ x: 3.3, y: 20, z: 4.6 }, { x: 0, y: -1, z: 0 })!;
    expect(p.x).toBeCloseTo(3.3, 3);
    expect(p.z).toBeCloseTo(4.6, 3);
  });

  test('stops on the first slope a slanted ray meets', () => {
    const o = { x: 0, y: 12, z: 4 }, d = { x: 0.6, y: -0.8, z: 0 };
    const p = r.hit(o, d)!;
    const t = (p.x - o.x) / d.x;
    expect(o.y + d.y * t).toBeCloseTo(r.at(p.x, p.z), 2);
    for (let s = 0; s < t - 0.05; s += 0.05) expect(o.y + d.y * s).toBeGreaterThan(r.at(o.x + d.x * s, o.z + d.z * s));
  });

  test('misses when the ray never meets the map', () => {
    expect(r.hit({ x: 3, y: 20, z: 4 }, { x: 0, y: 1, z: 0 })).toBeNull();
    expect(r.hit({ x: -30, y: 20, z: 4 }, { x: 0, y: -1, z: 0 })).toBeNull();
  });
});

describe('relief around home', () => {
  const tall = new Float32Array(41 * 41).fill(5);
  // The mean height of a 4 by 4 tile patch.
  const mean = (r: Relief, x0: number, y0: number) => {
    let sum = 0;
    for (let y = y0; y < y0 + 4; y += 0.25) for (let x = x0; x < x0 + 4; x += 0.25) sum += r.at(x, y);
    return sum / 256;
  };

  test('keeps mountains near home low and lets far ones stand tall', () => {
    const r = new Relief(tall, 40, 40, { home: { x: 5, y: 5 } });
    expect(mean(r, 4, 4)).toBeLessThan(5.1);
    expect(mean(r, 30, 30)).toBeGreaterThan(6);
  });

  test('makes every mountain tall when there is no home', () => {
    expect(mean(new Relief(tall, 40, 40), 4, 4)).toBeGreaterThan(6);
  });
});
