import { Game, BDEFS, BUILDABLE, BType, GOODS, Bag, HOUSE_SIZE, HOUSE_GROW } from './game';
import { GOOD_NAME, buildFacts, buildNow } from './buildinfo';

const $ = (id: string) => document.getElementById(id)!;

const costText = (cost: Partial<Bag>) =>
  GOODS.filter((g) => cost[g]).map((g) => `<span class="good ${g}"></span>${cost[g]}`).join(' ');

export type Tool = BType | 'road' | 'remove';

const TOOLS: { tool: Tool; key: string; icon: string; name: string; desc: string }[] = [
  { tool: 'road', key: 'R', icon: '🛤️', name: 'Road', desc: 'Click a flag or building, then where the road should go. Keeps going from the new end until you right-click.' },
  { tool: 'remove', key: 'X', icon: '✖️', name: 'Remove', desc: 'Remove a road or a lone flag.' },
];

export class UI {
  placing: Tool | null = null;
  roadFrom = 0;
  selected = 0;
  speed = 1;
  paused = false;
  private buttons = new Map<Tool, HTMLButtonElement>();
  private hover: BType | null = null;

  constructor(public game: Game) {
    const bar = $('buildbar');
    BUILDABLE.forEach((type, i) => {
      const def = BDEFS[type];
      const btn = document.createElement('button');
      btn.className = 'build';
      btn.dataset.key = i < 9 ? String(i + 1) : '';
      btn.innerHTML = `<span class="icon">${def.icon}</span><span class="name">${def.name}</span><span class="cost">${costText(def.cost)}</span>`;
      btn.onclick = () => this.setPlacing(this.placing === type ? null : type);
      btn.onmouseenter = btn.onfocus = () => this.showCard(type, btn);
      btn.onmouseleave = btn.onblur = () => this.showCard(null, btn);
      bar.appendChild(btn);
      this.buttons.set(type, btn);
    });
    for (const t of TOOLS) {
      const btn = document.createElement('button');
      btn.className = 'build tool';
      btn.title = `${t.desc} (key ${t.key})`;
      btn.innerHTML = `<span class="icon">${t.icon}</span><span class="name">${t.name}</span><span class="cost">key ${t.key}</span>`;
      btn.onclick = () => this.setPlacing(this.placing === t.tool ? null : t.tool);
      bar.appendChild(btn);
      this.buttons.set(t.tool, btn);
    }
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

  // A card above the build bar that explains what a building is worth.
  private showCard(type: BType | null, btn: HTMLButtonElement) {
    this.hover = type;
    const card = $('buildcard');
    if (!type) {
      card.hidden = true;
      return;
    }
    const def = BDEFS[type];
    const facts = buildFacts(type);
    const now = buildNow(this.game, type);
    const key = btn.dataset.key ? `<kbd>${btn.dataset.key}</kbd>` : '';
    const items = (xs: string[]) => xs.map((x) => `<li>${x}</li>`).join('');
    card.innerHTML =
      `<h3><span class="icon">${def.icon}</span>${def.name}${key}</h3>` +
      `<p class="makes">${facts.makes}</p>` +
      (facts.worth.length ? `<h4>Why build it</h4><ul>${items(facts.worth)}</ul>` : '') +
      `<h4>What it needs</h4><ul>${items(facts.needs)}</ul>` +
      `<p class="costline">Costs ${costText(def.cost)}</p>` +
      `<p class="have">${now.have}</p>` +
      now.warn.map((w) => `<p class="warn">⚠ ${w}</p>`).join('');
    card.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = card.offsetWidth;
    card.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    card.style.bottom = `${innerHeight - r.top + 8}px`;
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
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  refresh() {
    const g = this.game;
    while (g.toasts.length) this.toast(g.toasts.shift()!);

    const busy = g.settlers.size;
    const stored = g.stored;
    $('res').innerHTML =
      GOODS.map((k) => `<div class="pill"><span class="good ${k}"></span><b>${stored[k]}</b> ${GOOD_NAME[k]}</div>`).join('') +
      `<div class="pill">🧑‍🌾 <b>${g.pool}</b> idle / ${busy} busy</div>`;

    for (const [type, btn] of this.buttons) btn.classList.toggle('active', this.placing === type);
    if (this.hover) this.showCard(this.hover, this.buttons.get(this.hover)!);
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
        if (def.cost[k]) rows.push(`<div><span class="good ${k}"></span>${GOOD_NAME[k]}: ${b.stock[k]} / ${def.cost[k]}</div>`);
    } else if (g.isStore(b)) {
      if (b.type === 'hq') rows.push(`<div>Land radius: ${def.radius} tiles</div>`);
      for (const k of GOODS) rows.push(`<div>Stored: <span class="good ${k}"></span>${b.stock[k]} ${GOOD_NAME[k]}</div>`);
    } else {
      if (b.type === 'house') {
        rows.push(`<div>Settlers born here: ${b.born} / ${HOUSE_SIZE}</div>`);
        if (b.busy) rows.push(`<div class="bar"><i style="width:${Math.round((1 - b.grow / HOUSE_GROW) * 100)}%"></i></div>`);
      }
      for (const k of GOODS) {
        if (b.stock[k]) rows.push(`<div>In: <span class="good ${k}"></span>${b.stock[k]} ${GOOD_NAME[k]}</div>`);
        if (b.out[k]) rows.push(`<div>Ready: <span class="good ${k}"></span>${b.out[k]} ${GOOD_NAME[k]}</div>`);
      }
    }
    info.hidden = false;
    const warn = b.type !== 'hq' && !g.linked(b) ? '<p class="warn">⚠ Not connected to your HQ by road</p>' : '';
    info.innerHTML = `<h3>${def.icon} ${def.name}</h3><p class="desc">${def.desc}</p>${warn}` +
      (b.type === 'hq' ? '' : `<p class="status">${b.status}</p>`) + rows.join('');
  }
}
