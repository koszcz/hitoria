// The messages about locked and unlocked buildings, in Polish. The English ones live with the
// rules, in src/game/unlocks.ts.
import { BDEFS, type BType } from '../game';
import { BUILDING_PL } from './buildings';

const BTYPES = Object.keys(BDEFS) as BType[];

// The Polish name for an English building name, or null if there is no such building.
const namePl = (en: string) => {
  const t = BTYPES.find((k) => BDEFS[k].name === en);
  return t ? BUILDING_PL[t].name : null;
};

const allPl = (names: string[]) => {
  const pl = names.map(namePl);
  return pl.every((n) => n) ? pl : null;
};

// "Locked. Finish the Mill and Well first" and "🔓 Unlocked: Forester's Hut, Sawmill" in Polish,
// or null for any other message.
export function unlockPl(msg: string): string | null {
  const locked = msg.match(/^Locked\. Finish the (.+) first$/);
  const lockedPl = locked && allPl(locked[1].split(' and '));
  if (lockedPl) return `Zablokowane. Najpierw ukończ: ${lockedPl.join(' i ')}`;
  const opened = msg.match(/^🔓 Unlocked: (.+)$/);
  const openedPl = opened && allPl(opened[1].split(', '));
  if (openedPl) return `🔓 Odblokowano: ${openedPl.join(', ')}`;
  return null;
}
