// How keepsakes read, in the player's language: their names, what they give, and the keepsake dialog.
import type { KeepsakeId } from '../game';
import { getLang } from '../i18n';

type Words = { icon: string; name: string; gives: string };

const EN = {
  keepsakes: {
    crate: { icon: '📦', name: "Builder's crate", gives: '20 planks and 10 stone' },
    friends: { icon: '🧑‍🤝‍🧑', name: 'Old friends', gives: '6 more settlers' },
    larder: { icon: '🧺', name: 'Full larder', gives: '20 fish and 10 bread' },
    chest: { icon: '🧰', name: 'Iron chest', gives: '5 iron and 8 tools' },
  } as Record<KeepsakeId, Words>,
  title: 'Bring a keepsake',
  intro: 'Choose one reward from this island to bring to your new island.',
  earnedBy: (goal: string) => `Earned by: ${goal}`,
  cancel: 'Stay on this island',
  brought: (name: string) => `Keepsake brought to your new island: ${name}.`,
  chronicle: (name: string, from: string) => `The island began with a keepsake from ${from}: ${name}`,
};

const PL: typeof EN = {
  keepsakes: {
    crate: { icon: '📦', name: 'Skrzynia budowniczego', gives: '20 desek i 10 kamieni' },
    friends: { icon: '🧑‍🤝‍🧑', name: 'Starzy przyjaciele', gives: '6 osadników więcej' },
    larder: { icon: '🧺', name: 'Pełna spiżarnia', gives: '20 ryb i 10 chlebów' },
    chest: { icon: '🧰', name: 'Żelazna skrzynia', gives: '5 żelaza i 8 narzędzi' },
  },
  title: 'Zabierz pamiątkę',
  intro: 'Wybierz jedną nagrodę z tej wyspy, którą zabierzesz na nową wyspę.',
  earnedBy: (goal) => `Zdobyta za: ${goal}`,
  cancel: 'Zostań na tej wyspie',
  brought: (name) => `Zabrano na nową wyspę: ${name}.`,
  chronicle: (name, from) => `Wyspa zaczęła się od pamiątki z „${from}”: ${name}`,
};

export const KT = () => (getLang() === 'pl' ? PL : EN);
