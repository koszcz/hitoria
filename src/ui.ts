import { Game, BDEFS, BType, GOODS, HOUSE_SIZE, HOUSE_GROW } from './game';
import { T, tr, goodName, buildingName, buildingDesc } from './i18n';
import { openBuildMenu } from './buildmenu/menu';
import { costText } from './buildmenu/card';
import type { Level } from './quality/levels';

const $ = (id: string) => document.getElementById(id)!;

export type Tool = BType | 'road' | 'remove';

const TOOLS: { tool: Tool; key: string; icon: string; name: () => string; desc: () => string }[] = [
  { tool: 'road', key: 'R', icon: '🛤️', name: () => T().road, desc: () => T().roadDesc },
  { tool: 'remove', key: 'X', icon: '✖️', name: () => T().remove, desc: () => T().removeDesc },
];

export class UI {
  placing: Tool | null = null;
  roadFrom = 0;
  selected = 0;
  speed = 1;
  paused = false;
  private buttons = new Map<Tool, HTMLButtonElement>();
  private buildBtn!: HTMLButtonElement;

  // The graphics setting, shown on its menu button. main.ts sets it.
  graphics: { choice: string; level: Level } = { choice: 'auto', level: 'high' };
  // Whether the sound is muted, shown on its menu button. main.ts sets it.
  muted = false;

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

  // The bar at the bottom: one button that opens the build menu, then the road and remove tools.
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
    const current = this.placing && this.placing !== 'road' && this.placing !== 'remove' ? this.placing : null;
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
    const type = p && p !== 'road' && p !== 'remove' ? p : null;
    const html = type
      ? `<span class="icon">${BDEFS[type].icon}</span><span class="name">${buildingName(type)}</span><span class="cost">${costText(BDEFS[type].cost)}</span>`
      : `<span class="icon">🔨</span><span class="name">${x.build}</span><span class="cost key">${x.key('B')}</span>`;
    if (this.buildBtn.innerHTML !== html) this.buildBtn.innerHTML = html;
    this.buildBtn.classList.toggle('active', !!type);
  }

  setPlacing(type: Tool | null) {
    this.placing = type;
    this.roadFrom = 0;
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
    const html = now
      ? `<div class="head">🏆 ${x.goal}</div><div class="text">${tr(now.text)}</div>` +
        `<div class="bar"><i style="width:${Math.round((now.have / now.need) * 100)}%"></i></div><div class="count">${now.have} / ${now.need}</div>`
      : `<div class="head">🏆 ${x.goalsDone}</div>`;
    const el = $('goal');
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  refresh() {
    const g = this.game;
    while (g.toasts.length) this.toast(g.toasts.shift()!);

    const x = T();
    const stored = g.stored;
    $('res').innerHTML =
      GOODS.map((k) => `<div class="pill"><span class="good ${k}"></span><b>${stored[k]}</b><span class="label">${goodName(k)}</span></div>`).join('') +
      `<div class="pill">🧑‍🌾 ${x.settlers(g.pool, g.settlers.size)}</div>`;

    this.drawGoal();

    for (const [type, btn] of this.buttons) btn.classList.toggle('active', this.placing === type);
    $('done').hidden = !this.placing;
    this.labelBuild();
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#speed button')) {
      const v = btn.dataset.speed;
      btn.classList.toggle('active', v === 'pause' ? this.paused : !this.paused && Number(v) === this.speed);
    }

    const info = $('info');
    const b = g.buildings.get(this.selected);
    if (!b) {
      info.hidden = true;
      return;
    }
    const def = BDEFS[b.type];
    const rows: string[] = [];
    if (!b.built) {
      rows.push(`<div class="bar"><i style="width:${Math.round(b.progress * 100)}%"></i></div>`);
      for (const k of GOODS)
        if (def.cost[k]) rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${b.stock[k]} / ${def.cost[k]}</div>`);
    } else if (g.isStore(b)) {
      if (b.type === 'hq') rows.push(`<div>${x.landRadius(def.radius)}</div>`);
      for (const k of GOODS) rows.push(`<div>${x.stored} <span class="good ${k}"></span>${b.stock[k]} ${goodName(k)}</div>`);
    } else {
      if (b.type === 'house') {
        rows.push(`<div>${x.born(b.born, HOUSE_SIZE)}</div>`);
        if (b.busy) rows.push(`<div class="bar"><i style="width:${Math.round((1 - b.grow / HOUSE_GROW) * 100)}%"></i></div>`);
      }
      for (const k of GOODS) {
        if (b.stock[k]) rows.push(`<div>${x.input} <span class="good ${k}"></span>${b.stock[k]} ${goodName(k)}</div>`);
        if (b.out[k]) rows.push(`<div>${x.ready} <span class="good ${k}"></span>${b.out[k]} ${goodName(k)}</div>`);
      }
    }
    info.hidden = false;
    const warn = b.type !== 'hq' && !g.linked(b) ? `<p class="warn">⚠ ${x.notLinked}</p>` : '';
    info.innerHTML = `<h3>${def.icon} ${buildingName(b.type)}</h3><p class="desc">${buildingDesc(b.type)}</p>${warn}` +
      (b.type === 'hq' ? '' : `<p class="status">${tr(b.status)}</p>`) + rows.join('');
  }
}
