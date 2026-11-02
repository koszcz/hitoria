// Tools: every new worker in a hut takes 1 tool from a store on the way there, and the hut keeps it.
// A toolmaker makes more tools from iron and planks.
import { BDEFS, type BType } from './defs';
import type { Game } from './game';
import { homeOf } from './homes';
import { landings, voyages } from './isles';
import { isStore } from './stores';
import type { Building, Settler, Task } from './types';
import { SAIL_CARGO } from './voyage';
import { walkFrom } from './walking';

export const START_TOOLS = 20; // tools in the HQ at the start
export const NO_TOOL = 'Waiting for a tool'; // the status of a hut whose worker waits for one

// Does the worker of this building need a tool? Scouts only keep watch, so they need none.
export function needsTool(type: BType) {
  const role = BDEFS[type].worker;
  return !!role && role !== 'scout';
}

// Does a worker for building `b` still have to fetch a tool?
export const lacksTool = (b: Building) => needsTool(b.type) && !b.tooled;

// The nearest store on foot from building `b` with a tool nobody has claimed yet. If no store
// with a tool can walk there, the home its worker comes from, so the worker finds out it is cut off.
export function toolStore(g: Game, b: Building): Building | null {
  const dist = walkFrom(g, b);
  let best: Building | null = null, bd = Infinity;
  for (const s of g.buildings.values()) {
    if (!isStore(s) || s.stock.tool <= s.sending.tool) continue;
    const d = dist[s.y * g.world.w + s.x];
    if (d < bd) { bd = d; best = s; }
  }
  const home = homeOf(g, b) || g.hq;
  return best ?? (home.stock.tool > home.sending.tool ? home : null);
}

// The tasks that take worker `s` to `store` for a tool. The tool is claimed now, so no one else takes it.
export function fetchTool(s: Settler, store: Building): Task[] {
  store.sending.tool++;
  s.toolFrom = store.id;
  const here = s.x === store.x && s.y === store.y;
  return [
    ...(here ? [] : [{ k: 'walk', x: store.x, y: store.y } as const]),
    { k: 'do', f: () => {
      store.sending.tool--;
      store.stock.tool--;
      s.toolFrom = undefined;
      s.carrying = 'tool';
    } },
  ];
}

// Worker `s` didn't reach their hut: give back the tool they claimed or carry.
export function dropTool(g: Game, s: Settler, home: Building) {
  if (s.carrying === 'tool') {
    s.carrying = null;
    home.stock.tool++;
  }
  const store = s.toolFrom && g.buildings.get(s.toolFrom);
  if (store) store.sending.tool--;
  s.toolFrom = undefined;
}

// Iron lies only on the other island, so tools used up before the ship sails can never be made
// again. The game warns when the tools left come close to what the ship needs.
export const TOOLS_LOW = SAIL_CARGO.tool! + 2;
export const TOOLS_LOW_NOTE = `⚠️ Only ${TOOLS_LOW} tools left. The ship needs ${SAIL_CARGO.tool} to settle the other island`;

// Has every voyage on the map sailed? A ship on its way out with settlers counts as sailed.
export const settled = (g: Game) =>
  landings(g).length + g.ships.filter((s) => s.leg === 'out' && s.crew > 0).length >= voyages(g);

// Called often. Warns once each time the stored tools drop to TOOLS_LOW, until every voyage has sailed.
export function watchTools(g: Game) {
  const low = !settled(g) && g.stored.tool <= TOOLS_LOW;
  if (low && !g.toolsLow) g.toasts.push(TOOLS_LOW_NOTE);
  g.toolsLow = low;
}
