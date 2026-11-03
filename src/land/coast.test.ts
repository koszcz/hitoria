// Ragged island coasts: from map version 15, the second island and the far island each have their
// own outline, with capes, deep bays and sometimes a long arm. Older maps keep their round islands.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { COAST_SALT, MIN, RAGGED_FROM, SHORE, coastOf } from './coast';
import { HUGE_ISLE } from './isle';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const BEFORE = RAGGED_FROM - 1;
const SIZE = HUGE_ISLE.size;

// A short hash of the land, as in hidden.test.ts.
const round = (n: number) => Number(n.toPrecision(12));
const fingerprint = (o: unknown) =>
  Bun.hash(JSON.stringify(o, (_, v) => (typeof v === 'number' ? round(v) : typeof v === 'string' ? v.replace(/\d+\.\d+/g, (n) => String(round(+n))) : v))).toString();

// For 72 directions around the island's centre, how far out its farthest land lies, in tiles.
function reaches(w: World, isle: IsleName) {
  const c = isle === 'other' ? w.isle! : w.far!, out: number[] = [];
  for (let a = 0; a < 72; a++) {
    const ux = Math.cos((a * Math.PI) / 36), uy = Math.sin((a * Math.PI) / 36);
    let far = 0;
    for (let d = 0; d < SIZE + 2; d += 0.25) {
      const x = Math.floor(c.x + ux * d), y = Math.floor(c.y + uy * d);
      if (w.at(x, y).t !== 'water' && w.isleAt(x, y) === isle) far = d;
    }
    out.push(far);
  }
  return out;
}

const around = (n: number) => Array.from({ length: n }, (_, i) => ({ x: Math.cos((2 * Math.PI * i) / n), y: Math.sin((2 * Math.PI * i) / n) }));

describe('ragged coasts by map version', () => {
  test('new maps use map version 15', () => {
    expect(MAP_VERSION).toBe(15);
    expect(RAGGED_FROM).toBe(15);
  });

  test('map version 14 still builds the same land, ore and bare rock', () => {
    const w1 = new World(1, BEFORE), w2 = new World(12345, BEFORE);
    expect(fingerprint(w1.tiles)).toBe('9231575112631075589');
    expect(fingerprint(w2.tiles)).toBe('7238337019077058952');
    expect(Bun.hash(w1.ore.join('')).toString()).toBe('8939277476875537225');
    expect(Bun.hash(w2.ore.join('')).toString()).toBe('12437923947410541663');
    expect(Bun.hash(w1.bare.join('')).toString()).toBe('2181277025515086485');
    expect(Bun.hash(w2.bare.join('')).toString()).toBe('18362262837194503189');
  });
});

describe('an island\'s outline', () => {
  test('never reaches past the island\'s size, so the strait around it stays open', () => {
    for (const seed of SEEDS) {
      const coast = coastOf(seed, COAST_SALT.other, SIZE);
      for (const u of around(360)) for (const d of [SIZE, SIZE + 1, SIZE + 3]) expect(coast.at(u.x * d, u.y * d)).toBeGreaterThanOrEqual(SHORE - 1e-9);
    }
  });

  test('never cuts closer to the centre than half its size, so the island stays whole', () => {
    for (const seed of SEEDS) {
      const coast = coastOf(seed, COAST_SALT.other, SIZE);
      for (const u of around(360)) expect(coast.at(u.x * MIN * SIZE * 0.99, u.y * MIN * SIZE * 0.99)).toBeLessThan(1);
    }
  });

  test('is different for each seed and each island', () => {
    const shape = (seed: number, salt: number) => around(36).map((u) => coastOf(seed, salt, SIZE).at(u.x * 12, u.y * 12).toFixed(2)).join();
    const shapes = new Set(SEEDS.flatMap((s) => [shape(s, COAST_SALT.other), shape(s, COAST_SALT.far)]));
    expect(shapes.size).toBe(SEEDS.length * 2);
  });

  test('about half the islands get a long arm with sea on both sides', () => {
    const arms = Array.from({ length: 100 }, (_, i) => coastOf(i + 1, COAST_SALT.other, SIZE)).filter((c) => c.arm);
    expect(arms.length).toBeGreaterThanOrEqual(35);
    expect(arms.length).toBeLessThanOrEqual(65);
    for (const { at, arm } of arms) {
      const a = arm!, d = 0.8 * SIZE, side = { x: -a.y * 4, y: a.x * 4 };
      expect(at(a.x * d, a.y * d)).toBeLessThan(SHORE);
      expect(at(a.x * d + side.x, a.y * d + side.y)).toBeGreaterThan(1);
      expect(at(a.x * d - side.x, a.y * d - side.y)).toBeGreaterThan(1);
    }
  });
});

describe('ragged coasts', () => {
  for (const seed of SEEDS)
    for (const isle of ['other', 'far'] as const)
      test(`seed ${seed}: the ${isle === 'other' ? 'second' : 'far'} island has capes and a deep bay`, () => {
        const r = reaches(new World(seed), isle);
        expect(Math.max(...r)).toBeGreaterThanOrEqual(0.9 * SIZE);
        expect(Math.min(...r)).toBeLessThanOrEqual(0.65 * SIZE);
      });

  test('older maps keep round islands without a cove: no deep bay', () => {
    // On these seeds, neither island has the cove theme on map version 14.
    for (const seed of [42, 99]) for (const isle of ['other', 'far'] as const) expect(Math.min(...reaches(new World(seed, BEFORE), isle))).toBeGreaterThan(0.8 * SIZE);
  });
});
