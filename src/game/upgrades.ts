// Building upgrades: you spend iron and tools from your stores to make a hut's worker work faster,
// or to give a house room for more settlers. Each building upgrades once.
import { BType, GOODS, HOUSE_SIZE, type Bag } from './defs';
import { noteUpgrade } from './chronicle';
import type { Game } from './game';
import { isStore } from './stores';
import { needsTool, settled } from './tools';
import type { Building, Task } from './types';
import { SAIL_CARGO } from './voyage';

export const UPGRADE_COST: Partial<Bag> = { iron: 2, tool: 1 };
export const UPGRADE_PACE = 0.5; // an upgraded hut's worker takes this many times as long over each piece of work
export const HOUSE_EXTRA = 2; // more settlers an upgraded house adds
export const UPGRADED = 2; // the level of an upgraded building

// Huts whose worker works, and houses, can be upgraded. Stores, lookouts and the monument cannot.
export const upgradable = (type: BType) => type === 'house' || needsTool(type);
export const upgraded = (b: Building) => (b.level ?? 1) >= UPGRADED;
// Upgrades need iron that you made yourself, so they come after the smelter.
export const madeIron = (g: Game) => g.made.iron > 0;

// How many settlers house `b` adds in all.
export const houseSize = (b: Building) => HOUSE_SIZE + (upgraded(b) ? HOUSE_EXTRA : 0);

// An upgraded hut's worker is about to do `tasks`: each piece of work takes less time.
export function quicken(b: Building, tasks: Task[]) {
  if (upgraded(b)) for (const t of tasks) if (t.k === 'work') t.t *= UPGRADE_PACE;
}

// The goods in the stores that no carrier or worker is coming for.
const free = (s: Building, k: keyof Bag) => s.stock[k] - s.sending[k];

// Why building `b` can't be upgraded now, or null if it can.
export function canUpgrade(g: Game, b: Building): string | null {
  if (!upgradable(b.type)) return 'This building cannot be upgraded';
  if (!b.built) return 'Finish building it first';
  if (upgraded(b)) return 'Already upgraded';
  if (!madeIron(g)) return 'Make iron in a smelter first';
  const have = { iron: 0, tool: 0 };
  for (const s of g.buildings.values()) if (isStore(s)) for (const k of ['iron', 'tool'] as const) have[k] += free(s, k);
  if (have.iron < UPGRADE_COST.iron! || have.tool < UPGRADE_COST.tool!) return 'Not enough iron and tools in your stores';
  if (!settled(g) && have.tool - UPGRADE_COST.tool! < SAIL_CARGO.tool!) return 'Keep the tools the ship needs to settle the other island';
  return null;
}

// Upgrade building `b`, taking the cost from the stores. Returns why it can't, or null.
export function upgrade(g: Game, b: Building): string | null {
  const why = canUpgrade(g, b);
  if (why) return why;
  for (const k of GOODS) {
    let left = UPGRADE_COST[k] ?? 0;
    for (const s of g.buildings.values()) {
      if (!left) break;
      if (!isStore(s)) continue;
      const n = Math.min(left, free(s, k));
      s.stock[k] -= n;
      left -= n;
    }
  }
  b.level = UPGRADED;
  noteUpgrade(g);
  g.toasts.push('⬆️ Building upgraded');
  return null;
}
