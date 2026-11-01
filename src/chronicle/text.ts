// How a chronicle entry reads, in the player's language.
import { GOALS, type Entry } from '../game';
import { buildingName, getLang, tr } from '../i18n';

const goalText = (id: string) => GOALS.find((x) => x.id === id)?.text ?? id;

const EN = {
  day: (d: number) => `Day ${d}`,
  born: 'The first settler was born',
  built: (name: string) => `The first ${name} was finished`,
  goal: (text: string) => `Goal reached: ${text}`,
  trade: (n: number) => `The ${n}th trade ship tied up`, // n is always a multiple of 10
  title: 'Island chronicle',
  empty: 'Nothing has happened on this island yet.',
};
const PL: typeof EN = {
  day: (d) => `Dzień ${d}`,
  born: 'Urodził się pierwszy osadnik',
  built: (name) => `Ukończono pierwszy budynek: ${name}`,
  goal: (text) => `Cel osiągnięty: ${text}`,
  trade: (n) => `Przypłynął ${n}. statek kupiecki`,
  title: 'Kronika wyspy',
  empty: 'Na tej wyspie nic się jeszcze nie wydarzyło.',
};

export const CT = () => (getLang() === 'pl' ? PL : EN);

// The day and the text of one entry.
export function entryText(e: Entry): { day: string; text: string } {
  const x = CT();
  const text =
    e.what === 'born' ? x.born
    : e.what === 'built' ? x.built(buildingName(e.type))
    : e.what === 'goal' ? x.goal(tr(goalText(e.goal)))
    : x.trade(e.n);
  return { day: x.day(e.day), text };
}
