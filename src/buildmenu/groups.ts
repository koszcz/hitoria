// How the build menu sorts buildings into groups, and whether you can pay for one right now.
import { BUILDABLE, GOODS, type Bag, type BType } from '../game';

export type Group = 'wood' | 'stone' | 'food' | 'town';

export const GROUPS: { group: Group; types: BType[] }[] = [
  { group: 'wood', types: ['woodcutter', 'forester', 'sawmill'] },
  { group: 'stone', types: ['quarry', 'geologist', 'mine', 'coalmine', 'ironmine', 'smelter', 'toolmaker'] },
  { group: 'food', types: ['fisher', 'hunter', 'farm', 'well', 'mill', 'bakery'] },
  { group: 'town', types: ['house', 'storehouse', 'harbour', 'square', 'lookout', 'monument'] },
];

// The number key that picks a building straight away, or '' if it has none.
export const keyFor = (type: BType) => {
  const i = BUILDABLE.indexOf(type);
  return i >= 0 && i < 9 ? String(i + 1) : '';
};

export const canPay = (stored: Bag, cost: Partial<Bag>) => GOODS.every((g) => stored[g] >= (cost[g] ?? 0));
