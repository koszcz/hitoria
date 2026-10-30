import type { SaveData } from './game';

// Save slots in the browser's local storage. A small index lists every slot; each slot's game
// lives under its own key, so listing the saves never has to parse whole games.
const INDEX_KEY = 'hitoria.saves';
const SLOT_KEY = 'hitoria.save.';
const LEGACY_KEY = 'hitoria.save'; // the single slot from before there were several
const AUTO_KEY = 'hitoria.autosave';
const AUTO_SLOTS = 3; // autosaves take turns, so one bad moment can't wipe out the only copy

export interface Slot {
  id: string;
  name: string;
  auto: boolean;
  savedAt: number; // ms since 1970, real time
  played: number; // game seconds
  population: number;
  seed: number;
}

// How often to autosave, in seconds. 0 means never.
export const AUTOSAVE_CHOICES = [0, 60, 300] as const;
export type AutosaveEvery = (typeof AUTOSAVE_CHOICES)[number];

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class Saves {
  constructor(private store: Store = localStorage, private now = () => Date.now()) {
    this.migrate();
  }

  // Newest first.
  list(): Slot[] {
    try {
      const slots = JSON.parse(this.store.getItem(INDEX_KEY) ?? '[]') as Slot[];
      return slots.sort((a, b) => b.savedAt - a.savedAt);
    } catch {
      return [];
    }
  }

  latest(): Slot | null {
    return this.list()[0] ?? null;
  }

  get(id: string): Slot | null {
    return this.list().find((s) => s.id === id) ?? null;
  }

  read(id: string): SaveData | null {
    const raw = this.store.getItem(SLOT_KEY + id);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  }

  // Write a manual save. Pass an id to overwrite that slot, or leave it out for a new one.
  // Throws if the browser storage is full or blocked.
  write(data: SaveData, name: string, id?: string): Slot {
    return this.put(data, { id: id ?? this.newId(), name: name.trim() || 'Untitled', auto: false });
  }

  // Write over the oldest of the autosave slots.
  autosave(data: SaveData): Slot {
    const autos = this.list().filter((s) => s.auto);
    const free = Array.from({ length: AUTO_SLOTS }, (_, i) => `auto${i + 1}`).find((id) => !autos.some((s) => s.id === id));
    const id = free ?? autos[autos.length - 1].id;
    return this.put(data, { id, name: 'Autosave', auto: true });
  }

  remove(id: string) {
    this.store.removeItem(SLOT_KEY + id);
    this.setIndex(this.list().filter((s) => s.id !== id));
  }

  get autosaveEvery(): AutosaveEvery {
    const v = Number(this.store.getItem(AUTO_KEY) ?? 60);
    return (AUTOSAVE_CHOICES as readonly number[]).includes(v) ? (v as AutosaveEvery) : 60;
  }

  set autosaveEvery(v: AutosaveEvery) {
    this.store.setItem(AUTO_KEY, String(v));
  }

  private put(data: SaveData, s: Pick<Slot, 'id' | 'name' | 'auto'>): Slot {
    const slot: Slot = { ...s, savedAt: this.now(), played: data.time, population: data.pool, seed: data.seed };
    this.store.setItem(SLOT_KEY + slot.id, JSON.stringify(data));
    this.setIndex([...this.list().filter((x) => x.id !== slot.id), slot]);
    return slot;
  }

  private setIndex(slots: Slot[]) {
    this.store.setItem(INDEX_KEY, JSON.stringify(slots));
  }

  private newId() {
    const used = new Set(this.list().map((s) => s.id));
    let n = 1;
    while (used.has(`s${n}`)) n++;
    return `s${n}`;
  }

  // Keep the game from the old single slot as a normal save.
  private migrate() {
    const raw = this.store.getItem(LEGACY_KEY);
    if (!raw) return;
    try {
      this.write(JSON.parse(raw) as SaveData, 'Saved game');
      this.store.removeItem(LEGACY_KEY);
    } catch (err) {
      console.warn('Could not move the old save to a slot', err);
    }
  }
}

// "12 min", "3 h 05 min"
export function playTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}
