// The player's graphics choice, kept in the browser: "auto" or a level they picked themselves.
// On auto, it also remembers the level the game settled on, so the next visit starts there.
import { LEVELS, Level } from './levels';

export type Choice = 'auto' | Level;
export const CHOICES: Choice[] = ['auto', ...LEVELS];

const KEY = 'hitoria.graphics';
const AUTO_KEY = 'hitoria.graphics.auto';

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const isLevel = (v: string | null): v is Level => LEVELS.includes(v as Level);

export class GraphicsChoice {
  constructor(private store: Store | undefined = globalThis.localStorage) {}

  private get(key: string) {
    try {
      return this.store?.getItem(key) ?? null;
    } catch {
      return null; // storage may be blocked; then every visit starts on auto
    }
  }
  private put(key: string, v: string) {
    try {
      this.store?.setItem(key, v);
    } catch {}
  }

  get choice(): Choice {
    const v = this.get(KEY);
    return isLevel(v) ? v : 'auto';
  }
  set choice(c: Choice) {
    this.put(KEY, c);
  }

  // The level auto mode last settled on, if any.
  get lastAuto(): Level | null {
    const v = this.get(AUTO_KEY);
    return isLevel(v) ? v : null;
  }
  set lastAuto(l: Level | null) {
    if (l) this.put(AUTO_KEY, l);
  }
}

// The choice after this one, for a button that cycles through them.
export const nextChoice = (c: Choice): Choice => CHOICES[(CHOICES.indexOf(c) + 1) % CHOICES.length];
