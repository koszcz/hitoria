import { Saves, AUTOSAVE_CHOICES, playTime, type Slot, type AutosaveEvery } from './saves';

export interface SaveMenuActions {
  save(name: string, id?: string): Slot | null; // null if it could not save
  load(slot: Slot): void;
  current(): string | null; // id of the slot the running game came from or was last saved to
  defaultName(): string;
  closed(): void;
}

const EVERY_LABEL: Record<AutosaveEvery, string> = { 0: 'Off', 60: 'Every minute', 300: 'Every 5 minutes' };

function ago(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(Date.now() - ms).toLocaleDateString();
}

// The Saves dialog: save as a new slot, overwrite, load or delete a slot, and set the autosave.
export function openSaveMenu(saves: Saves, act: SaveMenuActions) {
  if (document.getElementById('saves')) return;
  const box = document.createElement('div');
  box.id = 'saves';
  box.innerHTML = `
    <div class="panel">
      <h2>Saved games</h2>
      <form class="new">
        <input name="name" maxlength="40" placeholder="Name for a new save" />
        <button>💾 Save as new</button>
      </form>
      <ul></ul>
      <div class="actions">
        <label>Autosave <select></select></label>
        <button data-act="close">▶️ Back to the game</button>
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
  for (const v of AUTOSAVE_CHOICES) select.add(new Option(EVERY_LABEL[v], String(v), false, v === saves.autosaveEvery));
  select.onchange = () => { saves.autosaveEvery = Number(select.value) as AutosaveEvery; };

  function draw() {
    list.replaceChildren();
    const slots = saves.list();
    if (!slots.length) list.innerHTML = '<li class="empty">No saved games yet.</li>';
    const now = Date.now();
    for (const s of slots) {
      const li = document.createElement('li');
      if (s.id === act.current()) li.className = 'current';
      li.innerHTML = `
        <div class="what"><b></b><small></small></div>
        <button data-act="load">📂 Load</button>
        ${s.auto ? '' : '<button data-act="over" title="Replace this save with the game you are playing">💾 Overwrite</button>'}
        <button data-act="del" title="Delete this save">🗑️</button>`;
      li.querySelector('b')!.textContent = s.name;
      li.querySelector('small')!.textContent =
        `${ago(now - s.savedAt)} · ${playTime(s.played)} played · ${s.population} settlers · island ${s.seed}`;
      li.querySelector<HTMLButtonElement>('[data-act=load]')!.onclick = () => {
        close();
        act.load(s);
      };
      const over = li.querySelector<HTMLButtonElement>('[data-act=over]');
      if (over) over.onclick = () => {
        if (!confirm(`Replace "${s.name}" with the game you are playing?`)) return;
        if (act.save(s.name, s.id)) draw();
      };
      li.querySelector<HTMLButtonElement>('[data-act=del]')!.onclick = () => {
        if (!confirm(`Delete "${s.name}"? You can't undo this.`)) return;
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
