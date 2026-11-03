// Harbour boat messages in Polish. The English ones live with the rules, in src/game/boats.ts and
// src/game/harbourwants.ts.
import { COLONY_FOOD_NOTE } from '../game/harbourwants';

export const BOATS_PL: Record<string, string> = {
  'Only a harbour can build a boat': 'Łódź można zbudować tylko w porcie',
  'This harbour already has a boat': 'Ten port ma już łódź',
  'A boat is already being built': 'Łódź jest już budowana',
  '⛵ A boat ties up at the harbour': '⛵ Łódź przycumowała w porcie',
  'Only a finished harbour can want goods': 'Tylko gotowy port może zamawiać towary',
  [COLONY_FOOD_NOTE]: '🐟 Twoja nowa kolonia potrzebuje jedzenia. Zbuduj tam chatę rybaka albo ustaw w jej porcie, ile ryb chce, a łódź je przywiezie',
};
