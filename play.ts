// Play server: runs a frozen copy of main that other sessions cannot reload or stop.
//
// The copy lives in a git worktree next to this repository, named <repo>-play. Each start moves it to
// the newest commit on main, so restart to pick up new features. It runs as "play" on its own port,
// so it is its own front door and does not depend on any other running copy.
import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const PORT = process.env.PORT || '5174';

const git = (...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { stdout: 'pipe', stderr: 'inherit' });
  if (!result.success) process.exit(1);
  return result.stdout.toString().trim();
};

const repo = dirname(resolve(git('rev-parse', '--git-common-dir')));
const playDir = resolve(dirname(repo), `${basename(repo)}-play`);

if (existsSync(playDir)) git('-C', playDir, 'checkout', '--quiet', '--detach', 'main');
else git('-C', repo, 'worktree', 'add', '--quiet', '--detach', playDir, 'main');
console.log(`Playing commit ${git('-C', playDir, 'log', '-1', '--format=%h %s')}`);

const run = (cmd: string[]) =>
  Bun.spawn(cmd, { cwd: playDir, stdio: ['inherit', 'inherit', 'inherit'], env: { ...process.env, DEV_NAME: 'play', PORT } });

if ((await run(['bun', 'install', '--silent']).exited) !== 0) process.exit(1);
const server = run(['bun', 'dev.ts']);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, () => server.kill(signal));
process.exit(await server.exited);
