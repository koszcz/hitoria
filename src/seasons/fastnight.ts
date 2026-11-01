// Fast nights: once every worker is in bed, the clock runs fast until dawn.
// The player can turn it off, and the browser remembers the choice.

export const FAST_NIGHT = 8; // how fast the clock runs at night while everyone sleeps
const MOST = 16; // the fastest a night may run, so the game keeps up on slow devices

// The game speed for this moment: the player's chosen speed, or faster while everyone sleeps.
export function nightSpeed(speed: number, on: boolean, allAsleep: boolean) {
  if (!on || !allAsleep) return speed;
  return Math.max(speed, Math.min(speed * FAST_NIGHT, MOST));
}

const KEY = 'hitoria.fastNights';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export class FastNights {
  on: boolean;

  constructor(private store: Store | undefined = globalThis.localStorage) {
    let v: string | null = null;
    try {
      v = store?.getItem(KEY) ?? null;
    } catch {} // storage may be blocked; then fast nights stay on
    this.on = v !== 'off';
  }

  // Turn fast nights on or off, and return the new state.
  toggle() {
    this.on = !this.on;
    try {
      this.store?.setItem(KEY, this.on ? 'on' : 'off');
    } catch {}
    return this.on;
  }
}
