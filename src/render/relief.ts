// The fine ground the terrain mesh draws: four points per tile side, with sharp alpine ridges,
// peaks and rock bands on the mountains. It also works out where rock, snow and deep water show.

export const FINE = 4;

// Crags start on the foothills and reach full size on the mountain proper.
const LO = 0.6;
const HI = 1.8;
const LIFT = 0.45; // how much taller mountains stand than the smooth map shape
const RIDGE = 0.55; // ridge height for each unit the ground stands above the foothills
const LEDGE = 1.0; // the height of one rock band
const FACE = 0.6; // how much of each band is gentle; the rest is the rock face
const SHEER = 3.5; // snow starts to slide off slopes steeper than this
// Mountains this close to home stay low, so they don't hide the HQ. They reach full height at FAR.
const NEAR = 8;
const FAR = 14;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// A random number from 0 to 1 for each lattice point.
function lattice(ix: number, iy: number, seed: number) {
  let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Smooth value noise with cells `cell` tiles wide.
function noise(x: number, y: number, cell: number, seed: number) {
  const fx = x / cell, fy = y / cell;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = smooth(fx - ix), ty = smooth(fy - iy);
  const a = lattice(ix, iy, seed), b = lattice(ix + 1, iy, seed);
  const c = lattice(ix, iy + 1, seed), d = lattice(ix + 1, iy + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

// Flat ledges joined by steep faces.
function terrace(v: number) {
  const t = v / LEDGE, f = t - Math.floor(t);
  return (Math.floor(t) + smooth(clamp01((f - FACE) / (1 - FACE)))) * LEDGE;
}

// The height crags add at a point, for smooth ground of height `base` there. With `tall` at 0
// the crags only carve gullies and add no height. At 1 they lift the mountain into tall peaks.
export function crag(x: number, y: number, base: number, tall = 1) {
  const w = smooth(clamp01((base - LO) / (HI - LO)));
  if (w === 0) return 0;
  const above = Math.min(1.5 + 3.5 * tall, base - LO);
  // Folded noise makes knife-edge crests with wide gullies between them. Each finer layer is
  // weaker, and only shows where the layer before it stands high, so crests stay sharp.
  let sum = 0, amp = 1, weight = 1, cell = 2.2;
  for (let seed = 1; seed <= 3; seed++) {
    let r = 1 - Math.abs(2 * noise(x, y, cell, seed) - 1);
    r *= r * weight;
    weight = clamp01(r * 1.6);
    sum += r * amp;
    amp *= 0.5;
    cell *= 0.45;
  }
  const ridges = (sum - 0.9 + 0.35 * tall) * RIDGE * above;
  const v = base + ridges;
  return w * (LIFT * above * tall + ridges + 0.4 * (terrace(v) - v));
}

export class Relief {
  readonly n: number; // points along one row
  readonly heights: Float32Array;
  readonly rock: Float32Array; // 0 to 1: how much of the rock colour each point shows
  readonly snow: Float32Array;
  readonly deep: Float32Array; // how far toward the sea floor colour
  private readonly w: number;
  private readonly h: number;
  private readonly top: number; // the highest point
  private readonly bottom: number; // the lowest point

  // `corners` holds the smooth height at each tile corner, (w + 1) by (h + 1).
  // Snow shows above `snowLine`, deep water below `sea`, and mountains near `home` stay low.
  constructor(corners: Float32Array, w: number, h: number, { snowLine = Infinity, sea = -Infinity, home }: Options = {}) {
    this.w = w;
    this.h = h;
    const n = (this.n = w * FINE + 1), m = h * FINE + 1;
    const H = (this.heights = new Float32Array(n * m));
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const x = i / FINE, y = j / FINE;
        const base = corner(corners, w, x, y);
        const tall = home ? smooth(clamp01((Math.hypot(x - home.x, y - home.y) - NEAR) / (FAR - NEAR))) : 1;
        H[j * n + i] = base + crag(x, y, base, tall);
      }
    this.top = H.reduce((a, b) => Math.max(a, b), -Infinity);
    this.bottom = H.reduce((a, b) => Math.min(a, b), Infinity);
    this.rock = new Float32Array(H.length);
    this.snow = new Float32Array(H.length);
    this.deep = new Float32Array(H.length);
    for (let k = 0; k < H.length; k++) {
      const h = H[k], right = k % n < n - 1 ? k + 1 : k - 1, down = k + n < H.length ? k + n : k - n;
      const slope = (Math.abs(H[right] - h) + Math.abs(H[down] - h)) * FINE;
      if (slope > 0.6 && h > 0.3) this.rock[k] = Math.min(0.9, (slope - 0.6) * 0.9);
      // Snow slides off the sheerest rock faces, so they stay dark above the snow line.
      if (h > snowLine) this.snow[k] = Math.min(1, (h - snowLine) * 1.2) * clamp01(1 - (slope - SHEER) / 2);
      if (h < sea) this.deep[k] = Math.min(0.85, -h * 0.5);
    }
  }

  // Height of the ground at a point in tile coordinates.
  at(x: number, y: number) {
    return bilinear(this.heights, this.n, this.w * FINE, this.h * FINE, x * FINE, y * FINE);
  }

  // Where a ray first meets the ground, in world space (x across, y up, z down the map).
  // It walks the ray in small steps, then narrows down the crossing. This is much cheaper than
  // testing every triangle of the mesh.
  hit(o: Vec, d: Vec): { x: number; z: number } | null {
    if (d.y >= 0) return null;
    const dt = 0.05 / Math.hypot(d.x, d.y, d.z); // each step moves 0.05 tiles along the ray
    const above = (t: number) => {
      const x = o.x + d.x * t, z = o.z + d.z * t;
      if (x < 0 || z < 0 || x > this.w || z > this.h) return true;
      return o.y + d.y * t > this.at(x, z);
    };
    // Walk only the part of the ray between the highest and the lowest ground.
    const end = (this.bottom - o.y) / d.y;
    for (let t = Math.max(0, (this.top - o.y) / d.y); t <= end + dt; t += dt) {
      if (above(t)) continue;
      let lo = Math.max(0, t - dt), hi = t;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (above(mid)) lo = mid;
        else hi = mid;
      }
      return { x: o.x + d.x * hi, z: o.z + d.z * hi };
    }
    return null;
  }
}

interface Options {
  snowLine?: number;
  sea?: number;
  home?: { x: number; y: number };
}

interface Vec {
  x: number;
  y: number;
  z: number;
}

// The smooth height at a point, blended from the four tile corners around it.
function corner(c: Float32Array, w: number, x: number, y: number) {
  return bilinear(c, w + 1, w, (c.length / (w + 1)) - 1, x, y);
}

function bilinear(g: Float32Array, n: number, maxX: number, maxY: number, x: number, y: number) {
  const cx = Math.max(0, Math.min(maxX, x)), cy = Math.max(0, Math.min(maxY, y));
  // A point on the far edge uses the last cell, so it never reads past the grid.
  const i = Math.min(maxX - 1, Math.floor(cx)), j = Math.min(maxY - 1, Math.floor(cy)), tx = cx - i, ty = cy - j;
  const k = j * n + i;
  const a = g[k], b = g[k + 1], c = g[k + n], d = g[k + n + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
