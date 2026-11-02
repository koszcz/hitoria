// The names of goods as labels, as in "Planks: 4", in each language.
import type { Good } from '../game';

export const GOOD_EN: Record<Good, string> = {
  log: 'Logs', plank: 'Planks', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread', water: 'Water', coal: 'Coal', ore: 'Iron Ore', meat: 'Meat', iron: 'Iron', tool: 'Tools',
};
export const GOOD_PL: Record<Good, string> = {
  log: 'Kłody', plank: 'Deski', stone: 'Kamień', fish: 'Ryby', grain: 'Zboże', flour: 'Mąka', bread: 'Chleb', water: 'Woda', coal: 'Węgiel', ore: 'Ruda żelaza', meat: 'Mięso', iron: 'Żelazo', tool: 'Narzędzia',
};
