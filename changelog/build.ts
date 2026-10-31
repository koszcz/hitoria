// Builds changelog.html from the entries in changelog/entries/ and their screenshots.
//
//   bun run changelog          writes changelog.html in the project folder
//   bun changelog/build.ts dist   writes dist/changelog.html and copies the screenshots next to it
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, SHOTS, readEntries, type Entry } from './entries';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function day(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function figure(src: string, label: string) {
  if (!existsSync(`${ROOT}/${src}`)) return `<div class="missing">No ${label === 'Screenshot' ? '' : `${label.toLowerCase()} `}screenshot yet</div>`;
  return `<figure><figcaption>${label}</figcaption><a href="${src}"><img src="${src}" alt="${label}" loading="lazy"></a></figure>`;
}

function entry(e: Entry) {
  const shots = e.shots
    .map((s) => {
      const base = `changelog/shots/${e.id}/${s.name}`;
      const before = existsSync(`${ROOT}/${base}-before.jpg`) ? figure(`${base}-before.jpg`, 'Before') : '';
      return `<div class="shot">${s.caption ? `<p class="caption">${esc(s.caption)}</p>` : ''}
        <div class="pair${before ? '' : ' single'}${s.device === 'phone' ? ' phone' : ''}">${before}${figure(`${base}-after.jpg`, before ? 'After' : 'Screenshot')}</div></div>`;
    })
    .join('');
  return `<article class="${e.kind}" id="${e.id}">
    <header><h2><a href="#${e.id}">${esc(e.title)}</a></h2>
      <p class="meta">${day(e.date)}${e.kind === 'dev' ? ' · behind the scenes' : ''}${e.commit ? ` · <code>${esc(e.commit.slice(0, 7))}</code>` : ''}</p></header>
    ${Bun.markdown.html(e.body)}${shots}</article>`;
}

export function render(entries: Entry[]) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hitoria changelog</title>
<style>
  :root { color-scheme: dark; --bg: #1f1a14; --card: #2b241c; --line: #4a3d2e; --text: #efe6d6; --dim: #b4a58e; --gold: #f2c14e; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font: 700 36px Georgia, serif; color: var(--gold); margin: 0 0 4px; }
  h1 + p { color: var(--dim); margin: 0 0 24px; }
  label { color: var(--dim); font-size: 14px; cursor: pointer; }
  article { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 20px 24px; margin: 20px 0; }
  article.dev { padding: 12px 24px; }
  article.dev h2 { font-size: 17px; }
  body:not(.show-dev) article.dev { display: none; }
  h2 { font: 700 22px Georgia, serif; margin: 0; }
  h2 a { color: inherit; text-decoration: none; }
  .meta { color: var(--dim); font-size: 14px; margin: 2px 0 12px; }
  code { background: #0003; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  .caption { color: var(--dim); font-style: italic; margin: 16px 0 8px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pair.single { grid-template-columns: 1fr; max-width: 640px; }
  .pair.phone { max-width: 560px; }
  .pair.phone.single { max-width: 280px; }
  figure { margin: 0; }
  figcaption { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gold); margin-bottom: 4px; }
  img { width: 100%; display: block; border-radius: 6px; border: 1px solid var(--line); }
  .missing { color: var(--dim); border: 1px dashed var(--line); border-radius: 6px; padding: 24px; text-align: center; }
  @media (max-width: 700px) { .pair { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>Hitoria changelog</h1>
  <p>What changed in the game, newest first. <a href="./" style="color: var(--gold)">Play Hitoria</a></p>
  <label><input type="checkbox" onchange="document.body.classList.toggle('show-dev', this.checked)"> Show behind-the-scenes changes</label>
  ${entries.map(entry).join('\n')}
</main>
</body>
</html>
`;
}

if (import.meta.main) {
  const out = resolve(ROOT, process.argv[2] ?? '.');
  mkdirSync(out, { recursive: true });
  await Bun.write(`${out}/changelog.html`, render(readEntries()));
  if (out !== ROOT) cpSync(SHOTS, `${out}/changelog/shots`, { recursive: true });
  console.log(`Wrote ${out}/changelog.html`);
}
