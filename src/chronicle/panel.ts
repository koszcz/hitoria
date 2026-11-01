// The chronicle panel: the island's milestones, newest first, shown when the player loads their island.
import type { Entry } from '../game';
import { T } from '../i18n';
import { CT, entryText } from './text';

export function openChronicle(entries: Entry[], closed: () => void) {
  document.getElementById('chronicle')?.remove();
  const box = document.createElement('div');
  box.id = 'chronicle';
  const x = CT();
  box.innerHTML = `
    <div class="panel">
      <h2>📜 ${x.title}</h2>
      <ul></ul>
      <div class="actions"><button>${T().backToGame}</button></div>
    </div>`;
  const list = box.querySelector('ul')!;
  for (const e of [...entries].reverse()) {
    const { day, text } = entryText(e);
    const li = document.createElement('li');
    li.innerHTML = '<b></b><span></span>';
    li.querySelector('b')!.textContent = day;
    li.querySelector('span')!.textContent = text;
    list.append(li);
  }
  if (!entries.length) list.innerHTML = `<li class="empty">${x.empty}</li>`;

  const close = () => {
    box.remove();
    removeEventListener('keydown', onKey, true);
    closed();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') close();
    e.stopPropagation();
  };
  addEventListener('keydown', onKey, true);
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('button')!.onclick = close;
  document.body.append(box);
}
