import { describe, expect, test } from 'bun:test';
import { JUMP, JUMP_HIGH, PADDLE, SPLASH, duckAt, ducksHome, fishAt, fishPause, inCove, pickSpots } from './life';
import { landDistance } from './shore';
import { World } from '../world';
import { HUGE_SIZE as W } from '../land/size';

const H = W;

const world = new World(1);
const dist = landDistance(world, W, H);
const HOME = { x: W / 2, y: H / 2 };

describe('pickSpots', () => {
  const spots = pickSpots(dist, W, HOME, 2, 5, 4, 12, 1);

  test('picks water tiles at the asked distance from land', () => {
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      const d = dist[Math.floor(s.y) * W + Math.floor(s.x)];
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(5);
      expect(world.at(Math.floor(s.x), Math.floor(s.y)).t).toBe('water');
    }
  });

  test('keeps spots apart and stops at the count', () => {
    expect(spots.length).toBeLessThanOrEqual(12);
    for (const a of spots) for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(4);
  });

  test('gives the same spots for the same map', () => {
    expect(pickSpots(dist, W, HOME, 2, 5, 4, 12, 1)).toEqual(spots);
  });

  test('spots near home come first', () => {
    const one = pickSpots(dist, W, HOME, 2, 5, 4, 1, 1)[0], far = pickSpots(dist, W, { x: 0, y: 0 }, 2, 5, 4, 1, 1)[0];
    expect(Math.hypot(one.x - HOME.x, one.y - HOME.y)).toBeLessThan(Math.hypot(far.x - HOME.x, far.y - HOME.y));
  });

  test('a different salt gives other spots', () => {
    expect(pickSpots(dist, W, HOME, 2, 5, 4, 12, 2)).not.toEqual(spots);
  });
});

describe('fish', () => {
  const spot = { x: 10.5, y: 10.5 };

  test('a fish leaps once in each pause, for JUMP seconds', () => {
    const pause = fishPause(3);
    let air = 0, leaps = 0, was = false;
    for (let t = 0; t < pause * 10; t += 0.01) {
      const f = fishAt(spot, 3, t);
      if (f.air) air += 0.01;
      if (f.air && !was) leaps++;
      was = f.air;
    }
    expect(leaps).toBeGreaterThanOrEqual(9);
    expect(leaps).toBeLessThanOrEqual(11);
    expect(air / leaps).toBeCloseTo(JUMP, 1);
  });

  test('it rises and falls back to the water', () => {
    let top = 0;
    for (let t = 0; t < 30; t += 0.01) {
      const f = fishAt(spot, 1, t);
      expect(f.z).toBeGreaterThanOrEqual(0);
      top = Math.max(top, f.z);
      if (!f.air) expect(f.z).toBe(0);
    }
    expect(top).toBeCloseTo(JUMP_HIGH, 2);
  });

  test('it stays near its spot', () => {
    for (let t = 0; t < 60; t += 0.1) {
      const f = fishAt(spot, 2, t);
      expect(Math.hypot(f.x - spot.x, f.y - spot.y)).toBeLessThan(1.5);
    }
  });

  test('a ring shows where it came down, then fades', () => {
    let rings = 0;
    for (let t = 0; t < 60; t += 0.05) {
      const f = fishAt(spot, 4, t);
      if (f.splash < 0) continue;
      rings++;
      expect(f.splash).toBeLessThan(SPLASH);
      if (!f.air) {
        // Out of the air, the ring is where the fish now is.
        expect(f.sx).toBeCloseTo(f.x, 5);
        expect(f.sy).toBeCloseTo(f.y, 5);
      }
    }
    expect(rings).toBeGreaterThan(0);
  });

  test('fish keep different paces', () => {
    expect(fishPause(1)).not.toBe(fishPause(2));
  });
});

describe('ducks', () => {
  const spot = { x: 20.5, y: 20.5 };

  test('a duck paddles close to its spot', () => {
    for (let t = 0; t < 200; t += 0.5)
      for (let k = 0; k < 4; k++) {
        const d = duckAt(spot, 3, k, t);
        expect(Math.hypot(d.x - spot.x, d.y - spot.y)).toBeLessThanOrEqual(PADDLE + 0.1);
      }
  });

  test('it faces the way it swims', () => {
    const a = duckAt(spot, 1, 0, 50), b = duckAt(spot, 1, 0, 50.1);
    const way = Math.atan2(b.x - a.x, b.y - a.y);
    const off = Math.atan2(Math.sin(way - a.heading), Math.cos(way - a.heading));
    expect(Math.abs(off)).toBeLessThan(0.2);
  });

  test('ducks in a flock swim apart, not on top of each other', () => {
    const a = duckAt(spot, 2, 0, 10), b = duckAt(spot, 2, 1, 10);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.15);
  });

  test('now and then a duck dabbles', () => {
    let dabbling = 0;
    for (let t = 0; t < 200; t += 0.1) if (duckAt(spot, 0, 0, t).dabble) dabbling++;
    expect(dabbling).toBeGreaterThan(0);
    expect(dabbling).toBeLessThan(2000 * 0.3);
  });

  test('they are away while snow lies on the ground', () => {
    expect(ducksHome(0)).toBe(true);
    expect(ducksHome(1)).toBe(false);
  });
});

describe('fish and ducks in the hidden cove', () => {
  // Seed 1 has the cove on its second island.
  const cove = inCove(dist, world.cove, W)!;

  test('pick spots only in the lagoon', () => {
    const fish = pickSpots(cove.dist, W, cove.mid, 1, 8, 2, 5, 3), ducks = pickSpots(cove.dist, W, cove.mid, 2, 8, 2.5, 2, 4);
    expect(fish.length).toBe(5);
    expect(ducks.length).toBe(2);
    for (const s of [...fish, ...ducks]) expect(world.cove[Math.floor(s.y) * W + Math.floor(s.x)]).toBe(1);
  });

  test('the middle lies on the cove island', () => {
    expect(world.isleAt(cove.mid.x, cove.mid.y)).toBe('other');
  });

  test('a map without a lagoon has no cove spots', () => {
    expect(inCove(dist, new Uint8Array(W * H), W)).toBeNull();
  });
});
