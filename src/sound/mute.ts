// Whether the player muted the sound, kept in the browser so the next visit remembers it.
const KEY = 'hitoria.muted';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export class MuteChoice {
  private value: boolean;

  constructor(private store: Store | undefined = globalThis.localStorage) {
    try {
      this.value = store?.getItem(KEY) === '1';
    } catch {
      this.value = false; // storage may be blocked; then sound starts on
    }
  }

  get muted() {
    return this.value;
  }

  // Mutes or unmutes. Returns whether the sound is now muted.
  toggle() {
    this.value = !this.value;
    try {
      this.store?.setItem(KEY, this.value ? '1' : '0');
    } catch {}
    return this.value;
  }
}
