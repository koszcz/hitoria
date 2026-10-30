// Catches any uncaught error, stops the game and shows a report the player can copy or send.
import type { Game } from './game';

const CRASH_KEY = 'hitoria.crash';
const LOG_SIZE = 30;

const log: string[] = [];
let getGame: () => Game | undefined = () => undefined;
let report = '';

export const crashed = () => report !== '';

// Tell the crash report where to find the running game.
export function watch(get: () => Game | undefined) {
  getGame = get;
}

// Keep the last few warnings and errors, since they often explain the crash.
for (const level of ['warn', 'error'] as const) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    log.push(`${new Date().toISOString().slice(11, 19)} ${level}: ${args.map(text).join(' ')}`);
    if (log.length > LOG_SIZE) log.shift();
    orig(...args);
  };
}

addEventListener('error', (e) => crash(e.error ?? e.message));
addEventListener('unhandledrejection', (e) => crash(e.reason));

function text(v: unknown): string {
  if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function build(err: unknown): string {
  const game = getGame();
  let save = '(no game running)';
  if (game) {
    try {
      save = JSON.stringify(game.save());
    } catch (e) {
      save = `(could not save: ${text(e)})`;
    }
  }
  return [
    '## Hitoria crash report',
    `When: ${new Date().toISOString()}`,
    `Page: ${location.href}`,
    `Browser: ${navigator.userAgent}`,
    game ? `Island seed: ${game.seed} · game time ${game.time.toFixed(1)} s · population ${game.population}` : '',
    '',
    '### Error',
    text(err),
    '',
    '### Recent warnings and errors',
    log.length ? log.join('\n') : '(none)',
    '',
    '### Save at the moment of the crash',
    save,
  ].join('\n');
}

function crash(err: unknown) {
  if (crashed()) return; // Only the first error matters. Later ones are usually knock-on effects.
  report = build(err);
  try {
    localStorage.setItem(CRASH_KEY, report);
  } catch {}
  // In development, the dev server writes the report to crashes/ so Claude can read it.
  fetch('/crash', { method: 'POST', body: report }).catch(() => {});
  show();
}

function show() {
  const box = document.createElement('div');
  box.id = 'crash';
  box.innerHTML = `
    <div class="panel">
      <h2>Hitoria crashed</h2>
      <p>The game has stopped. Your last save is safe. Copy this report and paste it into the chat.</p>
      <textarea readonly></textarea>
      <div class="actions">
        <button data-crash="copy">📋 Copy report</button>
        <button data-crash="reload">🔄 Reload from last save</button>
      </div>
    </div>`;
  box.querySelector('textarea')!.value = report;
  const copy = box.querySelector<HTMLButtonElement>('[data-crash=copy]')!;
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      box.querySelector('textarea')!.select();
      document.execCommand('copy');
    }
    copy.textContent = '✅ Copied';
  };
  box.querySelector<HTMLButtonElement>('[data-crash=reload]')!.onclick = () => location.reload();
  document.body.appendChild(box);
}
