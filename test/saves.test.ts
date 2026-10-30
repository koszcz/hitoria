import { describe, expect, test } from 'bun:test';
import { Game } from '../src/game';
import { Saves, playTime } from '../src/saves';

class MemStore {
  map = new Map<string, string>();
  full = false;
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) {
    if (this.full) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
}

function setup() {
  const store = new MemStore();
  let t = 1000;
  const saves = new Saves(store, () => t++);
  return { store, saves, data: new Game(7).save() };
}

describe('save slots', () => {
  test('keeps several manual saves, newest first, and reads each back', () => {
    const { saves, data } = setup();
    const a = saves.write(data, 'First');
    const b = saves.write({ ...data, time: 600 }, 'Second');
    expect(a.id).not.toBe(b.id);
    expect(saves.list().map((s) => s.name)).toEqual(['Second', 'First']);
    expect(saves.read(a.id)!.time).toBe(data.time);
    expect(saves.read(b.id)!.time).toBe(600);
    expect(Game.load(saves.read(b.id)!).seed).toBe(7);
  });

  test('writing with an id overwrites that slot only', () => {
    const { saves, data } = setup();
    const a = saves.write(data, 'A');
    saves.write(data, 'B');
    saves.write({ ...data, time: 99 }, 'A again', a.id);
    expect(saves.list()).toHaveLength(2);
    expect(saves.get(a.id)).toMatchObject({ name: 'A again', played: 99 });
  });

  test('autosaves take turns over 3 slots, replacing the oldest', () => {
    const { saves, data } = setup();
    const manual = saves.write(data, 'Mine');
    for (let i = 1; i <= 5; i++) saves.autosave({ ...data, time: i });
    const autos = saves.list().filter((s) => s.auto);
    expect(autos.map((s) => s.played)).toEqual([5, 4, 3]);
    expect(saves.get(manual.id)).not.toBeNull();
  });

  test('delete removes the slot and its game', () => {
    const { store, saves, data } = setup();
    const a = saves.write(data, 'A');
    saves.remove(a.id);
    expect(saves.list()).toEqual([]);
    expect(store.getItem('hitoria.save.' + a.id)).toBeNull();
  });

  test('a full storage throws and leaves the old saves alone', () => {
    const { store, saves, data } = setup();
    saves.write(data, 'A');
    store.full = true;
    expect(() => saves.write(data, 'B')).toThrow();
    expect(saves.list().map((s) => s.name)).toEqual(['A']);
  });

  test('moves the old single save into a slot', () => {
    const store = new MemStore();
    const data = new Game(3).save();
    store.setItem('hitoria.save', JSON.stringify(data));
    const saves = new Saves(store);
    expect(saves.list()).toHaveLength(1);
    expect(saves.read(saves.latest()!.id)!.seed).toBe(3);
    expect(store.getItem('hitoria.save')).toBeNull();
  });

  test('remembers the autosave setting and falls back to every minute', () => {
    const { store, saves } = setup();
    expect<number>(saves.autosaveEvery).toBe(60);
    saves.autosaveEvery = 0;
    expect<number>(saves.autosaveEvery).toBe(0);
    store.setItem('hitoria.autosave', 'junk');
    expect<number>(saves.autosaveEvery).toBe(60);
  });

  test('formats play time', () => {
    expect(playTime(59)).toBe('0 min');
    expect(playTime(12 * 60)).toBe('12 min');
    expect(playTime(3 * 3600 + 5 * 60)).toBe('3 h 05 min');
  });
});
