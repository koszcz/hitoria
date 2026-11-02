import { Game, BDEFS, BType, GOODS, Good, HOUSE_GROW, houseSize } from './game';
import { T, tr, goodName, buildingName, buildingDesc } from './i18n';
import { openBuildMenu } from './buildmenu/menu';
import { costText } from './buildmenu/card';
import type { Level } from './quality/levels';
import { sailRows } from './sailinfo';
import { tradeOpen, tradeRows, type TradePick } from './tradeinfo';
import { drawClock } from './seasons/hud';
import { FastNights, nightSpeed } from './seasons/fastnight';
import { wishHtml, wishTitle } from './wishes/panel';
import { upgradeRows } from './upgradeinfo';
import { stopRows } from './stopinfo';
import { feastRows } from './feastinfo';

const $ = (id: string) => document.getElementById(id)!;

export type Tool = BType | 'remove';

const TOOLS: { tool: Tool; key: string; icon: string; name: () => string; desc: () => string }[] = [
  { tool: 'remove', key: 'X', icon: '✖️', name: () => T().remove, desc: () => T().removeDesc },
];

export class UI {
  placing: Tool | null = null;
  selected = 0;
  speed = 1;
  paused = false;
  // Whether nights run fast, and how fast the game runs right now. main.ts reads `speedNow`.
  fastNights = new FastNights();
  speedNow = 1;
  private buttons = new Map<Tool, HTMLButtonElement>();
  private buildBtn!: HTMLButtonElement;
  private infoHtml = ''; // what the building panel shows now
  private pick: TradePick = { give: null, get: null }; // the goods picked in the trade ship's panel

  // The graphics setting, shown on its menu button. main.ts sets it.
  graphics: { choice: string; level: Level } = { choice: 'auto', level: 'high' };
  // Whether the sound is muted, shown on its menu button. main.ts sets it.
  muted = false;
  // The music volume, 0..1, shown on its menu button. main.ts sets it.
  music = 0.5;

