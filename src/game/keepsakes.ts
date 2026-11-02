// Keepsakes: when the player starts a new island, they may bring one reward from the island they
// leave. Each keepsake is earned by reaching a goal, and it gives the new island a head start.
import { note } from './chronicle';
import type { Bag } from './defs';
import { GOALS } from './goals';
import type { Game } from './game';

export type KeepsakeId = 'crate' | 'friends' | 'larder' | 'chest';

export interface Keepsake {
  id: KeepsakeId;
  goal: string; // the id of the goal that earns it
  goods: Partial<Bag>; // goods the new HQ starts with on top of the usual ones
  settlers: number; // extra settlers in the new HQ
}

export const KEEPSAKES: Keepsake[] = [
  { id: 'crate', goal: 'planks', goods: { plank: 20, stone: 10 }, settlers: 0 },
  { id: 'friends', goal: 'settlers', goods: {}, settlers: 6 },
  { id: 'larder', goal: 'winter', goods: { fish: 20, bread: 10 }, settlers: 0 },
  { id: 'chest', goal: 'iron', goods: { iron: 5, tool: 8 }, settlers: 0 },
];

// The keepsakes the player has earned on island `g`, in the order of the goals.
export function earnedKeepsakes(g: Game): Keepsake[] {
  return KEEPSAKES.filter((k) => GOALS.findIndex((goal) => goal.id === k.goal) < g.goal);
}

// Give the new island `g` the keepsake `id`, brought from the island with seed `from`.
export function bringKeepsake(g: Game, id: KeepsakeId, from: number) {
  const k = KEEPSAKES.find((x) => x.id === id);
  if (!k) throw new Error(`No keepsake called ${id}`);
  for (const [good, n] of Object.entries(k.goods) as [keyof Bag, number][]) g.hq.stock[good] += n;
  g.pool += k.settlers;
  note(g, { what: 'keepsake', id, from });
}
