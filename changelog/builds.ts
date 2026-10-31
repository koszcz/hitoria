// Builds a version of the game, serves it locally and opens headless Chrome, for the tools that
// take screenshots: changelog/shots.ts and scripts/readme/shot.ts.
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';
import { ROOT } from './entries';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const CACHE = `${tmpdir()}/hitoria-builds`;

export const git = (...args: string[]) => {
  const r = Bun.spawnSync(['git', ...args], { cwd: ROOT, stderr: 'pipe' });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.toString().trim()}`);
  return r.stdout.toString().trim();
};
export const tryGit = (...args: string[]) => {
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

// Builds one version of the game and returns the folder with its index.html. null means this
// checkout as it is now, with uncommitted changes.
export function build(commit: string | null): string {
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

export function serve(dir: string) {
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

export function launchChrome() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  });
}
