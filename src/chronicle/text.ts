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
  wish: (n: number) => (n === 1 ? 'The first village wish was granted' : `${n} village wishes granted`),
  upgrade: 'The first building was upgraded',
  landed: { other: 'Settlers landed on the other island', far: 'Settlers landed on the far island' },
  winter: 'A whole winter passed with no one hungry',
  settlers: (n: number) => `The island reached ${n} settlers`,
  feast: 'The first wedding feast brought two newlyweds',
  title: 'Island chronicle',
  empty: 'Nothing has happened on this island yet.',
};
const PL: typeof EN = {
  day: (d) => `Dzień ${d}`,
  born: 'Urodził się pierwszy osadnik',
  built: (name) => `Ukończono pierwszy budynek: ${name}`,
  goal: (text) => `Cel osiągnięty: ${text}`,
  trade: (n) => `Przypłynął ${n}. statek kupiecki`,
  wish: (n) => (n === 1 ? 'Spełniono pierwsze życzenie wioski' : `Spełnione życzenia wioski: ${n}`),
  upgrade: 'Ulepszono pierwszy budynek',
  landed: { other: 'Osadnicy wylądowali na drugiej wyspie', far: 'Osadnicy wylądowali na dalekiej wyspie' },
  winter: 'Minęła cała zima i nikt nie był głodny',
  settlers: (n) => `Wyspa ma już ${n} osadników`,
  feast: 'Pierwsza uczta weselna sprowadziła dwoje nowożeńców',
  title: 'Kronika wyspy',
  empty: 'Na tej wyspie nic się jeszcze nie wydarzyło.',
};

export const CT = () => (getLang() === 'pl' ? PL : EN);

// The day and the text of one entry.
export function entryText(e: Entry): { day: string; text: string } {
  const x = CT();
  const text = lineOf(x, e);
  return { day: x.day(e.day), text };
}

function lineOf(x: typeof EN, e: Entry): string {
  switch (e.what) {
    case 'born': return x.born;
    case 'built': return x.built(buildingName(e.type));
    case 'goal': return x.goal(tr(goalText(e.goal)));
    case 'trade': return x.trade(e.n);
    case 'wish': return x.wish(e.n);
    case 'upgrade': return x.upgrade;
    case 'landed': return x.landed[e.isle];
    case 'winter': return x.winter;
    case 'settlers': return x.settlers(e.n);
    case 'feast': return x.feast;
  }
}
