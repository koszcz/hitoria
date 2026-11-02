// The goods on each island. Settlers use only the goods stored on their own island, so the stock
// bar and build menu show one island at a time. Goals still count every island, through `stored`.
import { GOODS, bag, type Bag } from './defs';
import type { Game } from './game';
import { isStore } from './stores';

export type Isle = 'home' | 'other' | 'far';

const ORDER: Isle[] = ['home', 'other', 'far'];

// Which island the tile at (x, y) is on. Any tile that is on neither the second nor the far island
// counts as home.
export const isleOf = (g: Game, x: number, y: number): Isle => g.world.isleAt(x, y) ?? 'home';

// All goods kept in the HQ, storehouses and harbours on one island.
export function storedOn(g: Game, isle: Isle): Bag {
  const sum = bag();
  for (const b of g.buildings.values())
    if (isStore(b) && isleOf(g, b.x, b.y) === isle) for (const k of GOODS) sum[k] += b.stock[k];
  return sum;
}

// The islands that have at least one store, home first.
export function storeIsles(g: Game): Isle[] {
  const has = new Set<Isle>();
  for (const b of g.buildings.values()) if (isStore(b)) has.add(isleOf(g, b.x, b.y));
  return ORDER.filter((i) => has.has(i));
}

// The island whose goods to show while the camera looks at the tile at (x, y). An island with no
// store yet, or open sea, shows the home island.
export function viewedIsle(g: Game, x: number, y: number): Isle {
  const isle = isleOf(g, x, y);
  return storeIsles(g).includes(isle) ? isle : 'home';
}
