import { crashed, watch, reportProblem } from './report';
import { diag } from './diag';
import { DebugPanel } from './debug';
import { Game, BUILDABLE, BType, SaveData } from './game';
import { Renderer } from './render';
import { UI } from './ui';
import type { P } from './path';

const SAVE_KEY = 'hitoria.save';
const AUTOSAVE = 60; // seconds

function readSave(): Game | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return Game.load(JSON.parse(raw) as SaveData);
  } catch (err) {
    console.warn('Could not load the save', err);
    return null;
  }
}

// A ?seed= link always starts that island fresh; otherwise carry on from the last save.
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed'));
const saved = seed ? null : readSave();
let game = saved ?? new Game(seed || Math.floor(Math.random() * 1e9));
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const ui = new UI(game);
watch(() => game);
diag.attach(game);
const debug = new DebugPanel();
renderer.centerOn(game.hq.x, game.hq.y);
ui.toast(saved
  ? 'Welcome back! Your settlers are heading back to work.'
  : 'Welcome! Place a woodcutter, then press R and draw a road from its flag to your HQ.');

function save(quiet = false) {
  if (crashed()) return; // Never write a broken game over the last good save.
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.save()));
    if (!quiet) ui.toast('Game saved');
    diag.event(quiet ? 'Autosaved' : 'Saved');
  } catch (err) {
    console.warn('Could not save', err);
    ui.toast('Could not save the game. The browser storage may be full or blocked.');
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

for (const btn of document.querySelectorAll<HTMLButtonElement>('#file button')) {
  btn.onclick = () => {
    const what = btn.dataset.file;
    if (what === 'report') return reportProblem();
    if (what === 'save') return save();
    if (what === 'load') {
      const g = readSave();
      if (!g) return ui.toast('There is no saved game yet');
      play(g);
      return ui.toast('Loaded your last save');
    }
    if (!confirm('Start a new island? Your next save will replace the current one.')) return;
    play(new Game(Math.floor(Math.random() * 1e9)));
    ui.toast('A new island! Place a woodcutter, then press R and draw a road from its flag to your HQ.');
  };
}
addEventListener('pagehide', () => save(true));

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
    return save();
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
let saveT = AUTOSAVE;

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
    saveT = AUTOSAVE;
    save(true);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

Object.assign(window, { game, diag }); // handy for poking at state from the console