  constructor(public game: Game) {
    this.drawBar();
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#speed button')) {
      btn.onclick = () => {
        const v = btn.dataset.speed!;
        if (v === 'pause') this.paused = !this.paused;
        else {
          this.speed = Number(v);
          this.paused = false;
        }
        this.refresh();
      };
    }
    $('fastnight').onclick = () => {
      this.fastNights.toggle();
      this.refresh();
    };
    // The panel is drawn again as the game runs, so its buttons are handled here.
    $('info').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      const b = this.game.buildings.get(this.selected);
      if (!btn || !b) return;
      const act = btn.dataset.act, good = btn.dataset.good as Good;
      let why: string | null = null;
      if (act === 'sail') why = this.game.sail(b);
      else if (act === 'upgrade') why = this.game.upgrade(b);
      else if (act === 'feast') why = this.game.orderFeast(b);
      else if (act === 'stop') why = this.game.stopWork(b);
      else if (act === 'resume') why = this.game.resumeWork(b);
      else if (act === 'trade' && this.pick.give && this.pick.get) why = this.game.trade(b, this.pick.give, this.pick.get);
      else if (act === 'give' || act === 'get') this.pick[act] = this.pick[act] === good ? null : good;
      if (why) this.toast(why);
      this.refresh();
    });
  }

  // Put all text in the current language: the build bar and the fixed labels in the page.
  relabel() {
    this.drawBar();
    const x = T();
    const file: Record<string, [string, string]> = {
      save: [x.save, x.saveTitle], saves: [x.saves, x.savesTitle], new: [x.newGame, x.newTitle],
      report: [x.report, x.reportTitle], lang: [x.langButton, x.langTitle],
      graphics: [x.graphics(this.graphics.choice, x.levels[this.graphics.level]), x.graphicsTitle],
      sound: [x.sound(this.muted), x.soundTitle],
      music: [x.music(this.music), x.musicTitle],
    };
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#file button')) {
      const [label, title] = file[btn.dataset.file!] ?? [btn.textContent!, btn.title];
      btn.textContent = label;
      btn.title = title;
    }
    $('help').textContent = document.body.classList.contains('touch') ? x.helpTouch : x.help;
    $('menu').title = x.menu;
    $('done').textContent = x.done;
    document.querySelector<HTMLButtonElement>('#speed [data-speed=pause]')!.title = x.pause;
    this.refresh();
  }

  // How fast the game runs now: the chosen speed, or faster while everyone sleeps at night.
  runSpeed(allAsleep: boolean) {
    const v = nightSpeed(this.speed, this.fastNights.on, allAsleep);
    if (v !== this.speedNow) {
      this.speedNow = v;
      this.drawFastNight();
    }
    return v;
  }

  // The moon button: lit when fast nights are on, with the speed shown while a night runs fast.
  private drawFastNight() {
    const btn = $('fastnight');
    const on = this.fastNights.on, fast = on && this.speedNow > this.speed;
    btn.classList.toggle('active', on);
    btn.classList.toggle('fast', fast && !this.paused);
    btn.textContent = fast ? `🌙 ${this.speedNow}×` : '🌙';
    btn.title = T().fastNightTitle(on);
  }

  // The bar at the bottom: one button that opens the build menu, then the remove tool.
  private drawBar() {
    const bar = $('buildbar');
    bar.replaceChildren();
    this.buttons.clear();
    const x = T();
    this.buildBtn = document.createElement('button');
    this.buildBtn.className = 'build open';
    this.buildBtn.title = x.buildTitle;
    this.buildBtn.onclick = () => this.openBuild();
    bar.appendChild(this.buildBtn);
    for (const t of TOOLS) {
      const btn = document.createElement('button');
      btn.className = 'build tool';
      btn.title = `${t.desc()} (${x.key(t.key)})`;
      btn.innerHTML = `<span class="icon">${t.icon}</span><span class="name">${t.name()}</span><span class="cost key">${x.key(t.key)}</span>`;
      btn.onclick = () => this.setPlacing(this.placing === t.tool ? null : t.tool);
      bar.appendChild(btn);
      this.buttons.set(t.tool, btn);
    }
  }

  openBuild() {
    const current = this.placing && this.placing !== 'remove' ? this.placing : null;
    openBuildMenu({
      game: this.game,
      current,
      touch: document.body.classList.contains('touch'),
      pick: (type) => this.setPlacing(type),
    });
  }

  // The build button shows the building being placed, so you can see what a tap will put down.
  private labelBuild() {
    const x = T();
    const p = this.placing;
    const type = p && p !== 'remove' ? p : null;
    const html = type
      ? `<span class="icon">${BDEFS[type].icon}</span><span class="name">${buildingName(type)}</span><span class="cost">${costText(BDEFS[type].cost)}</span>`
      : `<span class="icon">🔨</span><span class="name">${x.build}</span><span class="cost key">${x.key('B')}</span>`;
    if (this.buildBtn.innerHTML !== html) this.buildBtn.innerHTML = html;
    this.buildBtn.classList.toggle('active', !!type);
  }

  setPlacing(type: Tool | null) {
    this.placing = type;
    if (type) this.selected = 0;
    this.refresh();
  }

  select(id: number) {
    this.selected = id;
    this.placing = null;
    this.refresh();
  }

  toast(msg: string) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = tr(msg);
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // The panel at the top left: the goal the player is on now, and how close they are.
  private drawGoal() {
    const x = T();
    const now = this.game.goalNow();
    const wish = now ? null : this.game.wishNow();
    const html = now
      ? `<div class="head">🏆 ${x.goal}</div><div class="text">${tr(now.text)}</div>` +
        `<div class="bar"><i style="width:${Math.round((now.have / now.need) * 100)}%"></i></div><div class="count">${now.note ? tr(now.note) : `${now.have} / ${now.need}`}</div>`
      : wish ? wishHtml(wish)
      : `<div class="head">🏆 ${x.goalsDone}</div>`;
    const el = $('goal');
    if (el.innerHTML !== html) el.innerHTML = html;
    const title = wish ? wishTitle() : '';
    if (el.title !== title) el.title = title;
  }

  // When the goods wrap onto more rows than the title's, the panels below the top bar move down by as much.
  private dropPanels() {
    const drop = Math.max(0, $('res').getBoundingClientRect().bottom - document.querySelector('.brand')!.getBoundingClientRect().bottom);
    const root = document.documentElement.style;
    if (root.getPropertyValue('--bar-drop') !== `${drop}px`) root.setProperty('--bar-drop', `${drop}px`);
    // The clock and the building panel sit below the whole bar, even when its buttons wrap.
    const bottom = `${Math.round($('topbar').getBoundingClientRect().bottom)}px`;
    if (root.getPropertyValue('--bar-bottom') !== bottom) root.setProperty('--bar-bottom', bottom);
  }

  refresh() {
    const g = this.game;
    while (g.toasts.length) this.toast(g.toasts.shift()!);

    const x = T();
    const stored = g.stored;
    $('res').innerHTML =
      GOODS.map((k) => `<div class="pill${stored[k] ? '' : ' none'}" title="${goodName(k)}"><span class="good ${k}"></span><b>${stored[k]}</b></div>`).join('') +
      `<div class="pill">🧑‍🌾 ${x.settlers(g.idle, g.settlers.size)}</div>`;

    this.drawGoal();
    drawClock($('clock'), g.time);
    this.dropPanels();

    for (const [type, btn] of this.buttons) btn.classList.toggle('active', this.placing === type);
    $('done').hidden = !this.placing;
    this.labelBuild();
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#speed button')) {
      const v = btn.dataset.speed;
      btn.classList.toggle('active', v === 'pause' ? this.paused : !this.paused && Number(v) === this.speed);
    }
    this.drawFastNight();

    const info = $('info');
    const b = g.buildings.get(this.selected);
    if (!b) {
      info.hidden = true;
      return;
    }
    const def = BDEFS[b.type];
    const rows: string[] = [];
    let side = ''; // the second column, shown only while the trade ship is tied up here
    if (!b.built) {
      rows.push(`<div class="bar"><i style="width:${Math.round(b.progress * 100)}%"></i></div>`);
      for (const k of GOODS)
        if (def.cost[k]) rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${b.stock[k]} / ${def.cost[k]}</div>`);
    } else if (g.isStore(b)) {
      if (b.type === 'hq') rows.push(`<div>${x.landRadius(def.radius)}</div>`);
      if (b.type === 'harbour') {
        rows.push(sailRows(g, b));
        if (tradeOpen(g, b)) side = tradeRows(g, b, this.pick);
        else rows.push(tradeRows(g, b, this.pick));
      }
      // Stored goods as picture and number, a few to a row. The name is in the tooltip.
      rows.push(`<div class="trade-label">${x.stored}</div><div class="stock">` +
        GOODS.map((k) => `<span class="${b.stock[k] ? '' : 'none'}" title="${goodName(k)}"><span class="good ${k}"></span>${b.stock[k]}</span>`).join('') + '</div>');
    } else {
      if (b.type === 'house') {
        rows.push(`<div>${x.born(b.born, houseSize(b))}</div>`);
        if (b.busy) rows.push(`<div class="bar"><i style="width:${Math.round((1 - b.grow / HOUSE_GROW) * 100)}%"></i></div>`);
      }
      if (g.richAt(b.type, b.x, b.y)) rows.push(`<div>${x.richSpot}</div>`);
      if (b.hungry && b.worker) rows.push(`<div class="hungry">${x.hungry}</div>`);
      if (b.type === 'square') rows.push(feastRows(g, b));
      else for (const k of GOODS) {
        if (b.stock[k]) rows.push(`<div>${x.input} <span class="good ${k}"></span>${b.stock[k]} ${goodName(k)}</div>`);
        if (b.out[k]) rows.push(`<div>${x.ready} <span class="good ${k}"></span>${b.out[k]} ${goodName(k)}</div>`);
      }
      rows.push(stopRows(b));
      rows.push(upgradeRows(g, b));
    }
    info.hidden = false;
    const warn = b.type !== 'hq' && !g.linked(b) ? `<p class="warn">⚠ ${x.notLinked}</p>` : '';
    const main = `<h3>${def.icon} ${buildingName(b.type)}</h3><p class="desc">${buildingDesc(b.type)}</p>${warn}` +
      (b.type === 'hq' ? '' : `<p class="status">${tr(b.status)}</p>`) + rows.join('');
    // With the trade ship in, the panel grows a second column, so it fits on the screen.
    info.classList.toggle('wide', !!side);
    const html = side ? `<div class="cols"><div>${main}</div><div>${side}</div></div>` : main;
    // Only when it changes, so a button is not swapped out between press and release.
    if (this.infoHtml !== html) info.innerHTML = this.infoHtml = html;
  }
}
