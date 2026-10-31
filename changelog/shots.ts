// Takes before and after screenshots for a changelog entry.
//
//   bun run changelog:shots <entry id>...   one or more entries
//   bun run changelog:shots --all           every entry that has shots
//
// "After" is the entry's commit (see entries.ts), or this checkout as it is now, with uncommitted
// changes, if the entry is not committed yet. "Before" is the entry's `before` field, or else the
// commit's parent, or else the point where this branch left main. Each version is built into a temporary folder, served,
// and opened in headless Chrome on the same island (a fixed seed) with a fresh, empty save store.
import { mkdirSync, rmSync } from 'node:fs';
import type { Browser, Page } from 'puppeteer-core';
import { CACHE, build, git, launchChrome, serve, tryGit } from './builds';
import { SHOTS, readEntries, readEntry, viewFor, type Entry, type Shot, type Step, type View } from './entries';

const SEED = 20261030;
const LOAD_MS = 3000; // time for the island to appear and settlers to start moving

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

async function point(page: Page, view: View, target: string | [number, number]): Promise<[number, number] | null> {
  if (Array.isArray(target)) return [view.width / 2 + target[0], view.height / 2 + target[1]];
  const el = await page.$(target);
  // Bring an element that sits off screen, such as the end of a long bar, into view first.
  await el?.evaluate((node) => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  const box = await el?.boundingBox();
  return box ? [box.x + box.width / 2, box.y + box.height / 2] : null;
}

async function runStep(page: Page, view: View, step: Step, log: (msg: string) => void) {
  if ('wait' in step) return void (await Bun.sleep(step.wait));
  if ('key' in step) {
    // "Control+s" holds Control while it presses s.
    const keys = step.key.split('+') as never[];
    for (const k of keys) await page.keyboard.down(k);
    for (const k of keys.reverse()) await page.keyboard.up(k);
    return;
  }
  const [action, target] = 'click' in step ? (['click', step.click] as const) : (['hover', step.hover] as const);
  const at = await point(page, view, target);
  if (!at) return log(`  ${action} ${target}: not in this version, skipped`);
  if (view.hasTouch) return void (action === 'click' && (await page.touchscreen.tap(...at)));
  await page.mouse.move(...at, { steps: 5 });
  if (action === 'click') await page.mouse.click(...at);
}

// Makes the page see these browser languages, in this order.
async function useLanguages(page: Page, languages: string[]) {
  await page.setExtraHTTPHeaders({ 'Accept-Language': languages.join(',') });
  await page.evaluateOnNewDocument((langs: string[]) => {
    Object.defineProperty(navigator, 'languages', { get: () => langs });
    Object.defineProperty(navigator, 'language', { get: () => langs[0] });
  }, languages);
}

async function capture(browser: Browser, url: string, shot: Shot, file: string, log: (msg: string) => void) {
  const context = await browser.createBrowserContext(); // a fresh, empty localStorage
  try {
    const page = await context.newPage();
    const view = viewFor(shot);
    await page.setViewport(view);
    if (view.hasTouch) {
      const cdp = await page.createCDPSession();
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }],
      });
    }
    if (shot.languages) await useLanguages(page, shot.languages);
    // Headless Chrome draws slowly, and auto graphics would drop to Low. Pin High for every shot.
    await page.evaluateOnNewDocument(() => localStorage.setItem('hitoria.graphics', 'high'));
    await page.goto(`${url}/?seed=${SEED}`, { waitUntil: 'load' });
    await Bun.sleep(LOAD_MS);
    for (const step of shot.steps ?? []) await runStep(page, view, step, log);
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
const browser = await launchChrome();
try {
  for (const e of entries) await shoot(browser, e);
} finally {
  await browser.close();
}
