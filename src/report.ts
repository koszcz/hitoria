// Builds reports the player can copy or send: one when the game crashes, and one when the
// player reports a problem that isn't a crash.
import type { Game } from './game';
import { diag } from './diag';
import { T } from './i18n';

const CRASH_KEY = 'hitoria.crash';

let getGame: () => Game | undefined = () => undefined;
let crashReport = '';

export const crashed = () => crashReport !== '';

// Tell the reports where to find the running game.
export function watch(get: () => Game | undefined) {
  getGame = get;
}

// Keep warnings and errors in the event log, since they often explain what went wrong.
for (const level of ['warn', 'error'] as const) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    const msg = args.map(text).join(' ');
    if (!msg.startsWith('[hitoria]')) diag.event(`console.${level}: ${msg}`);
    orig(...args);
  };
}

window.addEventListener('error', (e) => crash(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => crash(e.reason));

function text(v: unknown): string {
  if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function build(title: string, heading: string, body: string): string {
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
    `## ${title}`,
    `When: ${new Date().toISOString()}`,
    `Page: ${location.href}`,
    `Browser: ${navigator.userAgent}`,
    game ? `Island seed: ${game.seed} · game time ${game.time.toFixed(1)} s · population ${game.population}` : '',
    '',
    `### ${heading}`,
    body,
    '',
    diag.report(),
    '',
    '### Save at the moment of the report',
    save,
  ].join('\n');
}

// In development, the dev server writes each report to reports/ so Claude can read it.
function send(kind: string, report: string) {
  return fetch(`/report/${kind}`, { method: 'POST', body: report })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
}

function crash(err: unknown) {
  if (crashed()) return; // Only the first error matters. Later ones are usually knock-on effects.
  crashReport = build('Hitoria crash report', 'Error', text(err));
  try {
    localStorage.setItem(CRASH_KEY, crashReport);
  } catch {}
  send('crash', crashReport);
  show(T().crashTitle, T().crashIntro, crashReport, true);
}

// Ask the player what looks wrong, then show a report with everything the game knows right now.
export async function reportProblem() {
  if (crashed() || document.getElementById('report')) return;
  const what = prompt(T().reportAsk);
  if (what === null) return;
  diag.event(`Player reported a problem: ${what || '(no description)'}`);
  const report = build('Hitoria problem report', 'What the player saw', what || '(no description)');
  const file = await send('problem', report);
  show(T().reportTitleBox, file ? T().reportSaved(file) : T().reportCopyIntro, report, false);
}

function show(title: string, intro: string, report: string, fatal: boolean) {
  const box = document.createElement('div');
  box.id = 'report';
  box.innerHTML = `
    <div class="panel">
      <h2></h2>
      <p></p>
      <textarea readonly></textarea>
      <div class="actions">
        <button data-act="copy">${T().copyReport}</button>
        ${fatal ? `<button data-act="reload">${T().reload}</button>` : `<button data-act="close">${T().backToGame}</button>`}
      </div>
    </div>`;
  box.querySelector('h2')!.textContent = title;
  box.querySelector('p')!.textContent = intro;
  const area = box.querySelector('textarea')!;
  area.value = report;
  const copy = box.querySelector<HTMLButtonElement>('[data-act=copy]')!;
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      area.select();
      document.execCommand('copy');
    }
    copy.textContent = T().copied;
  };
  const reload = box.querySelector<HTMLButtonElement>('[data-act=reload]');
  if (reload) reload.onclick = () => location.reload();
  const close = box.querySelector<HTMLButtonElement>('[data-act=close]');
  if (close) close.onclick = () => box.remove();
  document.body.appendChild(box);
}
