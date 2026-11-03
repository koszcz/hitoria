// Which buildings the player may build. A new island starts with a few, and finishing a building
// unlocks the next ones in its chain. An unlock stays, even if its building is removed later.
import { BDEFS, BUILDABLE, type BType } from './defs';
import type { Game } from './game';

// The buildings a new island can build straight away.
export const STARTERS: BType[] = ['woodcutter', 'quarry', 'fisher', 'house'];

// For every other building: the buildings to finish first. All of them must be finished.
export const NEEDS: Partial<Record<BType, BType[]>> = {
  forester: ['woodcutter'],
  sawmill: ['woodcutter'],
  lookout: ['sawmill'],
  storehouse: ['sawmill'],
  farm: ['sawmill'],
  hunter: ['sawmill'],
  mill: ['farm'],
  well: ['farm'],
  bakery: ['mill', 'well'],
  square: ['house'],
  mine: ['quarry'],
  monument: ['quarry'],
  geologist: ['mine'],
  harbour: ['mine'],
  coalmine: ['geologist'],
  ironmine: ['geologist'],
  smelter: ['coalmine', 'ironmine'],
  toolmaker: ['smelter'],
};

// The buildings still to finish before `type` unlocks. Empty when it is unlocked.
export const missingFor = (g: Game, type: BType) => (NEEDS[type] ?? []).filter((n) => !g.finished.has(n));

export const isUnlocked = (g: Game, type: BType) => missingFor(g, type).length === 0;

// Why the player can't build `type` yet, or null if they can.
export function lockedWhy(g: Game, type: BType): string | null {
  const missing = missingFor(g, type);
  return missing.length ? `Locked. Finish the ${missing.map((t) => BDEFS[t].name).join(' and ')} first` : null;
}

// A building of `type` was finished. Tell the player which buildings it unlocked.
export function noteFinished(g: Game, type: BType) {
  if (g.finished.has(type)) return;
  const before = BUILDABLE.filter((t) => isUnlocked(g, t));
  g.finished.add(type);
  const opened = BUILDABLE.filter((t) => isUnlocked(g, t) && !before.includes(t));
  if (opened.length) g.toasts.push(`🔓 Unlocked: ${opened.map((t) => BDEFS[t].name).join(', ')}`);
}

// Unlock every building. Tests use it to build anything without finishing the chain first.
export function unlockAll(g: Game) {
  for (const t of BUILDABLE) g.finished.add(t);
}

// A save from before unlocks: each finished building has earned its unlocks.
export function earnedUnlocks(g: Game) {
  for (const b of g.buildings.values()) if (b.built && b.type !== 'hq') g.finished.add(b.type);
}
