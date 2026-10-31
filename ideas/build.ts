// Builds backlog.html, a dashboard of the ideas in ideas/backlog.md.
//
//   bun run backlog            writes backlog.html in the project folder
//   bun ideas/build.ts dist    writes dist/backlog.html
// The dev server also shows it live at /backlog.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { readBacklog, type Backlog, type Idea } from './parse';

const ROOT = resolve(import.meta.dir, '..');
const EFFORTS = ['S', 'M', 'L'];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const inline = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

// An idea is blocked while any idea it needs is not in Done.
export function blockers(idea: Idea, backlog: Backlog) {
  const done = new Set((backlog.Done ?? []).map((i) => i.title));
  return idea.needs.filter((n) => !done.has(n));
}

const score = (i: Idea) => `${i.fun ? `<span class="fun f${i.fun}">${'★'.repeat(i.fun)}</span>` : ''}${i.effort ? `<span class="effort">${i.effort}</span>` : ''}`;

function needs(idea: Idea, backlog: Backlog) {
  if (!idea.needs.length) return '';
  const open = blockers(idea, backlog);
  return `<p class="needs">Needs: ${idea.needs.map((n) => `<span class="${open.includes(n) ? 'open' : 'met'}">${esc(n)}</span>`).join(' ')}</p>`;
}

function card(idea: Idea, backlog: Backlog, rank?: number) {
  const blocked = blockers(idea, backlog).length > 0;
  return `<li class="card${blocked ? ' blocked' : ''}" data-blocked="${blocked}">
    <div class="top">${rank ? `<span class="rank">${rank}</span>` : ''}<strong>${esc(idea.title)}</strong>${score(idea)}</div>
    ${idea.text ? `<p>${inline(idea.text)}</p>` : ''}${needs(idea, backlog)}</li>`;
}

function column(title: string, ideas: Idea[], backlog: Backlog, ranked = false) {
  const body = ideas.length ? ideas.map((i, n) => card(i, backlog, ranked ? n + 1 : undefined)).join('') : '<li class="empty">Empty</li>';
  return `<section class="col"><h2>${title} <span class="count">${ideas.length}</span></h2><ul>${body}</ul></section>`;
}

// Fun from top to bottom, effort from left to right. The top-left corner is the best value.
function matrix(ideas: Idea[], backlog: Backlog) {
  const cell = (fun: number, effort: string) =>
    ideas
      .filter((i) => i.fun === fun && i.effort === effort)
      .map((i) => `<span class="chip${blockers(i, backlog).length ? ' blocked' : ''}" title="${esc(i.text)}">${esc(i.title)}</span>`)
      .join('');
  const rows = [3, 2, 1].map((f) => `<tr><th>Fun ${f}</th>${EFFORTS.map((e) => `<td>${cell(f, e)}</td>`).join('')}</tr>`).join('');
  return `<table class="matrix"><tr><th></th>${EFFORTS.map((e) => `<th>Effort ${e}</th>`).join('')}</tr>${rows}</table>`;
}

const byValue = (a: Idea, b: Idea) => (b.fun ?? 0) - (a.fun ?? 0) || EFFORTS.indexOf(a.effort ?? 'L') - EFFORTS.indexOf(b.effort ?? 'L');

function done(ideas: Idea[]) {
  if (!ideas.length) return '<p class="empty">Nothing yet</p>';
  return `<ol class="done">${ideas.map((i) => `<li><time>${i.date ?? ''}</time><strong>${esc(i.title)}</strong> ${inline(i.text)}</li>`).join('')}</ol>`;
}

