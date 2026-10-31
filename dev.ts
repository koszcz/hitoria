// Dev server: serves the game and saves crash and problem reports from the browser to reports/.
//
// Each checkout (the main folder or a git worktree) gets its own address, http://<branch>.localhost:5173,
// so several copies can run side by side. The game itself runs on a free port. Whichever dev server
// grabs port 5173 first acts as the front door: it reads the Host header and forwards the request to
// the right copy. Copies list themselves in .git/dev-routes/, which all worktrees share. If the front
// door stops, another running copy takes over within a few seconds.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { ServerWebSocket } from 'bun';
import index from './index.html';

const FRONT_PORT = Number(process.env.PORT) || 5173;

const git = (...args: string[]) => Bun.spawnSync(['git', ...args], { stderr: 'ignore' }).stdout.toString().trim();
const name =
  (process.env.DEV_NAME || git('branch', '--show-current') || basename(process.cwd()))
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || 'dev';
const routesDir = resolve(git('rev-parse', '--git-common-dir') || '.', 'dev-routes');
const routeFile = `${routesDir}/${name}.json`;

type Route = { port: number; pid: number; dir: string };

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function readRoute(routeName: string): Route | undefined {
  try {
    const route: Route = JSON.parse(readFileSync(`${routesDir}/${routeName}.json`, 'utf8'));
    return isAlive(route.pid) ? route : undefined;
  } catch {
    return undefined;
  }
}

function liveRoutes(): [string, Route][] {
  const names = readdirSync(routesDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  return names.flatMap((n) => {
    const route = readRoute(n);
    return route ? [[n, route] as [string, Route]] : [];
  });
}

mkdirSync(routesDir, { recursive: true });
const taken = readRoute(name);
if (taken && taken.pid !== process.pid) {
  console.error(`Another copy is already running as "${name}" (from ${taken.dir}).`);
  if (taken.dir === process.cwd()) console.error(`It already serves this folder, so use it: http://${name}.localhost:5173/`);
  else console.error('Stop it, or start this one with a different name: DEV_NAME=other bun run dev');
  process.exit(1);
}

// The game, on a free port. Only the front door talks to it.
const game = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  development: true,
  routes: {
    '/': index,
    '/report/:kind': {
      async POST(req) {
        const kind = req.params.kind === 'crash' ? 'crash' : 'problem';
        const name = `reports/${new Date().toISOString().replace(/[:.]/g, '-')}-${kind}.md`;
        await Bun.write(name, await req.text());
        console.error(`${kind === 'crash' ? '💥 The game crashed' : '🐞 Problem reported'}. Report saved to ${name}`);
        return new Response(name);
      },
    },
  },
});

const route: Route = { port: game.port!, pid: process.pid, dir: process.cwd() };
writeFileSync(routeFile, JSON.stringify(route));
const removeRoute = () => {
  if (readRoute(name)?.pid === process.pid) rmSync(routeFile, { force: true });
};
process.on('exit', removeRoute);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, () => process.exit(0));

// The front door. Forwards <name>.localhost to that copy, including the hot-reload websocket.
type Tunnel = { target: string; upstream?: WebSocket; queue: (string | Uint8Array<ArrayBuffer>)[] };

const routeFor = (req: Request) => {
  const host = (req.headers.get('host') ?? '').split(':')[0];
  return host.endsWith('.localhost') ? readRoute(host.slice(0, -'.localhost'.length)) : undefined;
};

function listPage(req: Request) {
  const host = (req.headers.get('host') ?? '').split(':')[0];
  const links = liveRoutes()
    .map(([n, r]) => `<li><a href="http://${n}.localhost:${FRONT_PORT}/">${n}.localhost:${FRONT_PORT}</a> — ${r.dir}</li>`)
    .join('');
  const found = host === 'localhost' || host === '127.0.0.1';
  return new Response(
    `<!doctype html><title>Hitoria dev</title><h1>${found ? 'Running copies' : `Nothing is running as ${host}`}</h1><ul>${links || '<li>None</li>'}</ul>`,
    { status: found ? 200 : 404, headers: { 'content-type': 'text/html' } },
  );
}

function startFrontDoor() {
  try {
    return Bun.serve<Tunnel>({
      port: FRONT_PORT,
      hostname: '::', // IPv4 and IPv6, since browsers may try either for *.localhost
      async fetch(req, server) {
        const target = routeFor(req);
        if (!target) return listPage(req);
        const url = new URL(req.url);
        const path = url.pathname + url.search;
        if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
          const ok = server.upgrade(req, { data: { target: `ws://127.0.0.1:${target.port}${path}`, queue: [] } });
          return ok ? undefined : new Response('Websocket upgrade failed', { status: 400 });
        }
        try {
          return await fetch(`http://127.0.0.1:${target.port}${path}`, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            redirect: 'manual',
            decompress: false,
          });
        } catch {
          return new Response('That copy of the game stopped responding.', { status: 502 });
        }
      },
      websocket: {
        open(ws: ServerWebSocket<Tunnel>) {
          const upstream = new WebSocket(ws.data.target);
          ws.data.upstream = upstream;
          upstream.binaryType = 'arraybuffer';
          upstream.onopen = () => ws.data.queue.splice(0).forEach((m) => upstream.send(m));
          upstream.onmessage = (e) => ws.send(e.data);
          upstream.onclose = () => ws.close();
          upstream.onerror = () => ws.close();
        },
        message(ws: ServerWebSocket<Tunnel>, message) {
          const data = typeof message === 'string' ? message : new Uint8Array(message);
          const upstream = ws.data.upstream!;
          if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
          else ws.data.queue.push(data);
        },
        close(ws: ServerWebSocket<Tunnel>) {
          ws.data.upstream?.close();
        },
      },
    });
  } catch {
    return undefined; // Another copy is the front door.
  }
}

let frontDoor = startFrontDoor();
setInterval(() => (frontDoor ??= startFrontDoor()), 2000);

console.log(`Hitoria is running at http://${name}.localhost:${FRONT_PORT}/`);
