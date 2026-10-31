// Houses: how much food they keep, and how they turn food into new settlers.
import { Good, HOUSE_FOOD, HOUSE_GROW, HOUSE_PANTRY, HOUSE_SIZE } from './defs';
import { linked } from './construction';
import type { Game } from './game';
import type { Building } from './types';

// A house keeps a little food of any kind, but never more than its last settlers need.
export function pantry(b: Building, g: Good) {
  if (!HOUSE_FOOD.includes(g)) return 0;
  let other = 0;
  for (const o of HOUSE_FOOD) if (o !== g) other += b.stock[o] + b.incoming[o];
  const left = HOUSE_SIZE - b.born - (b.busy ? 1 : 0);
  return Math.max(0, Math.min(HOUSE_PANTRY, left) - other);
}

// A house eats one food, and a new settler moves into the HQ once it has grown up.
export function raise(g: Game, b: Building, dt: number) {
  if (b.born >= HOUSE_SIZE) {
    b.status = 'House is full';
    return;
  }
  if (!b.busy) {
    const food = HOUSE_FOOD.find((k) => b.stock[k] > 0);
    if (!food) {
      b.status = linked(g, b) ? 'Waiting for fish or bread' : 'Needs a road to your HQ';
      return;
    }
    b.stock[food]--;
    b.busy = true;
    b.using = food;
    b.grow = HOUSE_GROW;
  }
  b.status = 'A settler will be born soon';
  b.grow -= dt;
  if (b.grow > 0) return;
  b.busy = false;
  b.using = null;
  b.born++;
  g.pool++;
  g.toasts.push('👶 A new settler was born');
}
