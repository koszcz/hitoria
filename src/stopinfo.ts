// The part of a hut's panel that stops or resumes its work: a short note and one button.
import { Building, canStop } from './game';
import { getLang } from './i18n';

const EN = {
  stop: '⏸️ Stop work',
  resume: '▶️ Resume work',
  stopNote: 'Stop work to send the worker home, so they can take another hut. The hut keeps its tool.',
  resumeNote: 'Nobody works here until you resume work.',
};

const PL: typeof EN = {
  stop: '⏸️ Wstrzymaj pracę',
  resume: '▶️ Wznów pracę',
  stopNote: 'Wstrzymaj pracę, a pracownik wróci do domu i zajmie inny budynek. Narzędzie zostaje tutaj.',
  resumeNote: 'Nikt tu nie pracuje, dopóki nie wznowisz pracy.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The rows for a finished hut's panel, as HTML. Buildings with no worker show none.
export function stopRows(b: Building): string {
  if (!canStop(b)) return '';
  const x = text(), act = b.stopped ? 'resume' : 'stop';
  return `<p class="desc">${b.stopped ? x.resumeNote : x.stopNote}</p>` +
    `<button class="sail" data-act="${act}">${x[act]}</button>`;
}
