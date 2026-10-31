// How the build menu sorts buildings into groups, and whether you can pay for one right now.
import { BDEFS, BUILDABLE, GOODS, type Bag, type BType } from '../game';

export type Group = 'wood' | 'stone' | 'food' | 'town';

export const GROUPS: { group: Group; types: BType[] }[] = [
  { group: 'wood', types: ['woodcutter', 'forester', 'sawmill'] },
  { group: 'stone', types: ['quarry', 'mine'] },
  { group: 'food', types: ['fisher', 'farm', 'mill', 'bakery'] },
  { group: 'town', types: ['house', 'storehouse', 'lookout'] },
];

// The number key that picks a building straight away, or '' if it has none.
export const keyFor = (type: BType) => {
  const i = BUILDABLE.indexOf(type);
  return i >= 0 && i < 9 ? String(i + 1) : '';
};

export const canPay = (stored: Bag, type: BType) => GOODS.every((g) => stored[g] >= (BDEFS[type].cost[g] ?? 0));
