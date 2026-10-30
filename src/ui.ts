import { Game, BDEFS, BUILDABLE, BType, GOODS, Good, Bag } from './game';

const GOOD_NAME: Record<Good, string> = { log: 'Logs', plank: 'Planks', stone: 'Stone' };
const $ = (id: string) => document.getElementById(id)!;

const costText = (cost: Partial<Bag>) =>
  GOODS.filter((g) => cost[g]).map((g) => `<span class="good ${g}"></span>${cost[g]}`).join(' ');

export class UI {
  placing: BType | null = null;
  selected = 0;
  speed = 1;
  paused = false;
  private buttons = new Map<BType, HTMLButtonElement>();

  constructor(private game: Game) {
    const bar = $('buildbar');
    BUILDABLE.forEach((type, i) => {
      const def = BDEFS[type];
      const btn = document.createElement('button');
      btn.className = 'build';
      btn.title = `${def.desc} (key ${i + 1})`;
      btn.innerHTML = `<span class="icon">${def.icon}</span><span class="name">${def.name}</span><span class="cost">${costText(def.cost)}</span>`;
      btn.onclick = () => this.setPlacing(this.placing === type ? null : type);
      bar.appendChild(btn);
      this.buttons.set(type, btn);
    });
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

  setPlacing(type: BType | null) {
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
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  refresh() {
    const g = this.game;
    while (g.toasts.length) this.toast(g.toasts.shift()!);

    const busy = g.settlers.size;
    $('res').innerHTML =
      GOODS.map((k) => `<div class="pill"><span class="good ${k}"></span><b>${g.hq.stock[k]}</b> ${GOOD_NAME[k]}</div>`).join('') +
      `<div class="pill">🧑‍🌾 <b>${g.pool}</b> idle / ${busy} busy</div>`;

    for (const [type, btn] of this.buttons) btn.classList.toggle('active', this.placing === type);
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
    } else if (b.type === 'hq') {
      rows.push(`<div>Land radius: ${def.radius} tiles</div>`);
    } else {
      for (const k of GOODS) {
        if (b.stock[k]) rows.push(`<div>In: <span class="good ${k}"></span>${b.stock[k]} ${GOOD_NAME[k]}</div>`);
        if (b.out[k]) rows.push(`<div>Ready: <span class="good ${k}"></span>${b.out[k]} ${GOOD_NAME[k]}</div>`);
      }
    }
    info.hidden = false;
    info.innerHTML = `<h3>${def.icon} ${def.name}</h3><p class="desc">${def.desc}</p>` +
      (b.type === 'hq' ? '' : `<p class="status">${b.status}</p>`) + rows.join('');
  }
}
