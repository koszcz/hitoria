// The keepsake dialog: before a new island starts, the player picks one earned reward to bring.
import { GOALS, earnedKeepsakes, type Game, type Keepsake, type KeepsakeId } from '../game';
import { tr } from '../i18n';
import { KT } from './text';

const goalText = (id: string) => tr(GOALS.find((g) => g.id === id)?.text ?? id);

// Show the earned keepsakes. `pick` gets the one the player chose; `cancel` runs if they stay.
export function openKeepsakes(earned: Keepsake[], pick: (id: KeepsakeId) => void, cancel: () => void) {
  document.getElementById('keepsake')?.remove();
  const x = KT();
  const box = document.createElement('div');
  box.id = 'keepsake';
  box.innerHTML = `
    <div class="panel">
      <h2>🎁 ${x.title}</h2>
      <p>${x.intro}</p>
      <div class="choices"></div>
      <div class="actions"><button data-act="cancel">${x.cancel}</button></div>
    </div>`;
  const close = () => {
    box.remove();
    removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      cancel();
    }
    e.stopPropagation(); // keep game shortcuts out while the dialog is open
  };
  const choices = box.querySelector('.choices')!;
  for (const k of earned) {
    const words = x.keepsakes[k.id];
    const btn = document.createElement('button');
    btn.dataset.keepsake = k.id;
    btn.innerHTML = '<b class="icon"></b><span><b></b><small class="gives"></small><small class="earned"></small></span>';
    btn.querySelector('.icon')!.textContent = words.icon;
    btn.querySelector('span b')!.textContent = words.name;
    btn.querySelector('.gives')!.textContent = words.gives;
    btn.querySelector('.earned')!.textContent = x.earnedBy(goalText(k.goal));
    btn.onclick = () => {
      close();
      pick(k.id);
    };
    choices.append(btn);
  }
  box.querySelector<HTMLButtonElement>('[data-act=cancel]')!.onclick = () => {
    close();
    cancel();
  };
  addEventListener('keydown', onKey, true);
  document.body.append(box);
}

// Before leaving island `old`, let the player pick a keepsake, with the game paused meanwhile.
// `start` gets the chosen keepsake, or null at once if none was earned. It does not run if the player stays.
export function pickKeepsake(old: Game, ui: { paused: boolean; refresh(): void }, start: (id: KeepsakeId | null) => void) {
  const earned = earnedKeepsakes(old);
  if (!earned.length) return start(null);
  const wasPaused = ui.paused;
  ui.paused = true;
  ui.refresh();
  const resume = () => {
    ui.paused = wasPaused;
    ui.refresh();
  };
  openKeepsakes(earned, (id) => {
    resume();
    start(id);
  }, resume);
}
