import { describe, expect, test } from 'bun:test';
import { MuteChoice } from './mute';

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
