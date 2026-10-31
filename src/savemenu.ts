import { Saves, AUTOSAVE_CHOICES, playTime, type Slot, type AutosaveEvery } from './saves';
import { T, getLang } from './i18n';

export interface SaveMenuActions {
  save(name: string, id?: string): Slot | null; // null if it could not save
  load(slot: Slot): void;
  current(): string | null; // id of the slot the running game came from or was last saved to
  defaultName(): string;
  closed(): void;
}

const everyLabel = (v: AutosaveEvery) => ({ 0: T().autosaveOff, 60: T().autosaveMinute, 300: T().autosave5 })[v];

function ago(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return T().justNow;
  if (s < 3600) return T().minAgo(Math.floor(s / 60));
  if (s < 86400) return T().hoursAgo(Math.floor(s / 3600));
  return new Date(Date.now() - ms).toLocaleDateString(getLang());
}

// The Saves dialog: save as a new slot, overwrite, load or delete a slot, and set the autosave.
export function openSaveMenu(saves: Saves, act: SaveMenuActions) {
  if (document.getElementById('saves')) return;
  const box = document.createElement('div');
  box.id = 'saves';
  const x = T();
  box.innerHTML = `
    <div class="panel">
      <h2>${x.savedGames}</h2>
      <form class="new">
        <input name="name" maxlength="40" placeholder="${x.newSaveName}" />
        <button>${x.saveAsNew}</button>
      </form>
      <ul></ul>
      <div class="actions">
        <label>${x.autosave} <select></select></label>
        <button data-act="close">${x.backToGame}</button>
      </div>
    </div>`;
  const list = box.querySelector('ul')!;
  const input = box.querySelector('input')!;
  input.value = act.defaultName();

  const close = () => {
    box.remove();
    removeEventListener('keydown', onKey, true);
    act.closed();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    e.stopPropagation(); // keep game shortcuts (R, X, space) out of the name field
  };
  addEventListener('keydown', onKey, true);
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector<HTMLButtonElement>('[data-act=close]')!.onclick = close;

  box.querySelector('form')!.onsubmit = (e) => {
    e.preventDefault();
    if (act.save(input.value)) draw();
  };

  const select = box.querySelector('select')!;
  for (const v of AUTOSAVE_CHOICES) select.add(new Option(everyLabel(v), String(v), false, v === saves.autosaveEvery));
  select.onchange = () => { saves.autosaveEvery = Number(select.value) as AutosaveEvery; };

  function draw() {
    list.replaceChildren();
    const slots = saves.list();
    if (!slots.length) list.innerHTML = `<li class="empty">${x.noSaves}</li>`;
    const now = Date.now();
    for (const s of slots) {
      const li = document.createElement('li');
      if (s.id === act.current()) li.className = 'current';
      li.innerHTML = `
        <div class="what"><b></b><small></small></div>
        <button data-act="load">${x.load}</button>
        ${s.auto ? '' : `<button data-act="over" title="${x.overwriteTitle}">${x.overwrite}</button>`}
        <button data-act="del" title="${x.deleteTitle}">🗑️</button>`;
      li.querySelector('b')!.textContent = s.name;
      li.querySelector('small')!.textContent =
        x.slotInfo(ago(now - s.savedAt), playTime(s.played), s.population, s.seed);
      li.querySelector<HTMLButtonElement>('[data-act=load]')!.onclick = () => {
        close();
        act.load(s);
      };
      const over = li.querySelector<HTMLButtonElement>('[data-act=over]');
      if (over) over.onclick = () => {
        if (!confirm(x.confirmOverwrite(s.name))) return;
        if (act.save(s.name, s.id)) draw();
      };
      li.querySelector<HTMLButtonElement>('[data-act=del]')!.onclick = () => {
        if (!confirm(x.confirmDelete(s.name))) return;
        saves.remove(s.id);
        draw();
      };
      list.appendChild(li);
    }
  }
  draw();
  document.body.appendChild(box);
  input.select();
}
