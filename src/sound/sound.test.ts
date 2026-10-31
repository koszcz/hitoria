import { describe, expect, test } from 'bun:test';
import { MuteChoice } from './mute';
import { mix, waterShare } from './mix';

// A browser store that keeps values in memory.
function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('MuteChoice', () => {
  test('sound is on the first time you play', () => {
    expect(new MuteChoice(memory()).muted).toBe(false);
  });

  test('remembers that you muted, on the next visit', () => {
    const store = memory();
    new MuteChoice(store).toggle();
    expect(new MuteChoice(store).muted).toBe(true);
  });

  test('toggling twice turns the sound back on', () => {
    const store = memory();
    const m = new MuteChoice(store);
    expect(m.toggle()).toBe(true);
    expect(m.toggle()).toBe(false);
    expect(new MuteChoice(store).muted).toBe(false);
  });

  test('still works when the browser blocks storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const m = new MuteChoice(blocked);
    expect(m.muted).toBe(false);
    expect(m.toggle()).toBe(true);
    expect(m.muted).toBe(true);
  });
});

describe('waterShare', () => {
  const sea = () => true;
  const land = () => false;
  const westIsSea = (x: number) => x < 0; // sea on the left of x = 0, land on the right

  test('is 1 over open sea and 0 deep inland', () => {
    expect(waterShare(sea, 10, 10, 4)).toBe(1);
    expect(waterShare(land, 10, 10, 4)).toBe(0);
  });

  test('is about half on a straight shore', () => {
    const s = waterShare(westIsSea, 0, 0, 6);
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.6);
  });

  test('counts only tiles inside the circle', () => {
    // A single water tile just outside the radius, on the diagonal, is not heard.
    const corner = (x: number, y: number) => x === 3 && y === 3;
    expect(waterShare(corner, 0, 0, 4)).toBe(0);
    const near = (x: number, y: number) => x === 2 && y === 0;
    expect(waterShare(near, 0, 0, 4)).toBeGreaterThan(0);
  });
});

describe('mix', () => {
  const view = { water: 0.5, wind: 0.5, zoom: 1.3, muted: false };

  test('is silent when muted', () => {
    expect(mix({ ...view, muted: true })).toEqual({ wind: 0, waves: 0 });
  });

  test('has no waves deep inland, but still some wind', () => {
    const m = mix({ ...view, water: 0 });
    expect(m.waves).toBe(0);
    expect(m.wind).toBeGreaterThan(0);
  });

  test('waves get louder with more water in view', () => {
    expect(mix({ ...view, water: 0.8 }).waves).toBeGreaterThan(mix({ ...view, water: 0.2 }).waves);
  });

  test('a gust is louder than a calm breeze', () => {
    expect(mix({ ...view, wind: 1 }).wind).toBeGreaterThan(mix({ ...view, wind: 0.25 }).wind);
  });

  test('zooming out makes both quieter, but never silent', () => {
    const near = mix(view), far = mix({ ...view, zoom: 0.4 });
    expect(far.wind).toBeLessThan(near.wind);
    expect(far.waves).toBeLessThan(near.waves);
    expect(far.wind).toBeGreaterThan(0);
  });

  test('stays soft: never above half volume', () => {
    const loud = mix({ water: 1, wind: 1, zoom: 5, muted: false });
    expect(loud.wind).toBeLessThanOrEqual(0.5);
    expect(loud.waves).toBeLessThanOrEqual(0.5);
  });
});
