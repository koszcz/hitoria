import { crashed, watch, reportProblem } from './report';
import { diag } from './diag';
import { DebugPanel } from './debug';
import { Game, BUILDABLE, BType } from './game';
import { Renderer } from './render/renderer';
import { UI } from './ui';
import { Gestures, zoomAt } from './input/gestures';
import { Saves, type Slot } from './saves';
import { openSaveMenu } from './savemenu';
import { T, getLang, setLang, startLang } from './i18n';
import type { P } from './path';
import { GraphicsSetting } from './quality/setting';
import { GRAPHICS, LEVELS } from './quality/levels';

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
const nav = navigator as Navigator & { deviceMemory?: number };
const graphics = new GraphicsSetting({ touch: matchMedia('(pointer: coarse)').matches, cores: nav.hardwareConcurrency, memory: nav.deviceMemory });
renderer.setGraphics(GRAPHICS[graphics.level]);
const ui = new UI(game);
ui.graphics = graphics;
ui.relabel();
watch(() => game);
diag.attach(game);
const debug = new DebugPanel(() => game, () => {
  const s = renderer.stats();
  return `graphics ${graphics.choice} (${graphics.level}) · ${s.calls} draw calls · ${(s.triangles / 1000).toFixed(0)}k triangles · ${s.pixelRatio}× pixels`;
});
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
    document.getElementById('file')!.classList.remove('open');
    const what = btn.dataset.file;
    if (what === 'report') return reportProblem();
    if (what === 'save') return void save();
    if (what === 'saves') return showSaves();
    if (what === 'graphics') {
      document.getElementById('file')!.classList.add('open'); // keep the menu open while cycling
      renderer.setGraphics(GRAPHICS[graphics.cycle()]);
      return ui.relabel();
    }
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
// On a narrow screen the file buttons fold away behind a menu button.
document.getElementById('menu')!.onclick = () => document.getElementById('file')!.classList.toggle('open');
window.addEventListener('pagehide', autosave);

let hover: P | null = null;
let preview: P[] | null = null;
let fields: P[] = []; // fields the farm under the cursor would take
let previewKey = '';
const keys = new Set<string>();
const gestures = new Gestures(renderer);

// On a touch screen there is no hover. A first tap aims (shows the ghost or road plan) and a
// second tap on the same tile builds.
let touch = matchMedia('(pointer: coarse)').matches;
function setTouch(on: boolean) {
  if (on === touch && document.body.classList.contains('touch') === on) return;
  touch = on;
  document.body.classList.toggle('touch', on);
  ui.relabel();
}
setTouch(touch);
window.addEventListener('pointerdown', (e) => setTouch(e.pointerType === 'touch'), true);

canvas.addEventListener('pointerdown', (e) => {
  document.getElementById('file')!.classList.remove('open');
  gestures.down(e.pointerId, e.clientX, e.clientY, e.button, e.pointerType === 'touch');
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {} // the pointer may already be gone; the gesture still works without capture
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch') hover = renderer.screenToTile(e.clientX, e.clientY);
  gestures.move(e.pointerId, e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', (e) => {
  const tap = gestures.up(e.pointerId);
  if (!tap) return;
  const t = renderer.screenToTile(tap.x, tap.y);
  if (tap.button === 2) cancel();
  else if (tap.button === 0 && tap.touch) touchTap(t);
  else if (tap.button === 0) click(t, e.shiftKey);
});
canvas.addEventListener('pointercancel', (e) => gestures.cancel(e.pointerId));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(renderer, e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// The tile a touch player aimed at, and the tool it was aimed with.
let aim: { tool: typeof ui.placing; t: P } | null = null;

function touchTap(t: P) {
  const aimed = aim && aim.tool === ui.placing && aim.t.x === t.x && aim.t.y === t.y;
  if (ui.placing && !aimed) {
    aim = { tool: ui.placing, t };
    return;
  }
  aim = null;
  click(t, false);
}

document.getElementById('done')!.onclick = () => ui.setPlacing(null);

window.addEventListener('keydown', (e) => {
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
  if (e.key === 'b' || e.key === 'B') ui.openBuild();
  if (e.key === 'r' || e.key === 'R') ui.setPlacing(ui.placing === 'road' ? null : 'road');
  if (e.key === 'x' || e.key === 'X') ui.setPlacing(ui.placing === 'remove' ? null : 'remove');
  const n = Number(e.key);
  if (n >= 1 && n <= BUILDABLE.length) ui.setPlacing(BUILDABLE[n - 1]);
  if (e.key === ' ') {
    ui.paused = !ui.paused;
    ui.refresh();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

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
  const frameMs = now - last; // unclamped, so auto graphics sees how slow a slow device really is
  const dt = Math.min(0.25, frameMs / 1000);
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

  if (touch) hover = aim && aim.tool === ui.placing ? aim.t : null;
  const tool = ui.placing === 'road' || ui.placing === 'remove' ? ui.placing : null;
  const placing = tool ? null : (ui.placing as BType | null);
  const placeOk = !!placing && !!hover && !game.canPlace(placing, hover.x, hover.y);
  const key = `${ui.placing}:${placeOk}:${ui.roadFrom}:${hover?.x},${hover?.y}:${game.net}`;
  if (key !== previewKey) {
    previewKey = key;
    if (tool === 'road' && ui.roadFrom && hover) preview = game.planRoad(ui.roadFrom, hover);
    else preview = placeOk ? game.planAutoRoad(placing!, hover!.x, hover!.y) : null;
    fields = placeOk ? game.planFields(placing!, hover!.x, hover!.y) : [];
  }
  renderer.draw(game, { hover, placing, placeOk, tool, roadFrom: ui.roadFrom, preview, fields, selected: ui.selected }, now / 1000);
  diag.frame(dt * 1000, t1 - t0, performance.now() - t1);
  // On auto, the graphics level follows how fast frames are. Tell the player when it drops.
  const was = graphics.level, changed = graphics.frame(frameMs);
  if (changed) {
    renderer.setGraphics(GRAPHICS[changed]);
    diag.event(`Graphics set to ${changed} automatically (was ${was})`);
    ui.relabel();
    if (LEVELS.indexOf(changed) < LEVELS.indexOf(was)) ui.toast(T().graphicsLowered(T().levels[changed]));
  }

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
