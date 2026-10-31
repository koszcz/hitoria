import { crashed, watch, reportProblem } from './report';
import { diag } from './diag';
import { DebugPanel } from './debug';
import { Game, BUILDABLE, BType } from './game';
import { Renderer } from './render';
import { UI } from './ui';
import { Saves, type Slot } from './saves';
import { openSaveMenu } from './savemenu';
import { T, getLang, setLang, startLang } from './i18n';
import type { P } from './path';

setLang(startLang());
const saves = new Saves();

function readSave(slot: Slot | null): Game | null {
  if (!slot) return null;
  try {
    const d = saves.read(slot.id);
    return d ? Game.load(d) : null;
  } catch (err) {
    console.warn(`Could not load the save "${slot.name}"`, err);
    return null;
  }
}

// A ?seed= link always starts that island fresh; otherwise carry on from the newest save.
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed'));
const first = seed ? null : saves.latest();
const saved = readSave(first);
let game = saved ?? new Game(seed || Math.floor(Math.random() * 1e9));
// The manual slot the running game belongs to. Save (Ctrl+S) writes over it.
let slotId = saved && first && !first.auto ? first.id : null;
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const ui = new UI(game);
ui.relabel();
watch(() => game);
diag.attach(game);
const debug = new DebugPanel();
renderer.centerOn(game.hq.x, game.hq.y);
ui.toast(saved ? T().welcomeBack(first!.name) : T().welcome);

const islandName = (g: Game) => T().island(g.seed);

// Save to a manual slot: the given one, or a new one. Returns null if it could not save.
function save(name = saves.get(slotId ?? '')?.name ?? islandName(game), id = slotId ?? undefined): Slot | null {
  if (crashed()) return null; // Never write a broken game over a good save.
  try {
    const slot = saves.write(game.save(), name, id);
    slotId = slot.id;
    ui.toast(T().saved(slot.name));
    diag.event(`Saved to slot ${slot.id}`);
    return slot;
  } catch (err) {
    console.warn('Could not save', err);
    ui.toast(T().saveFailed);
    return null;
  }
}

function autosave() {
  if (crashed() || !saves.autosaveEvery) return;
  try {
    const slot = saves.autosave(game.save());
    diag.event(`Autosaved to slot ${slot.id}`);
  } catch (err) {
    console.warn('Could not autosave', err);
    ui.toast(T().autosaveFailed);
  }
}

function play(g: Game) {
  game = g;
  ui.game = g;
  ui.setPlacing(null);
  ui.select(0);
  renderer.centerOn(g.hq.x, g.hq.y);
  diag.attach(g);
  Object.assign(window, { game });
}

function load(slot: Slot) {
  const g = readSave(slot);
  if (!g) return ui.toast(T().loadFailed(slot.name));
  play(g);
  slotId = slot.auto ? null : slot.id;
  saveT = saves.autosaveEvery;
  ui.toast(T().loaded(slot.name));
}

function showSaves() {
  const wasPaused = ui.paused;
  ui.paused = true;
  ui.refresh();
  openSaveMenu(saves, {
    save: (name, id) => save(name, id),
    load,
    current: () => slotId,
    defaultName: () => saves.get(slotId ?? '')?.name ?? islandName(game),
    closed: () => {
      ui.paused = wasPaused;
      ui.refresh();
    },
  });
}

for (const btn of document.querySelectorAll<HTMLButtonElement>('#file button')) {
  btn.onclick = () => {
    const what = btn.dataset.file;
    if (what === 'report') return reportProblem();
    if (what === 'save') return void save();
    if (what === 'saves') return showSaves();
    if (what === 'lang') {
      setLang(getLang() === 'pl' ? 'en' : 'pl');
      return ui.relabel();
    }
    if (!confirm(T().confirmNew)) return;
    autosave(); // a safety copy, in case the player forgot
    play(new Game(Math.floor(Math.random() * 1e9)));
    slotId = null;
    ui.toast(T().newIsland);
  };
}
addEventListener('pagehide', autosave);

let hover: P | null = null;
let preview: P[] | null = null;
let previewKey = '';
let drag: { x: number; y: number; cx: number; cy: number; moved: boolean; button: number } | null = null;
const keys = new Set<string>();

canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, cx: renderer.cam.x, cy: renderer.cam.y, moved: false, button: e.button };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  hover = renderer.screenToTile(e.clientX, e.clientY);
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 5) drag.moved = true;
  if (drag.moved) {
    renderer.cam.x = drag.cx - dx / renderer.cam.zoom;
    renderer.cam.y = drag.cy - dy / renderer.cam.zoom;
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (drag && !drag.moved) {
    const t = renderer.screenToTile(e.clientX, e.clientY);
    if (drag.button === 2) cancel();
    else if (drag.button === 0) click(t, e.shiftKey);
  }
  drag = null;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const cam = renderer.cam;
  const before = { x: (e.clientX - renderer.w / 2) / cam.zoom, y: (e.clientY - renderer.h / 2) / cam.zoom };
  cam.zoom = Math.max(0.45, Math.min(2.6, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
  cam.x += before.x - (e.clientX - renderer.w / 2) / cam.zoom;
  cam.y += before.y - (e.clientY - renderer.h / 2) / cam.zoom;
}, { passive: false });

addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
    return;
  }
  keys.add(e.key.toLowerCase());
  if (e.key === 'Escape') cancel();
  if (e.key === 'F3') {
    e.preventDefault();
    debug.toggle();
  }
  if (e.key === 'r' || e.key === 'R') ui.setPlacing(ui.placing === 'road' ? null : 'road');
  if (e.key === 'x' || e.key === 'X') ui.setPlacing(ui.placing === 'remove' ? null : 'remove');
  const n = Number(e.key);
  if (n >= 1 && n <= BUILDABLE.length) ui.setPlacing(BUILDABLE[n - 1]);
  if (e.key === ' ') {
    ui.paused = !ui.paused;
    ui.refresh();
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// Step back one level: drop the road being drawn, then the tool, then the selection.
function cancel() {
  if (ui.placing === 'road' && ui.roadFrom) ui.roadFrom = 0;
  else if (ui.placing) ui.setPlacing(null);
  else ui.select(0);
}

function click(t: P, keep: boolean) {
  if (ui.placing === 'road') {
    const res = ui.roadFrom ? game.buildRoad(ui.roadFrom, t) : game.startFlag(t);
    diag.event(`Road ${ui.roadFrom ? `from flag #${ui.roadFrom}` : 'start'} at ${t.x},${t.y}: ${typeof res === 'string' ? `refused (${res})` : `ok, flag #${res.id}`}`);
    if (typeof res === 'string') return ui.toast(res);
    ui.roadFrom = res.id;
    return;
  }
  if (ui.placing === 'remove') {
    const why = game.removeAt(t);
    diag.event(`Remove at ${t.x},${t.y}: ${why ? `refused (${why})` : 'ok'}`);
    if (why) ui.toast(why);
    return;
  }
  if (ui.placing) {
    const why = game.canPlace(ui.placing, t.x, t.y);
    diag.event(`Place ${ui.placing} at ${t.x},${t.y}: ${why ? `refused (${why})` : 'ok'}`);
    if (why) return ui.toast(why);
    game.place(ui.placing, t.x, t.y);
    if (!keep) ui.setPlacing(null);
    return;
  }
  const tile = game.world.inside(t.x, t.y) ? game.world.at(t.x, t.y) : null;
  ui.select(tile?.b ?? 0);
}

const STEP = 1 / 30;
let last = performance.now();
let acc = 0;
let uiT = 0;
let saveT: number = saves.autosaveEvery;

function frame(now: number) {
  if (crashed()) return;
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  const pan = (700 / renderer.cam.zoom) * dt;
  if (keys.has('a') || keys.has('arrowleft')) renderer.cam.x -= pan;
  if (keys.has('d') || keys.has('arrowright')) renderer.cam.x += pan;
  if (keys.has('w') || keys.has('arrowup')) renderer.cam.y -= pan;
  if (keys.has('s') || keys.has('arrowdown')) renderer.cam.y += pan;

  const t0 = performance.now();
  if (!ui.paused) {
    acc += dt * ui.speed;
    let n = 0;
    while (acc >= STEP && n++ < 40) {
      game.update(STEP);
      acc -= STEP;
    }
    if (n >= 40) {
      acc = 0;
      diag.event('Game could not keep up, skipped ahead');
    }
    diag.tick();
  }
  const t1 = performance.now();

  const tool = ui.placing === 'road' || ui.placing === 'remove' ? ui.placing : null;
  const placing = tool ? null : (ui.placing as BType | null);
  const placeOk = !!placing && !!hover && !game.canPlace(placing, hover.x, hover.y);
  const key = `${ui.roadFrom}:${hover?.x},${hover?.y}:${game.net}`;
  if (key !== previewKey) {
    previewKey = key;
    preview = tool === 'road' && ui.roadFrom && hover ? game.planRoad(ui.roadFrom, hover) : null;
  }
  renderer.draw(game, { hover, placing, placeOk, tool, roadFrom: ui.roadFrom, preview, selected: ui.selected }, now / 1000);
  diag.frame(dt * 1000, t1 - t0, performance.now() - t1);

  uiT -= dt;
  if (uiT <= 0) {
    uiT = 0.2;
    ui.refresh();
    debug.refresh();
  }
  saveT -= dt;
  if (saveT <= 0) {
    saveT = saves.autosaveEvery || 60; // when autosave is off, look again in a minute
    autosave();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

Object.assign(window, { game, diag, renderer }); // handy for poking at state from the console
