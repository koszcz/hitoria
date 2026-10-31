// Takes the screenshot at the top of the README, docs/screenshot.jpg.
//
//   bun run readme:shot
//
// Grows the same village every time (see village.ts), saves it, and opens this checkout as it is
// now in headless Chrome with that save loaded. So the picture only changes when the game does.
import { mkdirSync } from 'node:fs';
import { CACHE, build, launchChrome, serve } from '../../changelog/builds';
import { ROOT } from '../../changelog/entries';
import { Saves } from '../../src/saves';
import { growVillage } from './village';

const FILE = `${ROOT}/docs/screenshot.jpg`;
const VIEW = { width: 1280, height: 760 };
const LOAD_MS = 5000; // time for the island to appear, settlers to walk out and the welcome note to fade

// The save, as the keys and values the game keeps in local storage.
const store = new Map<string, string>();
const saves = new Saves({
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, v),
  removeItem: (k) => void store.delete(k),
});
saves.write(growVillage().save(), 'README village');
store.set('hitoria.graphics', 'high'); // headless Chrome is slow, and auto graphics would drop to Low

mkdirSync(CACHE, { recursive: true });
const server = serve(build(null));
const browser = await launchChrome();
try {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  await page.evaluateOnNewDocument((items: [string, string][]) => {
    for (const [k, v] of items) localStorage.setItem(k, v);
  }, [...store]);
  await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'load' });
  await Bun.sleep(LOAD_MS);
  await page.screenshot({ path: FILE as `${string}.jpeg`, type: 'jpeg', quality: 80 });
  console.log(`Saved ${FILE}`);
} finally {
  await browser.close();
  server.stop(true);
}
