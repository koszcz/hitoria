// Takes before and after screenshots for a changelog entry.
//
//   bun run changelog:shots <entry id>...   one or more entries
//   bun run changelog:shots --all           every entry that has shots
//
// "After" is the entry's commit (see entries.ts), or this checkout as it is now, with uncommitted
// changes, if the entry is not committed yet. "Before" is the entry's `before` field, or else the
// commit's parent, or else the point where this branch left main. Each version is built into a temporary folder, served,
// and opened in headless Chrome on the same island (a fixed seed) with a fresh, empty save store.
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { ROOT, SHOTS, readEntries, readEntry, type Entry, type Shot, type Step } from './entries';

const SEED = 20261030;
const VIEW = { width: 1280, height: 800 };
const LOAD_MS = 3000; // time for the island to appear and settlers to start moving
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CACHE = `${tmpdir()}/hitoria-builds`;

const git = (...args: string[]) => {
  const r = Bun.spawnSync(['git', ...args], { cwd: ROOT, stderr: 'pipe' });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.toString().trim()}`);
  return r.stdout.toString().trim();
};
const tryGit = (...args: string[]) => {
  try {
    return git(...args);
  } catch {
    return '';
  }
};

function run(cmd: string[], cwd: string) {
  const r = Bun.spawnSync(cmd, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(' ')} failed in ${cwd}:\n${r.stderr.toString()}`);
}

// Which versions to compare. null means "this checkout as it is now". undefined means there is no
// earlier version, as for the very first commit.
function versions(e: Entry): { before?: string; after: string | null } {
  if (e.commit) {
    const after = git('rev-parse', e.commit);
    const before = e.before ? git('rev-parse', e.before) : tryGit('rev-parse', `${after}^`) || undefined;
    return { before, after };
  }
  const before = git('rev-parse', e.before ?? (tryGit('merge-base', 'HEAD', 'main') || 'HEAD'));
  return { before, after: null };
}

// Builds one version of the game and returns the folder with its index.html.
function build(commit: string | null): string {
  const bun = process.execPath;
  if (commit === null) {
    const out = `${CACHE}/working-tree`;
    rmSync(out, { recursive: true, force: true });
    run([bun, 'build', './index.html', '--outdir', out, '--minify'], ROOT);
    return out;
  }
  const out = `${CACHE}/${commit}`;
  if (existsSync(`${out}/index.html`)) return out;
  const src = `${CACHE}/src-${commit}`;
  rmSync(src, { recursive: true, force: true });
  tryGit('worktree', 'prune');
  git('worktree', 'add', '--detach', src, commit);
  try {
    run([bun, 'install'], src);
    run([bun, 'build', './index.html', '--outdir', out, '--minify'], src);
  } finally {
    git('worktree', 'remove', '--force', src);
  }
  return out;
}

function serve(dir: string) {
  return Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(req) {
      const path = new URL(req.url).pathname;
      const file = Bun.file(`${dir}${path === '/' ? '/index.html' : path}`);
      // Old versions post crash and problem reports to the dev server. Accept and drop them.
      if (req.method !== 'GET') return new Response('ok');
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
    },
  });
}

async function point(page: Page, target: string | [number, number]): Promise<[number, number] | null> {
  if (Array.isArray(target)) return [VIEW.width / 2 + target[0], VIEW.height / 2 + target[1]];
  const box = await (await page.$(target))?.boundingBox();
  return box ? [box.x + box.width / 2, box.y + box.height / 2] : null;
}

async function runStep(page: Page, step: Step, log: (msg: string) => void) {
  if ('wait' in step) return void (await Bun.sleep(step.wait));
  if ('key' in step) {
    // "Control+s" holds Control while it presses s.
    const keys = step.key.split('+') as never[];
    for (const k of keys) await page.keyboard.down(k);
    for (const k of keys.reverse()) await page.keyboard.up(k);
    return;
  }
  const [action, target] = 'click' in step ? (['click', step.click] as const) : (['hover', step.hover] as const);
  const at = await point(page, target);
  if (!at) return log(`  ${action} ${target}: not in this version, skipped`);
  await page.mouse.move(...at, { steps: 5 });
  if (action === 'click') await page.mouse.click(...at);
}

async function capture(browser: Browser, url: string, shot: Shot, file: string, log: (msg: string) => void) {
  const context = await browser.createBrowserContext(); // a fresh, empty localStorage
  try {
    const page = await context.newPage();
    await page.setViewport(VIEW);
    await page.goto(`${url}/?seed=${SEED}`, { waitUntil: 'load' });
    await Bun.sleep(LOAD_MS);
    for (const step of shot.steps ?? []) await runStep(page, step, log);
    await Bun.sleep(300); // let the last frame draw
    await page.screenshot({ path: file as `${string}.jpeg`, type: 'jpeg', quality: 82 });
  } finally {
    await context.close();
  }
}

async function shoot(browser: Browser, e: Entry) {
  const log = (msg: string) => console.log(msg);
  const { before, after } = versions(e);
  console.log(`${e.id}: before ${before?.slice(0, 7) ?? '(none)'}, after ${after?.slice(0, 7) ?? 'this checkout'}`);
  const dir = `${SHOTS}/${e.id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [side, commit] of [['before', before], ['after', after]] as const) {
    if (commit === undefined) continue;
    const server = serve(build(commit));
    try {
      for (const shot of e.shots) {
        await capture(browser, `http://127.0.0.1:${server.port}`, shot, `${dir}/${shot.name}-${side}.jpg`, log);
        log(`  ${shot.name}-${side}.jpg`);
      }
    } finally {
      server.stop(true);
    }
  }
}

const args = process.argv.slice(2);
const entries = args.includes('--all') ? readEntries().filter((e) => e.shots.length) : args.map(readEntry);
if (!entries.length) {
  console.error('Name the entries to shoot, such as: bun run changelog:shots 2026-10-30-build-bar-cards');
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
try {
  for (const e of entries) await shoot(browser, e);
} finally {
  await browser.close();
}
