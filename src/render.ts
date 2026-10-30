import { Game, Building, Settler, Flag, BDEFS, BType, Good, Role } from './game';
import { W, H } from './world';
import { TW, TH, toIso, fromIso } from './iso';
import type { P } from './path';

const ROLE_COLOR: Record<Role, string> = {
  carrier: '#c9b27c', builder: '#e08a2c', woodcutter: '#3f7d3a', forester: '#8bc34a',
  stonecutter: '#8d8d8d', sawyer: '#8a5a2b', scout: '#4a7bd0',
};
const GOOD_COLOR: Record<Good, string> = { log: '#7a4a24', plank: '#d9b27a', stone: '#9c9c96' };

export interface View {
  hover: P | null;
  placing: BType | null;
  placeOk: boolean;
  tool: 'road' | 'remove' | null;
  roadFrom: number; // flag a road is being drawn from
  preview: P[] | null; // planned road under the cursor
  selected: number;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class Renderer {
  ctx: CanvasRenderingContext2D;
  cam = { x: 0, y: 0, zoom: 1.3 };
  w = 0;
  h = 0;
  private dpr = 1;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = devicePixelRatio || 1;
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
  }

  toWorld(px: number, py: number) {
    const { cam } = this;
    return fromIso((px - this.w / 2) / cam.zoom + cam.x, (py - this.h / 2) / cam.zoom + cam.y);
  }

  screenToTile(px: number, py: number): P {
    const p = this.toWorld(px, py);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
  }

  centerOn(x: number, y: number) {
    const p = toIso(x + 0.5, y + 0.5);
    this.cam.x = p.x;
    this.cam.y = p.y;
  }

