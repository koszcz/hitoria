// `window.playtest`: lets a play tester read the game as text and act like a player, without
// screenshots. Each action goes through the same code as a click, so the tester gets the same
// refusals and messages a player would. Type `playtest.help()` in the console to see the commands.
import { BDEFS, BUILDABLE, GOODS, priceOf, type BType, type Game } from '../game';
import { diag } from '../diag';
import { crashed } from '../report';
import type { UI } from '../ui';
import type { P } from '../path';
import { cardHtml } from '../buildmenu/card';
import { mapText, spots } from './map';

export interface PlaytestDeps {
  game: () => Game;
  ui: UI;
  click: (t: P, keep: boolean) => void; // what a left click on a tile does
}

const STEP = 1 / 30; // the same step the game loop uses
const text = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  return el ? readable(el.innerHTML) : '';
};

// The text of some HTML, with each good's picture written out as its name, as in "[plank] 2".
function readable(html: string) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-9999px;width:320px';
  el.innerHTML = html;
  for (const g of el.querySelectorAll<HTMLElement>('.good')) {
    const good = [...g.classList].find((c) => c !== 'good');
    if (good) g.textContent = `[${good}] `;
  }
  document.body.appendChild(el);
  const out = el.innerText.trim();
  el.remove();
  return out;
}

const HELP = `playtest commands (all return text or plain data):
  state()                 clock, goal, goods, settlers, every building and its status, new messages
  map(x?, y?, r?)         the land around a tile as characters; defaults to the HQ
  spots(type, n?, x?, y?) free places for a building, nearest first, with what lies around each
  menu()                  the build menu as a player sees it: name, cost, and whether you can pay
  card(type)              a building's card from the build menu: what it does and what it needs
  build(type, x, y)       pick the building and click the tile; returns the messages it caused
  remove(x, y)            use the remove tool on a tile
  open(id)                click a building; returns its panel and the buttons on it
  press(act, good?)       press a button on the open panel, such as press('upgrade')
  advance(seconds)        run the game forward this many game seconds, then return state()
  speed(v)                press a speed button: 'pause', 1, 2 or 4
  messages()              every message the player has seen so far
  snapshot()              the full F3 diagnostics: settlers, timeline, recent events
Building types: ${BUILDABLE.join(', ')}`;

