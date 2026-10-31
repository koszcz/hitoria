import { describe, expect, test } from 'bun:test';
import { DAY_LENGTH, clock, daylightAt } from './daylight';

const NOON = 0.5, MIDNIGHT = 0;

describe('daylight', () => {
  test('noon is brighter than midnight', () => {
    const noon = daylightAt(NOON), night = daylightAt(MIDNIGHT);
    expect(noon.sunPower).toBeGreaterThan(night.sunPower * 2);
    expect(noon.hemi).toBeGreaterThan(night.hemi);
  });

  test('night is dim but never black, so you can keep playing', () => {
    const night = daylightAt(MIDNIGHT);
    expect(night.sunPower).toBeGreaterThan(0.3);
    expect(night.hemi).toBeGreaterThan(0.5);
  });

  test('dawn and dusk are warm, and night is cool blue', () => {
    for (const f of [0.27, 0.73]) {
      const { sun } = daylightAt(f);
      expect(sun.r).toBeGreaterThan(sun.b * 1.5);
    }
    const { sun, sky } = daylightAt(MIDNIGHT);
    expect(sun.b).toBeGreaterThan(sun.r);
    expect(sky.b).toBeGreaterThan(sky.r);
  });

  test('at midday the sun shines from the upper left of the screen, as before', () => {
    const { dir } = daylightAt(NOON);
    const old = { x: -0.9, y: 1.3, z: 0.35 }, len = Math.hypot(old.x, old.y, old.z);
    expect(dir.x).toBeCloseTo(old.x / len, 3);
    expect(dir.y).toBeCloseTo(old.y / len, 3);
    expect(dir.z).toBeCloseTo(old.z / len, 3);
  });

  test('the sun is low at dawn and dusk, and swings across the sky', () => {
    const noon = daylightAt(NOON).dir, dawn = daylightAt(0.25).dir, dusk = daylightAt(0.75).dir;
    expect(dawn.y).toBeLessThan(noon.y * 0.5);
    expect(dusk.y).toBeLessThan(noon.y * 0.5);
    expect(dawn.y).toBeGreaterThan(0); // shadows stay a sane length
    expect(dawn.angleTo(dusk)).toBeGreaterThan(Math.PI / 3);
  });

  test('the light changes smoothly all day and night, with no jumps', () => {
    const steps = 2000;
    let prev = daylightAt(0);
    for (let i = 1; i <= steps; i++) {
      const l = daylightAt(i / steps);
      expect(Math.abs(l.sunPower - prev.sunPower)).toBeLessThan(0.02);
      expect(Math.abs(l.hemi - prev.hemi)).toBeLessThan(0.02);
      expect(l.dir.angleTo(prev.dir)).toBeLessThan(0.02);
      expect(Math.abs(l.sky.r - prev.sky.r) + Math.abs(l.sky.g - prev.sky.g) + Math.abs(l.sky.b - prev.sky.b)).toBeLessThan(0.02);
      prev = l;
    }
  });
});

describe('clock', () => {
  test('a new game starts in the morning', () => {
    expect(clock(0)).toBeGreaterThan(0.25);
    expect(clock(0)).toBeLessThan(0.5);
  });

  test('a day lasts 8 minutes of game time, then repeats', () => {
    expect(DAY_LENGTH).toBe(480);
    expect(clock(123 + DAY_LENGTH)).toBeCloseTo(clock(123), 9);
    expect(clock(DAY_LENGTH / 2)).toBeCloseTo((clock(0) + 0.5) % 1, 9);
  });
});
