// The music volume the player picked, kept in the browser so the next visit remembers it.
const KEY = 'hitoria.music';
// The steps the menu button moves through. 0 turns the music off.
const STEPS = [0, 0.25, 0.5, 0.75, 1];
const START = 0.5;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export class MusicVolume {
  private value = START;

  constructor(private store: Store | undefined = globalThis.localStorage) {
    try {
      const saved = Number(store?.getItem(KEY) ?? NaN);
      if (STEPS.includes(saved)) this.value = saved;
    } catch {} // storage may be blocked; then the music starts at half volume
  }

  // From 0 (off) to 1 (full).
  get volume() {
    return this.value;
  }

  // Moves to the next step, from full back to off. Returns the new volume.
  cycle() {
    this.value = STEPS[(STEPS.indexOf(this.value) + 1) % STEPS.length];
    try {
      this.store?.setItem(KEY, String(this.value));
    } catch {}
    return this.value;
  }
}