export function installPlaytest(d: PlaytestDeps) {
  const seen: string[] = []; // every message shown to the player, with the game time
  let unread = 0;
  const toast = d.ui.toast.bind(d.ui);
  d.ui.toast = (msg: string) => {
    seen.push(`${d.game().time.toFixed(0)}s  ${msg}`);
    toast(msg);
  };
  // Messages since the tester last asked. The game queues some, which the UI shows on refresh.
  const news = () => {
    d.ui.refresh();
    const out = seen.slice(unread);
    unread = seen.length;
    return out;
  };

  const state = () => {
    const g = d.game();
    const lines = [
      `Game time ${g.time.toFixed(0)} s · ${text('#clock').replace(/\s*\n\s*/g, ' · ') || 'no clock'} · ${d.ui.paused ? 'paused' : `speed ${d.ui.speedNow}×`}${crashed() ? ' · CRASHED' : ''}`,
      `Goal panel: ${text('#goal').replace(/\s*\n\s*/g, ' · ')}`,
      `Stored: ${GOODS.filter((k) => g.stored[k]).map((k) => `${k} ${g.stored[k]}`).join(', ') || 'nothing'}`,
      `Settlers: population ${g.population}, idle ${g.idle}, out ${g.settlers.size}`,
      'Buildings:',
      ...[...g.buildings.values()].map((b) =>
        `  #${b.id} ${b.type} at ${b.x},${b.y} · ${b.built ? 'built' : `site ${Math.round(b.progress * 100)}%`} · ${b.status}` +
        (b.type !== 'hq' && !g.linked(b) ? ' · NOT LINKED' : '') + (b.hungry ? ' · hungry' : '')),
      `Looks stuck: ${[...diag.issues.values()].map((i) => i.text).join(' | ') || 'nothing'}`,
      `New messages: ${news().join(' | ') || 'none'}`,
    ];
    return lines.join('\n');
  };

  // Click a tile with a tool picked, as a player would. Returns what the player was told.
  const useTool = (tool: BType | 'remove', x: number, y: number) => {
    news();
    d.ui.setPlacing(tool);
    d.click({ x, y }, false);
    d.ui.setPlacing(null);
    const b = d.game().world.inside(x, y) ? d.game().world.at(x, y).b : 0;
    return { tile: b ? `building #${b}` : 'empty', messages: news() };
  };

  const playtest = {
    help: () => HELP,
    state,
    map: (x = d.game().hq.x, y = d.game().hq.y, r = 10) => mapText(d.game(), x, y, r),
    spots: (type: BType, n = 5, x?: number, y?: number) => spots(d.game(), type, n, x, y),
    menu: () => {
      d.ui.openBuild();
      const tiles = [...document.querySelectorAll<HTMLElement>('#buildmenu .tile')].map((t) => {
        const type = t.dataset.type as BType, cost = Object.entries(priceOf(d.game(), type)).map(([k, n]) => `${k} ${n}`).join(', ');
        return `${type} (${t.querySelector<HTMLElement>('.name')!.innerText}) · ${cost || 'free'}${t.classList.contains('short') ? ' · cannot pay yet' : ''}`;
      });
      document.querySelector<HTMLElement>('#buildmenu .close')?.click();
      return tiles.join('\n');
    },
    card: (type: BType) => {
      if (!BDEFS[type]) return `Unknown building "${type}"`;
      return readable(cardHtml(d.game(), type));
    },
    speed: (v: 'pause' | 1 | 2 | 4) => {
      document.querySelector<HTMLElement>(`#speed [data-speed="${v}"]`)?.click();
      return d.ui.paused ? 'paused' : `speed ${d.ui.speed}×`;
    },
    build: (type: BType, x: number, y: number) => {
      if (!BDEFS[type]) return { tile: 'empty', messages: [`Unknown building "${type}". Try: ${BUILDABLE.join(', ')}`] };
      return useTool(type, x, y);
    },
    remove: (x: number, y: number) => useTool('remove', x, y),
    open: (id: number) => {
      d.ui.select(id);
      const buttons = [...document.querySelectorAll<HTMLElement>('#info [data-act]')].map((b) =>
        `${b.dataset.act}${b.dataset.good ? ` ${b.dataset.good}` : ''}: "${b.innerText.trim()}"${(b as HTMLButtonElement).disabled ? ' (disabled)' : ''}`);
      return `${text('#info') || 'Nothing selected'}\nButtons: ${buttons.join(' | ') || 'none'}`;
    },
    press: (act: string, good?: string) => {
      news();
      const sel = `#info [data-act="${act}"]${good ? `[data-good="${good}"]` : ''}`;
      const btn = document.querySelector<HTMLElement>(sel);
      if (!btn) return { pressed: false, messages: [`No "${act}" button on the open panel`] };
      if ((btn as HTMLButtonElement).disabled) return { pressed: false, messages: [`The "${act}" button is greyed out`] };
      btn.click();
      return { pressed: true, messages: news() };
    },
    // Runs the rules directly, so it works while the browser pane is hidden and frames stop.
    advance: async (seconds: number) => {
      const g = d.game();
      const end = g.time + seconds;
      while (g.time < end && !crashed()) {
        for (let i = 0; i < 150 && g.time < end; i++) {
          g.update(STEP);
          diag.tick();
        }
        d.ui.refresh(); // shows the game's queued messages, so they get the right time
        await new Promise((r) => setTimeout(r, 0)); // let the page breathe between chunks
      }
      return state();
    },
    messages: () => seen.join('\n') || 'none',
    snapshot: () => diag.snapshot(),
  };
  Object.assign(window, { playtest });
}
