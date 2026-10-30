// Reads the changelog entries in changelog/entries/. Each entry is a Markdown file with YAML front matter.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

// One step of a screenshot script. Coordinates are pixels from the centre of the screen,
// where the game puts the HQ. A selector that a version does not have is skipped.
export type Step =
  | { wait: number }
  | { key: string } // a Puppeteer key name; join keys with + to hold them together, as in Control+s
  | { click: string | [number, number] }
  | { hover: string | [number, number] };

export type Shot = { name: string; caption?: string; steps?: Step[] };

export type Entry = {
  id: string; // the file name without .md, such as 2026-10-30-build-bar-cards
  title: string;
  date: string; // YYYY-MM-DD HH:MM, so entries on the same day keep their order
  kind: 'game' | 'dev';
  commit?: string; // the commit that made the change; by default the commit that added the entry file
  before?: string; // the version to compare with; see shots.ts for the default
  shots: Shot[];
  body: string; // Markdown
};

export const ROOT = resolve(import.meta.dir, '..');
export const ENTRIES = `${ROOT}/changelog/entries`;
export const SHOTS = `${ROOT}/changelog/shots`;

// The commit that added this entry file, or undefined while it is not committed yet.
function addedIn(id: string): string | undefined {
  const r = Bun.spawnSync(['git', 'log', '-1', '--diff-filter=A', '--format=%h', '--', `changelog/entries/${id}.md`], {
    cwd: ROOT,
    stderr: 'ignore',
  });
  return r.stdout.toString().trim() || undefined;
}

export function parseEntry(id: string, text: string): Entry {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${id}.md has no front matter`);
  const meta = Bun.YAML.parse(m[1]) as Partial<Entry>;
  if (!meta.title) throw new Error(`${id}.md has no title`);
  if (!meta.date) throw new Error(`${id}.md has no date`);
  return {
    id,
    title: meta.title,
    date: String(meta.date),
    kind: meta.kind === 'dev' ? 'dev' : 'game',
    commit: meta.commit ? String(meta.commit) : addedIn(id),
    before: meta.before ? String(meta.before) : undefined,
    shots: meta.shots ?? [],
    body: m[2].trim(),
  };
}

export function readEntry(id: string): Entry {
  return parseEntry(id, readFileSync(`${ENTRIES}/${id}.md`, 'utf8'));
}

// Newest first.
export function readEntries(): Entry[] {
  return readdirSync(ENTRIES)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readEntry(basename(f, '.md')))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