  draw(game: Game, view: View, now: number) {
    const { ctx, cam, dpr } = this;
    const z = cam.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#21486a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.w / 2 - cam.x * z), dpr * (this.h / 2 - cam.y * z));

    const x0 = cam.x - this.w / 2 / z - TW, x1 = cam.x + this.w / 2 / z + TW;
    const y0 = cam.y - this.h / 2 / z - TH, y1 = cam.y + this.h / 2 / z + 90;
    const visible = (x: number, y: number) => {
      const c = toIso(x + 0.5, y + 0.5);
      return c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1;
    };

    const world = game.world;
    const terr = world.territory;
    const objects: { d: number; f: () => void }[] = [];

    // Ground.
    ctx.lineWidth = 0.8;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!visible(x, y)) continue;
        const tile = world.at(x, y);
        let col = tile.col;
        if (tile.t === 'water') {
          const l = 30 + tile.h * 38 + Math.sin(now * 1.4 + x * 0.7 + y * 0.45) * 2.5;
          col = `hsl(205, 52%, ${l}%)`;
        }
        this.diamond(x, y);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.fill();
        ctx.stroke();
        if (!terr[y * W + x] && tile.t !== 'water') {
          ctx.fillStyle = 'rgba(25, 20, 45, 0.28)';
          ctx.fill();
        }
        const cx = x + 0.5, cy = y + 0.5, d = cx + cy;
        if (tile.t === 'mountain') objects.push({ d, f: () => this.mountain(x, y, tile.h) });
        if (tile.tree > 0) objects.push({ d, f: () => this.tree(x, y, tile.tree, tile.conifer, now) });
        if (tile.rock > 0) objects.push({ d, f: () => this.rock(x, y, tile.rock) });
      }
    }

    // Border of your land.
    ctx.beginPath();
    const inT = (x: number, y: number) => world.inside(x, y) && terr[y * W + x] === 1;
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      const a = toIso(ax, ay), b = toIso(bx, by);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!inT(x, y) || !visible(x, y)) continue;
        if (!inT(x - 1, y)) seg(x, y, x, y + 1);
        if (!inT(x + 1, y)) seg(x + 1, y, x + 1, y + 1);
        if (!inT(x, y - 1)) seg(x, y, x + 1, y);
        if (!inT(x, y + 1)) seg(x, y + 1, x + 1, y + 1);
      }
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 236, 170, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.setLineDash([]);

    // Roads.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of game.roads.values()) {
      this.trace(r.path);
      ctx.strokeStyle = '#8c7350';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#cdb184';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    if (view.tool === 'road' && view.roadFrom) {
      const from = game.flags.get(view.roadFrom);
      if (from) this.ring(from.x, from.y, '#ffe27a');
      if (view.preview) {
        this.trace(view.preview);
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(255, 245, 200, 0.95)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Selection, hover, and placement ghost.
    const sel = game.buildings.get(view.selected);
    if (sel) {
      this.ring(sel.x, sel.y, '#ffe27a');
      if (BDEFS[sel.type].radius && sel.type !== 'hq') this.radius(sel.x, sel.y, BDEFS[sel.type].radius);
    }
    if (view.hover && world.inside(view.hover.x, view.hover.y)) {
      const { x, y } = view.hover;
      if (view.placing) {
        this.diamond(x, y);
        ctx.fillStyle = view.placeOk ? 'rgba(120, 255, 140, 0.35)' : 'rgba(255, 90, 80, 0.4)';
        ctx.fill();
        const r = BDEFS[view.placing].radius;
        if (r) this.radius(x, y, r);
        if (view.placeOk) {
          const ghost = view.placing;
          objects.push({ d: x + y + 1.01, f: () => {
            ctx.globalAlpha = 0.6;
            this.building({ type: ghost, x, y, built: true, busy: false, out: { log: 0, plank: 0, stone: 0 } } as Building, now);
            ctx.globalAlpha = 1;
          } });
          objects.push({ d: x + y + 2, f: () => {
            ctx.globalAlpha = 0.6;
            this.flag({ x, y: y + 1, items: [] } as unknown as Flag, now);
            ctx.globalAlpha = 1;
          } });
        }
      } else if (view.tool === 'remove') {
        this.ring(x, y, '#ff6a5a');
      } else {
        this.ring(x, y, 'rgba(255,255,255,0.6)');
      }
    }

    for (const b of game.buildings.values()) {
      if (visible(b.x, b.y)) objects.push({ d: b.x + b.y + 1, f: () => this.building(b, now) });
    }
    for (const f of game.flags.values()) {
      if (visible(f.x, f.y)) objects.push({ d: f.x + f.y + 1, f: () => this.flag(f, now) });
    }
    for (const s of game.settlers.values()) {
      if (s.inside || !visible(Math.round(s.x), Math.round(s.y))) continue;
      objects.push({ d: s.x + s.y + 1.02, f: () => this.settler(s, now) });
    }

    objects.sort((a, b) => a.d - b.d);
    for (const o of objects) o.f();
  }

  // --- primitives ----------------------------------------------------------

  private diamond(x: number, y: number) {
    const { ctx } = this;
    const t = toIso(x, y);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + TW / 2, t.y + TH / 2);
    ctx.lineTo(t.x, t.y + TH);
    ctx.lineTo(t.x - TW / 2, t.y + TH / 2);
    ctx.closePath();
  }

  private trace(path: P[]) {
    const { ctx } = this;
    ctx.beginPath();
    path.forEach((p, i) => {
      const c = toIso(p.x + 0.5, p.y + 0.5);
      if (i) ctx.lineTo(c.x, c.y);
      else ctx.moveTo(c.x, c.y);
    });
  }

  private ring(x: number, y: number, color: string) {
    this.diamond(x, y);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
  }

  private radius(x: number, y: number, r: number) {
    const { ctx } = this;
    const c = toIso(x + 0.5, y + 0.5);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * Math.SQRT2 * TW / 2, r * Math.SQRT2 * TH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private poly(pts: number[][], fill: string) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private shadow(cx: number, cy: number, rx: number, ry: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fill();
  }

  // Projects a point relative to a world centre, lifted by z screen pixels.
  private lift(X: number, Y: number) {
    return (dx: number, dy: number, z: number) => {
      const q = toIso(X + dx, Y + dy);
      return [q.x, q.y - z];
    };
  }

  private box(X: number, Y: number, f: number, h: number, wall: string, top: string | null) {
    const p = this.lift(X, Y);
    this.poly([p(-f, f, 0), p(f, f, 0), p(f, f, h), p(-f, f, h)], shade(wall, 0.92));
    this.poly([p(f, f, 0), p(f, -f, 0), p(f, -f, h), p(f, f, h)], shade(wall, 0.7));
    if (top) this.poly([p(-f, -f, h), p(f, -f, h), p(f, f, h), p(-f, f, h)], top);
  }

  private house(X: number, Y: number, f: number, h: number, rh: number, wall: string, roof: string) {
    const p = this.lift(X, Y);
    const e = 0.06;
    this.box(X, Y, f, h, wall, null);
    this.poly([p(-f - e, -f - e, h), p(f + e, -f - e, h), p(f + e, 0, h + rh), p(-f - e, 0, h + rh)], shade(roof, 1.2));
    this.poly([p(f, f, h), p(f, -f, h), p(f, 0, h + rh)], shade(wall, 0.7));
    this.poly([p(-f - e, f + e, h), p(f + e, f + e, h), p(f + e, 0, h + rh), p(-f - e, 0, h + rh)], roof);
    // Door and window.
    this.poly([p(-0.09, f, 0), p(0.09, f, 0), p(0.09, f, h * 0.6), p(-0.09, f, h * 0.6)], '#4a2f1b');
    this.poly([p(f, 0.12, h * 0.4), p(f, -0.12, h * 0.4), p(f, -0.12, h * 0.75), p(f, 0.12, h * 0.75)], '#f3d58a');
  }

  private pyramidRoof(X: number, Y: number, f: number, h: number, rh: number, roof: string) {
    const p = this.lift(X, Y);
    const top = p(0, 0, h + rh);
    this.poly([p(-f, -f, h), p(f, -f, h), top], shade(roof, 1.2));
    this.poly([p(-f, f, h), p(f, f, h), top], roof);
    this.poly([p(f, f, h), p(f, -f, h), top], shade(roof, 0.75));
  }

  // --- scenery -------------------------------------------------------------

  private mountain(x: number, y: number, h: number) {
    const r = hash(x, y);
    const ph = 16 + Math.min(1, (h - 0.7) * 5) * 26 + r * 8;
    const p = this.lift(x + 0.5, y + 0.5);
    const peak = [p(0, 0, ph)[0] + (r - 0.5) * 6, p(0, 0, ph)[1]];
    const l = p(-0.5, 0.5, 0), b = p(0.5, 0.5, 0), rt = p(0.5, -0.5, 0), t = p(-0.5, -0.5, 0);
    this.poly([t, l, peak], '#8e877c');
    this.poly([t, rt, peak], '#7c766c');
    this.poly([l, b, peak], '#9c9488');
    this.poly([b, rt, peak], '#6b655d');
    if (ph > 30) {
      const s = 0.3;
      const mix = (q: number[]) => [peak[0] + (q[0] - peak[0]) * s, peak[1] + (q[1] - peak[1]) * s];
      this.poly([peak, mix(l), mix(b)], '#f4f4f0');
      this.poly([peak, mix(b), mix(rt)], '#d6d8dc');
    }
  }

  private tree(x: number, y: number, g: number, conifer: boolean, now: number) {
    const { ctx } = this;
    const c = toIso(x + 0.5 + (hash(x, y) - 0.5) * 0.3, y + 0.5 + (hash(y, x) - 0.5) * 0.3);
    const s = 0.3 + 0.7 * g;
    const sway = Math.sin(now * 1.3 + x * 0.9 + y) * 0.8 * s;
    this.shadow(c.x + 3 * s, c.y + 1, 11 * s, 4.5 * s);
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(c.x - 1.5 * s, c.y - 10 * s, 3 * s, 10 * s);
    if (conifer) {
      const tiers = [['#2b5530', 0, 15], ['#336238', 8, 12], ['#3d7242', 15, 9]] as const;
      for (const [col, lift, wd] of tiers) {
        const by = c.y - (8 + lift) * s, ty = c.y - (8 + lift + 14) * s;
        this.poly([[c.x - wd * s, by], [c.x + wd * s, by], [c.x + sway, ty]], col);
      }
    } else {
      const blobs = [[-5, -14, 8, '#3b7330'], [5, -15, 8, '#376b2d'], [0, -21, 9, '#468a39'], [-2, -24, 5, '#5aa046']] as const;
      for (const [ox, oy, r, col] of blobs) {
        ctx.beginPath();
        ctx.arc(c.x + ox * s + sway, c.y + oy * s, r * s, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
    }
  }

  private rock(x: number, y: number, amount: number) {
    const { ctx } = this;
    const c = toIso(x + 0.5, y + 0.5);
    const n = Math.min(3, Math.ceil(amount / 2));
    for (let k = 0; k < n; k++) {
      const ox = (hash(x + k, y) - 0.5) * 22, oy = (hash(x, y + k) - 0.5) * 8;
      const r = 7 + hash(x * k, y) * 4 + amount * 0.6;
      this.shadow(c.x + ox + 2, c.y + oy + 1, r, r * 0.45);
      ctx.beginPath();
      ctx.ellipse(c.x + ox, c.y + oy - r * 0.35, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#7d7d77';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + ox - r * 0.2, c.y + oy - r * 0.55, r * 0.65, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#a9a9a2';
      ctx.fill();
    }
  }

  // --- buildings -----------------------------------------------------------

  private building(b: Building, now: number) {
    const { ctx } = this;
    const def = BDEFS[b.type];
    const X = b.x + 0.5, Y = b.y + 0.5;
    const p = this.lift(X, Y);
    const c = toIso(X, Y);
    this.shadow(c.x + 6, c.y + 2, 30, 12);

    if (!b.built) {
      this.poly([p(-0.44, -0.44, 0), p(0.44, -0.44, 0), p(0.44, 0.44, 0), p(-0.44, 0.44, 0)], '#a88d63');
      const h = 22 * b.progress;
      if (h > 0.5) this.box(X, Y, 0.34, h, '#c99c62', '#d8b07a');
      ctx.strokeStyle = '#6b4a28';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const [dx, dy] of [[-0.36, 0.36], [0.36, 0.36], [0.36, -0.36]]) {
        const [ax, ay] = p(dx, dy, 0), [bx, by] = p(dx, dy, 26);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      // Delivered materials.
      let k = 0;
      for (const g of ['plank', 'stone'] as Good[])
        for (let i = 0; i < b.stock[g]; i++, k++) {
          const [px, py] = p(-0.42 + (k % 3) * 0.12, 0.5, 2 + Math.floor(k / 3) * 3);
          ctx.fillStyle = GOOD_COLOR[g];
          ctx.fillRect(px - 4, py - 2, 8, 3);
        }
      const [bx, by] = p(0, 0, 38);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 16, by, 32, 4);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(bx - 16, by, 32 * b.progress, 4);
      return;
    }

    switch (b.type) {
      case 'hq': {
        this.box(X - 0.2, Y - 0.2, 0.2, 50, '#cdbb98', '#b7a684');
        const [fx, fy] = this.lift(X - 0.2, Y - 0.2)(0, 0, 50);
        ctx.strokeStyle = '#3b2b1a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx, fy - 18);
        ctx.stroke();
        const wave = Math.sin(now * 4) * 2;
        this.poly([[fx, fy - 18], [fx + 14, fy - 14 + wave], [fx, fy - 10]], '#d33f2f');
        this.house(X + 0.05, Y + 0.05, 0.4, 24, 16, def.wall, def.roof);
        break;
      }
      case 'lookout':
        this.box(X, Y, 0.22, 44, def.wall, null);
        this.pyramidRoof(X, Y, 0.3, 44, 16, def.roof);
        break;
      case 'sawmill':
        this.house(X, Y, 0.38, 20, 13, def.wall, def.roof);
        break;
      default:
        this.house(X, Y, 0.32, 17, 12, def.wall, def.roof);
    }

    if (b.busy) {
      for (let i = 0; i < 3; i++) {
        const t = (now * 0.6 + i / 3) % 1;
        const [sx, sy] = p(-0.1, -0.1, 34 + t * 24);
        ctx.beginPath();
        ctx.arc(sx + Math.sin(t * 6) * 3, sy, 3 + t * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,235,235,${0.5 * (1 - t)})`;
        ctx.fill();
      }
    }

    // Finished goods waiting outside.
    let k = 0;
    for (const g of ['log', 'plank', 'stone'] as Good[])
      for (let i = 0; i < b.out[g]; i++, k++) {
        const [px, py] = p(0.5, 0.15 - (k % 2) * 0.22, 2 + Math.floor(k / 2) * 3);
        ctx.fillStyle = GOOD_COLOR[g];
        ctx.fillRect(px - 4, py - 2, 8, 3);
      }

    if (b.type !== 'hq') {
      const [ix, iy] = p(0, 0, b.type === 'lookout' ? 72 : 44);
      const bob = Math.sin(now * 2 + b.id) * 1.5;
      ctx.beginPath();
      ctx.arc(ix, iy + bob, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 250, 235, 0.9)';
      ctx.fill();
      ctx.font = '11px system-ui, "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, ix, iy + bob + 1);
    }
  }

  private flag(f: Flag, now: number) {
    const { ctx } = this;
    const c = toIso(f.x + 0.5, f.y + 0.5);
    // Goods waiting here, in a ring around the pole.
    f.items.forEach((it, k) => {
      const a = (k / 8) * Math.PI * 2 + 0.4;
      const ox = Math.cos(a) * 10, oy = Math.sin(a) * 5;
      ctx.fillStyle = GOOD_COLOR[it.g];
      ctx.fillRect(c.x + ox - 3.5, c.y + oy - 3, 7, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x + ox - 3.5, c.y + oy - 3, 7, 4);
    });
    this.shadow(c.x + 2, c.y, 4, 1.8);
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x, c.y - 20);
    ctx.stroke();
    const wave = Math.sin(now * 5 + f.x) * 1.5;
    this.poly([[c.x, c.y - 20], [c.x + 10, c.y - 17 + wave], [c.x + 1, c.y - 13]], '#e9c440');
  }

  // --- settlers ------------------------------------------------------------

  private settler(s: Settler, now: number) {
    const { ctx } = this;
    const c = toIso(s.x + 0.5, s.y + 0.5);
    const ph = now * 11 + s.id;
    const bob = s.walking ? Math.abs(Math.sin(ph)) * 1.6 : 0;
    this.shadow(c.x, c.y, 5, 2.2);

    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const swing = s.walking ? Math.sin(ph) * 2.5 : 0;
    ctx.moveTo(c.x - 1.5, c.y - 5 - bob);
    ctx.lineTo(c.x - 1.5 + swing, c.y);
    ctx.moveTo(c.x + 1.5, c.y - 5 - bob);
    ctx.lineTo(c.x + 1.5 - swing, c.y);
    ctx.stroke();

    ctx.fillStyle = ROLE_COLOR[s.role];
    ctx.beginPath();
    ctx.roundRect(c.x - 3.5, c.y - 13 - bob, 7, 9, 2.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y - 16 - bob, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c9a0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y - 17 - bob, 3.4, Math.PI, 0);
    ctx.fillStyle = shade(ROLE_COLOR[s.role], 0.7);
    ctx.fill();

    if (s.carrying) {
      ctx.fillStyle = GOOD_COLOR[s.carrying];
      ctx.fillRect(c.x - 4, c.y - 24 - bob, 8, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x - 4, c.y - 24 - bob, 8, 4);
    }

    if (s.anim) {
      const a = s.anim === 'plant' ? Math.sin(now * 6) * 0.4 + 1.2 : Math.sin(now * 9) * 0.9;
      const dir = s.facing;
      const sx = c.x + 3 * dir, sy = c.y - 11;
      const ex = sx + Math.cos(a - 0.6) * 8 * dir, ey = sy + Math.sin(a - 0.6) * 8;
      ctx.strokeStyle = '#6b4a28';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = s.anim === 'plant' ? '#6abf4b' : '#c0c4c8';
      ctx.fillRect(ex - 2, ey - 2, 4, 4);
    }
  }
}
