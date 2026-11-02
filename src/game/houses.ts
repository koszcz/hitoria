// Houses: how much food they keep, and how they turn food into new settlers.
import { Good, HOUSE_FOOD, HOUSE_GROW, HOUSE_PANTRY } from './defs';
import { linked } from './construction';
import type { Game } from './game';
import { noteBirth } from './chronicle';
import { addPool, homeOf } from './homes';
import type { Building } from './types';
import { houseSize } from './upgrades';
import { noteUsed } from './rates';
import { MIXED_GROW, pickFood, tasteNew } from './variety';

// A house keeps a little food of any kind, but never more than its last settlers need.
export function pantry(b: Building, g: Good) {
  if (!HOUSE_FOOD.includes(g)) return 0;
  let other = 0;
  for (const o of HOUSE_FOOD) if (o !== g) other += b.stock[o] + b.incoming[o];
  const left = houseSize(b) - b.born - (b.busy ? 1 : 0);
  return Math.max(0, Math.min(HOUSE_PANTRY, left) - other);
}

// A house eats one food, and a new settler moves into its home once it has grown up.
export function raise(g: Game, b: Building, dt: number) {
  if (b.born >= houseSize(b)) {
    b.status = 'House is full';
    return;
  }
  if (!b.busy) {
    const food = pickFood(b, (k) => b.stock[k] > 0);
    if (!food) {
      b.status = linked(g, b) ? 'Waiting for food' : 'No way to walk to your HQ';
      return;
    }
    b.stock[food]--;
    noteUsed(g, b, food, 1);
    b.busy = true;
    b.using = food;
    b.grow = HOUSE_GROW * (tasteNew(b, food) ? MIXED_GROW : 1);
  }
  b.status = 'A settler will be born soon';
  b.grow -= dt;
  if (b.grow > 0) return;
  b.busy = false;
  b.using = null;
  b.born++;
  addPool(g, homeOf(g, b) ?? g.hq, 1);
  g.toasts.push('👶 A new settler was born');
  noteBirth(g);
}