export function render(backlog: Backlog) {
  const get = (s: string) => backlog[s] ?? [];
  const later = [...get('Later')].sort(byValue);
  const ready = later.filter((i) => !blockers(i, backlog).length).length;
  const stats = [
    ['Building now', get('Building now').length],
    ['Next', get('Next').length],
    ['Inbox', get('Inbox').length],
    ['Later', later.length],
    ['Ready in Later', ready],
    ['Done', get('Done').length],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hitoria backlog</title>
<style>
  :root { color-scheme: dark; --bg: #1f1a14; --card: #2b241c; --line: #4a3d2e; --text: #efe6d6; --dim: #b4a58e; --gold: #f2c14e; --green: #8fc46a; --red: #d9826b; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.45 system-ui, sans-serif; }
  main { max-width: 1280px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font: 700 36px Georgia, serif; color: var(--gold); margin: 0 0 4px; }
  h1 + p { color: var(--dim); margin: 0 0 20px; }
  h1 + p a { color: var(--gold); }
  h2 { font: 700 20px Georgia, serif; margin: 0 0 10px; }
  section { margin: 28px 0; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px 16px; min-width: 120px; }
  .stat b { display: block; font: 700 28px Georgia, serif; color: var(--gold); }
  .stat span { color: var(--dim); font-size: 13px; }
  .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .col { margin: 0; background: #0002; border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
  .count { color: var(--dim); font: 14px system-ui; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .card { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--green); border-radius: 8px; padding: 10px 12px; }
  .card.blocked { border-left-color: var(--red); }
  .card p { margin: 4px 0 0; color: var(--dim); }
  .top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .rank { background: var(--gold); color: var(--bg); border-radius: 50%; width: 22px; height: 22px; display: inline-grid; place-items: center; font-weight: 700; font-size: 13px; }
  .fun { color: var(--gold); letter-spacing: 1px; margin-left: auto; }
  .effort { border: 1px solid var(--line); border-radius: 4px; padding: 0 6px; font-size: 12px; color: var(--dim); }
  .needs { font-size: 13px; }
  .needs span { border-radius: 4px; padding: 0 5px; margin-right: 2px; }
  .needs .open { background: #d9826b33; color: var(--red); }
  .needs .met { background: #8fc46a33; color: var(--green); }
  .empty { color: var(--dim); font-style: italic; }
  .matrix { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .matrix th { color: var(--dim); font-weight: 600; font-size: 13px; padding: 6px; text-align: left; }
  .matrix tr th:first-child { width: 70px; }
  .matrix td { border: 1px solid var(--line); vertical-align: top; padding: 8px; background: #0002; }
  .matrix tr:nth-child(2) td:nth-child(2) { background: #f2c14e14; }
  .chip { display: inline-block; background: var(--card); border: 1px solid var(--green); border-radius: 999px; padding: 2px 10px; margin: 3px; font-size: 13px; cursor: help; }
  .chip.blocked { border-color: var(--red); color: var(--dim); }
  .legend { color: var(--dim); font-size: 13px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin: 0 4px 0 12px; }
  .filters button { background: var(--card); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 4px 12px; cursor: pointer; }
  .filters button.on { border-color: var(--gold); color: var(--gold); }
  #later ul { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); margin-top: 10px; }
  #later[data-show="ready"] .card.blocked, #later[data-show="blocked"] .card:not(.blocked) { display: none; }
  .done { list-style: none; padding: 0; margin: 0; border-left: 2px solid var(--line); }
  .done li { padding: 4px 0 4px 16px; color: var(--dim); }
  .done strong { color: var(--text); }
  .done time { display: inline-block; width: 96px; color: var(--gold); font-size: 13px; }
  code { background: #0003; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  @media (max-width: 800px) { .board { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>Hitoria backlog</h1>
  <p>Every idea in <code>ideas/backlog.md</code>, at a glance. <a href="changelog.html">Changelog</a> · <a href="./">Play Hitoria</a></p>
  <div class="stats">${stats.map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('')}</div>
  <section class="board">
    ${column('Building now', get('Building now'), backlog)}
    ${column('Next', get('Next'), backlog, true)}
    ${column('Inbox', get('Inbox'), backlog)}
  </section>
  <section>
    <h2>Fun and effort</h2>
    <p class="legend">Ideas in Next and Later. The best value is at the top left.<i style="background: var(--green)"></i>Ready to build<i style="background: var(--red)"></i>Waits for another idea</p>
    ${matrix([...get('Next'), ...later], backlog)}
  </section>
  <section id="later" data-show="all">
    <h2>Later <span class="count">${later.length}, most fun and least effort first</span></h2>
    <div class="filters">${['all', 'ready', 'blocked'].map((f) => `<button class="${f === 'all' ? 'on' : ''}" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join(' ')}</div>
    <ul>${later.map((i) => card(i, backlog)).join('')}</ul>
  </section>
  <section>
    <h2>Done <span class="count">${get('Done').length}</span></h2>
    ${done(get('Done'))}
  </section>
  <section>
    <h2>Dropped <span class="count">${get('Dropped').length}</span></h2>
    ${get('Dropped').length ? `<ul>${get('Dropped').map((i) => card(i, backlog)).join('')}</ul>` : '<p class="empty">Nothing dropped</p>'}
  </section>
</main>
<script>
  const later = document.getElementById('later');
  later.querySelectorAll('[data-filter]').forEach((b) => b.onclick = () => {
    later.dataset.show = b.dataset.filter;
    later.querySelectorAll('[data-filter]').forEach((o) => o.classList.toggle('on', o === b));
  });
</script>
</body>
</html>
`;
}

if (import.meta.main) {
  const out = resolve(ROOT, process.argv[2] ?? '.');
  mkdirSync(out, { recursive: true });
  await Bun.write(`${out}/backlog.html`, render(readBacklog()));
  console.log(`Wrote ${out}/backlog.html`);
}
