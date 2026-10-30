import { Game, BUILDABLE } from './game';
import { Renderer } from './render';
import { UI } from './ui';
import type { P } from './path';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const game = new Game(seed);
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const ui = new UI(game);
renderer.centerOn(game.hq.x, game.hq.y);
ui.toast('Welcome! Build a woodcutter, then a sawmill to keep planks flowing.');

let hover: P | null = null;
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
    if (drag.button === 2) ui.placing ? ui.setPlacing(null) : ui.select(0);
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
  keys.add(e.key.toLowerCase());
  if (e.key === 'Escape') ui.placing ? ui.setPlacing(null) : ui.select(0);
  const n = Number(e.key);
  if (n >= 1 && n <= BUILDABLE.length) ui.setPlacing(BUILDABLE[n - 1]);
  if (e.key === ' ') {
    ui.paused = !ui.paused;
    ui.refresh();
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

function click(t: P, keep: boolean) {
  if (ui.placing) {
    const why = game.canPlace(ui.placing, t.x, t.y);
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

function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  const pan = (700 / renderer.cam.zoom) * dt;
  if (keys.has('a') || keys.has('arrowleft')) renderer.cam.x -= pan;
  if (keys.has('d') || keys.has('arrowright')) renderer.cam.x += pan;
  if (keys.has('w') || keys.has('arrowup')) renderer.cam.y -= pan;
  if (keys.has('s') || keys.has('arrowdown')) renderer.cam.y += pan;

  if (!ui.paused) {
    acc += dt * ui.speed;
    let n = 0;
    while (acc >= STEP && n++ < 40) {
      game.update(STEP);
      acc -= STEP;
    }
    if (n >= 40) acc = 0;
  }

  const placeOk = !!ui.placing && !!hover && !game.canPlace(ui.placing, hover.x, hover.y);
  renderer.draw(game, { hover, placing: ui.placing, placeOk, selected: ui.selected }, now / 1000);

  uiT -= dt;
  if (uiT <= 0) {
    uiT = 0.2;
    ui.refresh();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

Object.assign(window, { game }); // handy for poking at state from the console
