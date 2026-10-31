import { describe, expect, test } from 'bun:test';
import { BAR_SECONDS, LOOP_BARS, SCALE, bar, chordOf, freq } from './tune';
import { MusicVolume } from './volume';
import { musicLevel } from './mix';

// A browser store that keeps values in memory.
function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const melody = (n: number) => bar(n).filter((x) => x.voice === 'bell');
const pad = (n: number) => bar(n).filter((x) => x.voice === 'pad');

describe('the tune', () => {
  test('is the same every time, so it can be played from any bar', () => {
    expect(bar(5)).toEqual(bar(5));
  });

  test('repeats after one loop', () => {
    expect(bar(3 + LOOP_BARS)).toEqual(bar(3));
  });

  test('is not the same bar over and over', () => {
    const shapes = new Set(Array.from({ length: LOOP_BARS }, (_, i) => JSON.stringify(melody(i).map((x) => x.note))));
    expect(shapes.size).toBeGreaterThan(LOOP_BARS / 2);
  });

  test('every melody note is in the calm five-note scale', () => {
    for (let i = 0; i < LOOP_BARS; i++)
      for (const x of melody(i)) expect(SCALE).toContain(x.note % 12);
  });

  test('the melody moves in small steps, never big leaps', () => {
    let last: number | null = null;
    for (let i = 0; i < LOOP_BARS * 2; i++)
      for (const x of melody(i)) {
        if (last !== null) expect(Math.abs(x.note - last)).toBeLessThanOrEqual(7);
        last = x.note;
      }
  });

  test('each bar starts its melody on a note of the chord', () => {
    for (let i = 0; i < LOOP_BARS; i++) {
      const first = melody(i)[0];
      if (!first || first.at > 0) continue;
      expect(chordOf(i).map((n) => n % 12)).toContain(first.note % 12);
    }
  });

  test('a soft chord holds under every bar', () => {
    for (let i = 0; i < LOOP_BARS; i++) {
      const p = pad(i);
      expect(p.map((x) => x.note).sort()).toEqual([...chordOf(i)].sort());
      for (const x of p) expect(x.length).toBeGreaterThanOrEqual(BAR_SECONDS);
    }
  });

  test('is calm: few notes in a bar, all inside it, all soft', () => {
    for (let i = 0; i < LOOP_BARS; i++) {
      expect(melody(i).length).toBeLessThanOrEqual(6);
      for (const x of bar(i)) {
        expect(x.at).toBeGreaterThanOrEqual(0);
        expect(x.at).toBeLessThan(BAR_SECONDS);
        expect(x.gain).toBeGreaterThan(0);
        expect(x.gain).toBeLessThanOrEqual(1);
      }
    }
  });

  test('has some quiet bars to breathe', () => {
    const counts = Array.from({ length: LOOP_BARS }, (_, i) => melody(i).length);
    expect(Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  test('turns notes into pitches, with the A above middle C at 440 Hz', () => {
    expect(freq(69)).toBeCloseTo(440);
    expect(freq(81)).toBeCloseTo(880);
  });
});

describe('MusicVolume', () => {
  test('starts at half volume the first time you play', () => {
    expect(new MusicVolume(memory()).volume).toBe(0.5);
  });

  test('steps up to full, then off, then back up', () => {
    const v = new MusicVolume(memory());
    expect([v.cycle(), v.cycle(), v.cycle(), v.cycle(), v.cycle()]).toEqual([0.75, 1, 0, 0.25, 0.5]);
  });

  test('remembers the volume on the next visit', () => {
    const store = memory();
    new MusicVolume(store).cycle();
    expect(new MusicVolume(store).volume).toBe(0.75);
  });

  test('ignores a stored value it does not know', () => {
    const store = memory();
    store.setItem('hitoria.music', 'loud');
    expect(new MusicVolume(store).volume).toBe(0.5);
  });

  test('still works when the browser blocks storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const v = new MusicVolume(blocked);
    expect(v.volume).toBe(0.5);
    expect(v.cycle()).toBe(0.75);
  });
});

describe('musicLevel', () => {
  test('is silent when the sound is muted, whatever the music volume', () => {
    expect(musicLevel(1, true)).toBe(0);
  });

  test('is silent when the music volume is off', () => {
    expect(musicLevel(0, false)).toBe(0);
  });

  test('gets louder with the volume, but stays behind the game', () => {
    expect(musicLevel(1, false)).toBeGreaterThan(musicLevel(0.25, false));
    expect(musicLevel(1, false)).toBeLessThanOrEqual(0.3);
  });
});
