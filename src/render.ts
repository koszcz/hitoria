import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Game, Building, Settler, BDEFS, BType, Good, Role } from './game';
import { World, Tile, W, H } from './world';
import { TW, toIso, fromIso } from './iso';
import type { P } from './path';

// World tile (x, y) maps to the 3D ground at (X = x, Z = y); Y is up. One tile is one unit.
// The camera keeps the old 2:1 isometric angle (45° around, 30° down), so `cam` still pans in
// the same screen-pixel space as the 2D renderer did.

const ROLE_COLOR: Record<Role, string> = {
  carrier: '#c9b27c', builder: '#e08a2c', woodcutter: '#3f7d3a', forester: '#8bc34a',
  stonecutter: '#8d8d8d', sawyer: '#8a5a2b', scout: '#4a7bd0',
};
const GOOD_COLOR: Record<Good, string> = { log: '#7a4a24', plank: '#d9b27a', stone: '#9c9c96' };
const GOOD_LIST: Good[] = ['log', 'plank', 'stone'];

export interface View {
  hover: P | null;
  placing: BType | null;
  placeOk: boolean;
  tool: 'road' | 'remove' | null;
  roadFrom: number; // flag a road is being drawn from
  preview: P[] | null; // planned road under the cursor
  selected: number;
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const PX = TW / Math.SQRT2; // screen pixels per world unit at zoom 1
const ELEV = Math.PI / 6;
const VIEW_DIR = new THREE.Vector3(Math.cos(ELEV) / Math.SQRT2, Math.sin(ELEV), Math.cos(ELEV) / Math.SQRT2);
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SEA = -0.04;

// Ground height of one tile, before corners are averaged.
function elev(t: Tile, x: number, y: number) {
  if (t.h < 0.3) return (t.h - 0.3) * 5;
  let e = (t.h - 0.3) * 1.1;
  if (t.t === 'mountain') e += 0.4 + (t.h - 0.7) * 16 + hash(x, y) * 0.7;
  return e;
}

// Tileable value noise, used for the ground grain and the water ripples.
function noiseField(size: number, seed: number) {
  const out = new Float32Array(size * size);
  for (const [cells, amp] of [[8, 0.55], [32, 0.3], [128, 0.15]] as const) {
    const g = Array.from({ length: cells * cells }, (_, i) => hash(i * 1.7 + seed, seed * 3.1));
    const at = (i: number, j: number) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const s = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells, fy = (y / size) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
  }
  return out;
}

function grainTexture() {
  const n = 256, f = noiseField(n, 7);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = 175 + f[i] * 70 + (Math.random() - 0.5) * 28;
    img.data.set([v, v, v, 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rippleNormals() {
  const n = 256, f = noiseField(n, 21);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  const at = (x: number, y: number) => f[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 6, dy = (at(x, y + 1) - at(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      img.data.set([(-dx / l) * 127 + 128, (-dy / l) * 127 + 128, (1 / l) * 127 + 128, 255], (y * n + x) * 4);
    }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softDot() {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const cx = cv.getContext('2d')!;
  const g = cx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

function iconTexture(icon: string) {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const cx = cv.getContext('2d')!;
  cx.beginPath();
  cx.arc(32, 32, 29, 0, Math.PI * 2);
  cx.fillStyle = 'rgba(255, 250, 235, 0.92)';
  cx.fill();
  cx.font = '34px system-ui, "Apple Color Emoji", sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(icon, 32, 35);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Paints a whole geometry one colour (as a vertex colour) so pieces can be merged into one mesh.
function paint(g: THREE.BufferGeometry, color: string, jitter = 0) {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    if (jitter) pos.setXYZ(i, pos.getX(i) * (1 + (Math.random() - 0.5) * jitter), pos.getY(i) * (1 + (Math.random() - 0.5) * jitter), pos.getZ(i) * (1 + (Math.random() - 0.5) * jitter));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

function piece(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, jitter = 0) {
  g.translate(x, y, z);
  return paint(g, color, jitter);
}

// Keeps a model's vertices identical from load to load: the jitter above uses Math.random.
function seeded<T>(seed: number, f: () => T): T {
  const r = Math.random;
  let s = seed;
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  try {
    return f();
  } finally {
    Math.random = r;
  }
}

const conifer = () => seeded(11, () => mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.055, 0.3, 6), '#4f3219', 0, 0.15, 0),
  piece(new THREE.ConeGeometry(0.3, 0.5, 8), '#24492a', 0, 0.42, 0, 0.12),
  piece(new THREE.ConeGeometry(0.23, 0.42, 8), '#2c5832', 0, 0.66, 0, 0.12),
  piece(new THREE.ConeGeometry(0.15, 0.34, 7), '#356a3a', 0, 0.88, 0, 0.12),
]));

const broadleaf = () => seeded(23, () => mergeGeometries([
  piece(new THREE.CylinderGeometry(0.035, 0.06, 0.42, 6), '#56381c', 0, 0.21, 0),
  piece(new THREE.IcosahedronGeometry(0.27, 1), '#33662a', 0, 0.56, 0, 0.25),
  piece(new THREE.IcosahedronGeometry(0.2, 1), '#3f7a32', 0.13, 0.7, 0.06, 0.25),
  piece(new THREE.IcosahedronGeometry(0.19, 1), '#3a7230', -0.12, 0.66, -0.08, 0.25),
  piece(new THREE.IcosahedronGeometry(0.15, 1), '#4f8f3e', 0.02, 0.82, -0.02, 0.25),
]));

const boulder = () => seeded(5, () => paint(new THREE.DodecahedronGeometry(0.16, 1), '#ffffff', 0.35));

interface Model {
  g: THREE.Group;
  key: string;
  rise?: THREE.Object3D;
  bar?: THREE.Sprite;
  icon?: THREE.Sprite;
  smoke?: THREE.Sprite[];
  cloth?: THREE.Object3D;
}

interface Person {
  g: THREE.Group;
  legs: THREE.Object3D[];
  tool: THREE.Object3D;
  body: THREE.Group;
  px: number;
  py: number;
  heading: number;
}

export class Renderer {
  cam = { x: 0, y: 0, zoom: 1.3 };
  w = 0;
  h = 0;

  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  private sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  private ray = new THREE.Raycaster();
  private mats = new Map<string, THREE.Material>();
  private grain = grainTexture();
  private dot = softDot();
  private icons = new Map<BType, THREE.Texture>();

  private world: World | null = null;
  private corners = new Float32Array((W + 1) * (H + 1));
  private terrain!: THREE.Mesh;
  private water!: THREE.Mesh;
  private terrKey = -1;
  private border = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#ffeaa0', dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 }));

  private trees: THREE.InstancedMesh[];
  private rocks: THREE.InstancedMesh;
  private goods: Record<Good, THREE.InstancedMesh>;
  private goodN: Record<Good, number> = { log: 0, plank: 0, stone: 0 };

  private roads = new THREE.Group();
  private roadNet = -1;
  private models = new Map<number, Model>();
  private flags = new Map<number, Model>();
  private people = new Map<number, Person>();
  private ghosts = new Map<BType, THREE.Group>();
  private ghostFlag: THREE.Group;

  private hoverFill: THREE.Mesh;
  private hoverRing: THREE.LineLoop;
  private selRing: THREE.LineLoop;
  private fromRing: THREE.LineLoop;
  private selRadius: THREE.LineLoop;
  private placeRadius: THREE.LineLoop;
  private preview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#fff5c8', dashSize: 0.2, gapSize: 0.14 }));
  private previewOf: P[] | null = null;

  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(public canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.resize();
    addEventListener('resize', () => this.resize());

    const { scene, sun } = this;
    scene.background = new THREE.Color('#2a5f86');
    scene.add(new THREE.HemisphereLight('#cfe6ff', '#5b5236', 1.1));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);

    const tree = (geo: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), W * H);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.trees = [tree(broadleaf()), tree(conifer())];
    this.rocks = new THREE.InstancedMesh(boulder(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), W * H * 3);
    this.rocks.castShadow = this.rocks.receiveShadow = true;
    this.rocks.frustumCulled = false;
    scene.add(this.rocks);

    const goodGeo: Record<Good, THREE.BufferGeometry> = {
      log: new THREE.CylinderGeometry(0.035, 0.035, 0.2, 7).rotateZ(Math.PI / 2),
      plank: new THREE.BoxGeometry(0.2, 0.03, 0.08),
      stone: new THREE.DodecahedronGeometry(0.055, 0),
    };
    this.goods = {} as Record<Good, THREE.InstancedMesh>;
    for (const g of GOOD_LIST) {
      const m = new THREE.InstancedMesh(goodGeo[g], this.mat(GOOD_COLOR[g]), 4000);
      m.castShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      this.goods[g] = m;
    }

    scene.add(this.roads, this.border, this.preview);
    this.border.renderOrder = 2;

    const tileGeo = new THREE.BufferGeometry();
    tileGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    tileGeo.setIndex([0, 2, 1, 0, 3, 2]);
    this.hoverFill = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const loop = (color: string, n: number) => {
      const l = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      l.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    };
    this.hoverRing = loop('#ffffff', 4);
    this.selRing = loop('#ffe27a', 4);
    this.fromRing = loop('#ffe27a', 4);
    this.selRadius = loop('#ffffff', 96);
    this.placeRadius = loop('#ffffff', 96);
    this.hoverFill.frustumCulled = false;
    scene.add(this.hoverFill);

    this.ghostFlag = this.makeFlag().g;
    this.ghostify(this.ghostFlag);
    scene.add(this.ghostFlag);
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.gl.setPixelRatio(devicePixelRatio || 1);
    this.gl.setSize(this.w, this.h, false);
  }

  // Ground point under a screen pixel, in tile coordinates.
  toWorld(px: number, py: number) {
    this.ray.setFromCamera(new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1), this.camera);
    const hit = this.terrain && this.ray.intersectObject(this.terrain, false)[0];
    if (hit) return { x: hit.point.x, y: hit.point.z };
    const p = new THREE.Vector3();
    this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    return { x: p.x, y: p.z };
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

  // Height of the ground at a point in tile coordinates.
  heightAt(x: number, y: number) {
    const cx = Math.max(0, Math.min(W - 0.001, x)), cy = Math.max(0, Math.min(H - 0.001, y));
    const i = Math.floor(cx), j = Math.floor(cy), tx = cx - i, ty = cy - j;
    const C = this.corners, k = j * (W + 1) + i;
    const a = C[k], b = C[k + 1], c = C[k + W + 1], d = C[k + W + 2];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  draw(game: Game, view: View, now: number) {
    if (game.world !== this.world) this.setWorld(game.world);
    this.placeCamera();

    let tk = 0;
    const terr = game.world.territory;
    for (let i = 0; i < terr.length; i++) if (terr[i]) tk += i;
    if (tk !== this.terrKey) {
      this.terrKey = tk;
      this.paintGround();
      this.drawBorder();
    }
    if (game.net !== this.roadNet) {
      this.roadNet = game.net;
      this.drawRoads(game);
    }

    this.goodN = { log: 0, plank: 0, stone: 0 };
    this.scenery(now);
    this.buildings(game, now);
    this.flagsAndGoods(game, now);
    this.settlers(game, now);
    this.overlays(game, view);
    for (const g of GOOD_LIST) {
      this.goods[g].count = this.goodN[g];
      this.goods[g].instanceMatrix.needsUpdate = true;
    }

    const water = this.water.material as THREE.MeshStandardMaterial;
    water.normalMap!.offset.set(now * 0.012, now * 0.007);
    this.gl.render(this.scene, this.camera);
  }

  // --- camera --------------------------------------------------------------

  private placeCamera() {
    const { camera, cam, sun } = this;
    const s = PX * cam.zoom;
    const hw = this.w / 2 / s, hh = this.h / 2 / s;
    Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    camera.updateProjectionMatrix();
    const t = fromIso(cam.x, cam.y);
    const target = new THREE.Vector3(t.x, 0, t.y);
    camera.position.copy(target).addScaledVector(VIEW_DIR, 150);
    camera.lookAt(target);

    // Sun from the upper left of the screen, so shadows fall to the right as before.
    const reach = Math.min(42, Math.max(hw, hh * 2) + 3);
    sun.position.copy(target).add(new THREE.Vector3(-reach * 0.9, reach * 1.3, reach * 0.35));
    sun.target.position.copy(target);
    const sc = sun.shadow.camera;
    Object.assign(sc, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 4 });
    sc.updateProjectionMatrix();
  }

  // --- terrain -------------------------------------------------------------

  private setWorld(world: World) {
    this.world = world;
    this.terrKey = -1;
    this.roadNet = -1;
    for (const m of [...this.models.values(), ...this.flags.values()]) this.scene.remove(m.g);
    for (const p of this.people.values()) this.scene.remove(p.g);
    this.models.clear();
    this.flags.clear();
    this.people.clear();

    const C = this.corners;
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        let sum = 0, n = 0;
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]])
          if (world.inside(x, y)) {
            sum += elev(world.at(x, y), x, y);
            n++;
          }
        C[j * (W + 1) + i] = n ? sum / n : -1;
      }

    if (this.terrain) {
      this.scene.remove(this.terrain, this.water);
      this.terrain.geometry.dispose();
    }
    const pos = new Float32Array((W + 1) * (H + 1) * 3), uv = new Float32Array((W + 1) * (H + 1) * 2);
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        const k = j * (W + 1) + i;
        pos.set([i, C[k], j], k * 3);
        uv.set([i / 5, j / 5], k * 2);
      }
    const idx: number[] = [];
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: this.grain, roughness: 0.95 }));
    this.terrain.receiveShadow = true;

    const ripples = rippleNormals();
    ripples.repeat.set(40, 40);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 8, H * 8).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#2b6f9c', roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.86, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35) }),
    );
    this.water.position.set(W / 2, SEA, H / 2);
    this.water.receiveShadow = true;
    this.scene.add(this.terrain, this.water);
  }

  // Corner colours blend the four tiles around them; slope and height add rock and snow.
  private paintGround() {
    const world = this.world!, C = this.corners;
    const col = this.terrain.geometry.attributes.color as THREE.BufferAttribute;
    const base = new Map<number, THREE.Color>();
    const tileCol = (x: number, y: number) => {
      const key = y * W + x;
      let c = base.get(key);
      if (c) return c;
      const t = world.at(x, y);
      c = t.t === 'water' ? new THREE.Color('#b9a77a')
        : t.t === 'mountain' ? new THREE.Color().setHSL(0.08, 0.08, 0.36 + hash(x, y) * 0.08)
        : new THREE.Color(t.col).offsetHSL(0, t.t === 'grass' ? -0.14 : -0.05, -0.03);
      if (!world.territory[key] && t.t !== 'water') c.offsetHSL(0, -0.15, 0).multiplyScalar(0.5).lerp(new THREE.Color('#2a2440'), 0.15);
      base.set(key, c);
      return c;
    };
    const rock = new THREE.Color('#6f675c'), snow = new THREE.Color('#f2f4f6');
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        const k = j * (W + 1) + i;
        const c = this.c.setRGB(0, 0, 0);
        let n = 0;
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]])
          if (world.inside(x, y)) {
            c.add(tileCol(x, y));
            n++;
          }
        c.multiplyScalar(1 / Math.max(1, n));
        const h = C[k];
        const slope = Math.abs(C[Math.min(k + 1, C.length - 1)] - h) + Math.abs(C[Math.min(k + W + 1, C.length - 1)] - h);
        if (slope > 0.35 && h > 0.3) c.lerp(rock, Math.min(0.8, (slope - 0.35) * 1.5));
        if (h > 2.4) c.lerp(snow, Math.min(1, (h - 2.4) * 1.2));
        if (h < SEA) c.multiplyScalar(Math.max(0.35, 1 + h * 0.4));
        col.setXYZ(k, c.r, c.g, c.b);
      }
    col.needsUpdate = true;
  }

  private drawBorder() {
    const world = this.world!;
    const inT = (x: number, y: number) => world.inside(x, y) && world.territory[y * W + x] === 1;
    const pts: number[] = [];
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      for (let s = 0; s < 4; s++) {
        const t0 = s / 4, t1 = (s + 1) / 4;
        const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;
        pts.push(x0, this.heightAt(x0, y0) + 0.04, y0, x1, this.heightAt(x1, y1) + 0.04, y1);
      }
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!inT(x, y)) continue;
        if (!inT(x - 1, y)) seg(x, y, x, y + 1);
        if (!inT(x + 1, y)) seg(x + 1, y, x + 1, y + 1);
        if (!inT(x, y - 1)) seg(x, y, x + 1, y);
        if (!inT(x, y + 1)) seg(x, y + 1, x + 1, y + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.border.geometry.dispose();
    this.border.geometry = g;
    this.border.computeLineDistances();
  }

  // Draped ribbons along each road: a dark verge under a lighter packed-earth track.
  private drawRoads(game: Game) {
    for (const c of this.roads.children) (c as THREE.Mesh).geometry.dispose();
    this.roads.clear();
    for (const [width, color, lift, off] of [[0.36, '#6f5a3c', 0.02, -1], [0.24, '#b49a6c', 0.03, -2]] as const) {
      const pos: number[] = [], idx: number[] = [];
      for (const r of game.roads.values()) {
        const pts: THREE.Vector2[] = [];
        r.path.forEach((p, i) => {
          if (i) {
            const a = r.path[i - 1];
            for (let s = 1; s < 4; s++) pts.push(new THREE.Vector2(a.x + 0.5 + ((p.x - a.x) * s) / 4, a.y + 0.5 + ((p.y - a.y) * s) / 4));
          }
          pts.push(new THREE.Vector2(p.x + 0.5, p.y + 0.5));
        });
        const base = pos.length / 3;
        pts.forEach((p, i) => {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          const d = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
          const nx = -d.y * width / 2, ny = d.x * width / 2;
          pos.push(p.x + nx, this.heightAt(p.x + nx, p.y + ny) + lift, p.y + ny);
          pos.push(p.x - nx, this.heightAt(p.x - nx, p.y - ny) + lift, p.y - ny);
          if (i) {
            const k = base + i * 2;
            idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
          }
        });
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 1 ? [] : [pos[i] * 1.5])), 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, map: this.grain, roughness: 1, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }));
      m.receiveShadow = true;
      this.roads.add(m);
    }
  }

  // --- scenery -------------------------------------------------------------

  private scenery(now: number) {
    const world = this.world!;
    const [leafy, pine] = this.trees;
    let nl = 0, np = 0, nr = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = world.at(x, y);
        if (t.tree > 0) {
          const px = x + 0.5 + (hash(x, y) - 0.5) * 0.3, pz = y + 0.5 + (hash(y, x) - 0.5) * 0.3;
          const s = (0.3 + 0.7 * t.tree) * (0.85 + hash(x * 3, y) * 0.35);
          const sway = Math.sin(now * 1.3 + x * 0.9 + y) * 0.03;
          this.e.set(sway, hash(x, y * 7) * Math.PI * 2, sway * 0.6);
          this.m4.compose(this.v.set(px, this.heightAt(px, pz) - 0.02, pz), this.q.setFromEuler(this.e), this.s.setScalar(s));
          const mesh = t.conifer ? pine : leafy;
          const n = t.conifer ? np++ : nl++;
          mesh.setMatrixAt(n, this.m4);
          mesh.setColorAt(n, this.c.setHSL(0.25 + (hash(y, x * 5) - 0.5) * 0.08, 0.35, 0.75 + hash(x, y * 3) * 0.3));
        }
        if (t.rock > 0) {
          const k = Math.min(3, Math.ceil(t.rock / 2));
          for (let i = 0; i < k; i++) {
            const px = x + 0.5 + (hash(x + i, y) - 0.5) * 0.55, pz = y + 0.5 + (hash(x, y + i) - 0.5) * 0.55;
            const s = 0.9 + hash(x * (i + 1), y) * 0.6 + t.rock * 0.08;
            this.e.set(hash(i, x) * 3, hash(y, i) * 6, 0);
            this.m4.compose(this.v.set(px, this.heightAt(px, pz) + 0.02, pz), this.q.setFromEuler(this.e), this.s.set(s, s * 0.7, s));
            this.rocks.setMatrixAt(nr, this.m4);
            this.rocks.setColorAt(nr++, this.c.setHSL(0.09, 0.05, 0.24 + hash(x + i, y * 2) * 0.1));
          }
        }
      }
    for (const [m, n] of [[leafy, nl], [pine, np], [this.rocks, nr]] as const) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // --- buildings -----------------------------------------------------------

  private mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
    const key = color + JSON.stringify(extra);
    let m = this.mats.get(key);
    if (!m) this.mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })));
    return m;
  }

  private add(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, extra?: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.Mesh(geo, this.mat(color, extra));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // A timber-framed house on a stone footing, gable roof ridge along X, door facing +Z.
  private house(g: THREE.Group, f: number, h: number, rh: number, wall: string, roof: string, ox = 0, oz = 0) {
    const e = 0.07, beam = '#4a3220';
    const at = new THREE.Group();
    at.position.set(ox, 0, oz);
    g.add(at);
    this.add(at, new THREE.BoxGeometry(2 * f + 0.08, 0.3, 2 * f + 0.08), '#8a8378', 0, -0.1, 0);
    this.add(at, new THREE.BoxGeometry(2 * f, h, 2 * f), wall, 0, h / 2 + 0.05, 0);
    for (const [x, z] of [[-f, -f], [f, -f], [-f, f], [f, f]]) this.add(at, new THREE.BoxGeometry(0.04, h, 0.04), beam, x, h / 2 + 0.05, z);
    this.add(at, new THREE.BoxGeometry(2 * f + 0.02, 0.035, 2 * f + 0.02), beam, 0, h + 0.03, 0);
    this.add(at, new THREE.BoxGeometry(2 * f + 0.02, 0.03, 2 * f + 0.02), beam, 0, h * 0.5 + 0.05, 0);
    const shape = new THREE.Shape([new THREE.Vector2(-f, 0), new THREE.Vector2(f, 0), new THREE.Vector2(0, rh)]);
    const gable = new THREE.ExtrudeGeometry(shape, { depth: 2 * f, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-f, h + 0.05, 0);
    this.add(at, gable, wall, 0, 0, 0);
    const L = Math.hypot(f + e, rh), a = Math.atan2(rh, f + e);
    for (const side of [1, -1]) {
      const slab = this.add(at, new THREE.BoxGeometry(2 * f + 2 * e, 0.05, L + 0.02), roof, 0, h + 0.05 + rh / 2 + 0.02, (side * (f + e)) / 2);
      slab.rotation.x = side * a;
    }
    this.add(at, new THREE.BoxGeometry(2 * f + 2 * e, 0.05, 0.05), shadeOf(roof, 0.7), 0, h + 0.07 + rh, 0);
    this.add(at, new THREE.BoxGeometry(0.13, 0.22, 0.02), '#3a2414', -f * 0.35, 0.16, f + 0.01);
    this.add(at, new THREE.BoxGeometry(0.02, 0.1, 0.12), '#ffcf6a', f + 0.01, h * 0.6, 0, { emissive: '#ff9a30', emissiveIntensity: 0.6 });
    this.add(at, new THREE.BoxGeometry(0.1, 0.1, 0.02), '#ffcf6a', f * 0.4, h * 0.6, f + 0.01, { emissive: '#ff9a30', emissiveIntensity: 0.6 });
    this.add(at, new THREE.BoxGeometry(0.08, rh + 0.2, 0.08), '#7a7068', f * 0.5, h + rh * 0.55, -f * 0.35);
    return at;
  }

  private logPile(g: THREE.Group, x: number, z: number, n: number) {
    for (let i = 0; i < n; i++) {
      const m = this.add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.26, 7), '#7a4a24', x + (i % 3) * 0.075 - 0.075 + (i >= 3 ? 0.037 : 0), 0.04 + (i >= 3 ? 0.06 : 0), z);
      m.rotation.x = Math.PI / 2;
    }
  }

  private makeBuilding(type: BType, built: boolean): Model {
    const g = new THREE.Group();
    const def = BDEFS[type];
    const model: Model = { g, key: `${type}:${built}` };
    if (!built) {
      this.add(g, new THREE.BoxGeometry(0.9, 0.06, 0.9), '#a88d63', 0, 0.01, 0);
      const rise = this.add(g, new THREE.BoxGeometry(0.66, 1, 0.66), '#c99c62', 0, 0, 0);
      rise.geometry.translate(0, 0.5, 0);
      model.rise = rise;
      for (const [x, z] of [[-0.36, 0.36], [0.36, 0.36], [0.36, -0.36], [-0.36, -0.36]])
        this.add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), '#6b4a28', x, 0.35, z);
      const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#000000', opacity: 0.55, transparent: true, depthTest: false }));
      bg.scale.set(0.6, 0.07, 1);
      bg.position.y = 1.05;
      bg.renderOrder = 10;
      const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#ffd24a', depthTest: false }));
      bar.center.set(0, 0.5);
      bar.renderOrder = 11;
      bar.position.copy(bg.position).addScaledVector(RIGHT, -0.3);
      g.add(bg, bar);
      model.bar = bar;
      return model;
    }
    switch (type) {
      case 'hq': {
        this.add(g, new THREE.BoxGeometry(0.98, 0.3, 0.98), '#8a8378', 0, -0.1, 0);
        const tx = -0.22, tz = -0.22;
        this.add(g, new THREE.BoxGeometry(0.42, 1.3, 0.42), '#cbbd9e', tx, 0.65, tz);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]])
          this.add(g, new THREE.BoxGeometry(0.09, 0.1, 0.09), '#b8aa8a', tx + x * 0.17, 1.35, tz + z * 0.17);
        this.add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), '#3b2b1a', tx, 1.6, tz);
        const cloth = this.add(g, new THREE.PlaneGeometry(0.32, 0.18).translate(0.16, 0, 0), '#c8382a', tx, 1.75, tz, { side: THREE.DoubleSide });
        model.cloth = cloth;
        this.house(g, 0.4, 0.62, 0.42, def.wall, def.roof, 0.06, 0.06);
        break;
      }
      case 'lookout': {
        this.add(g, new THREE.BoxGeometry(0.6, 0.3, 0.6), '#8a8378', 0, -0.1, 0);
        this.add(g, new THREE.BoxGeometry(0.44, 1.1, 0.44), def.wall, 0, 0.6, 0);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.add(g, new THREE.BoxGeometry(0.05, 1.15, 0.05), '#4a3220', x * 0.22, 0.6, z * 0.22);
        this.add(g, new THREE.BoxGeometry(0.6, 0.05, 0.6), '#6b4a28', 0, 1.17, 0);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.add(g, new THREE.BoxGeometry(0.035, 0.28, 0.035), '#4a3220', x * 0.27, 1.32, z * 0.27);
        const roof = this.add(g, new THREE.ConeGeometry(0.46, 0.45, 4), def.roof, 0, 1.68, 0);
        roof.rotation.y = Math.PI / 4;
        this.add(g, new THREE.BoxGeometry(0.12, 0.22, 0.02), '#3a2414', 0, 0.16, 0.23);
        break;
      }
      case 'sawmill': {
        this.house(g, 0.36, 0.48, 0.32, def.wall, def.roof, -0.05, -0.05);
        this.logPile(g, 0.38, -0.1, 5);
        const blade = this.add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16), '#c0c4c8', 0.38, 0.22, 0.25, { metalness: 0.8, roughness: 0.3 });
        blade.rotation.x = Math.PI / 2;
        this.add(g, new THREE.BoxGeometry(0.3, 0.12, 0.12), '#6b4a28', 0.38, 0.06, 0.25);
        break;
      }
      default: {
        this.house(g, 0.3, 0.42, 0.3, def.wall, def.roof, -0.04, -0.04);
        if (type === 'woodcutter') {
          this.logPile(g, 0.3, 0.3, 3);
          this.add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), '#6b4a28', -0.32, 0.05, 0.32);
        } else if (type === 'forester') {
          for (const [x, z] of [[0.33, 0.28], [0.36, -0.1]]) {
            this.add(g, new THREE.CylinderGeometry(0.01, 0.012, 0.1, 4), '#56381c', x, 0.05, z);
            this.add(g, new THREE.IcosahedronGeometry(0.06, 0), '#6aa848', x, 0.12, z, { flatShading: true });
          }
        } else if (type === 'quarry') {
          for (const [x, z, s] of [[0.33, 0.25, 0.09], [0.38, -0.05, 0.07], [0.26, -0.3, 0.08]])
            this.add(g, new THREE.BoxGeometry(s * 1.6, s, s * 1.2), '#a3a19a', x, s / 2, z);
        }
      }
    }
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(type), depthTest: false, transparent: true }));
    icon.scale.setScalar(0.34);
    icon.renderOrder = 12;
    if (type !== 'hq') {
      icon.position.y = type === 'lookout' ? 2.15 : 1.3;
      g.add(icon);
      model.icon = icon;
    }
    model.smoke = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: '#e8e8e8', transparent: true, depthWrite: false }));
      s.visible = false;
      g.add(s);
      return s;
    });
    return model;
  }

  private icon(type: BType) {
    let t = this.icons.get(type);
    if (!t) this.icons.set(type, (t = iconTexture(BDEFS[type].icon)));
    return t;
  }

  private ghostify(g: THREE.Object3D) {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = (m.material as THREE.Material).clone();
      Object.assign(m.material, { transparent: true, opacity: 0.55, depthWrite: false });
      m.castShadow = false;
    });
    g.visible = false;
  }

  private buildings(game: Game, now: number) {
    const seen = new Set<number>();
    for (const b of game.buildings.values()) {
      seen.add(b.id);
      const key = `${b.type}:${b.built}`;
      let m = this.models.get(b.id);
      if (!m || m.key !== key) {
        if (m) this.scene.remove(m.g);
        m = this.makeBuilding(b.type, b.built);
        m.g.position.set(b.x + 0.5, this.heightAt(b.x + 0.5, b.y + 0.5), b.y + 0.5);
        this.models.set(b.id, m);
        this.scene.add(m.g);
      }
      this.animateBuilding(b, m, now);
    }
    for (const [id, m] of this.models)
      if (!seen.has(id)) {
        this.scene.remove(m.g);
        this.models.delete(id);
      }
  }

  private animateBuilding(b: Building, m: Model, now: number) {
    const base = m.g.position;
    if (m.rise) {
      m.rise.scale.y = Math.max(0.001, 0.55 * b.progress);
      m.bar!.scale.set(0.6 * b.progress, 0.07, 1);
      let k = 0;
      for (const g of ['plank', 'stone'] as Good[])
        for (let i = 0; i < b.stock[g]; i++, k++) this.good(g, base.x - 0.3 + (k % 3) * 0.2, base.y + 0.04 + Math.floor(k / 3) * 0.06, base.z + 0.52, 0);
      return;
    }
    if (m.cloth) m.cloth.rotation.y = Math.sin(now * 3) * 0.35;
    if (m.icon) m.icon.position.y = (b.type === 'lookout' ? 2.15 : 1.3) + Math.sin(now * 2 + b.id) * 0.03;
    m.smoke!.forEach((s, i) => {
      s.visible = b.busy;
      if (!b.busy) return;
      const t = (now * 0.5 + i / 3) % 1;
      s.position.set(0.12 + Math.sin(t * 6) * 0.05, 0.95 + t * 0.7, -0.12);
      s.scale.setScalar(0.12 + t * 0.25);
      (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - t);
    });
    let k = 0;
    for (const g of GOOD_LIST)
      for (let i = 0; i < b.out[g]; i++, k++) this.good(g, base.x + 0.5, base.y + 0.04 + Math.floor(k / 2) * 0.06, base.z + 0.12 - (k % 2) * 0.24, Math.PI / 2);
  }

  private good(g: Good, x: number, y: number, z: number, rot: number) {
    const n = this.goodN[g]++;
    if (n >= 4000) return;
    this.e.set(0, rot, 0);
    this.m4.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e), this.s.setScalar(1));
    this.goods[g].setMatrixAt(n, this.m4);
  }

  // --- flags and settlers --------------------------------------------------

  private makeFlag(): Model {
    const g = new THREE.Group();
    this.add(g, new THREE.CylinderGeometry(0.014, 0.018, 0.55, 5), '#4a3420', 0, 0.27, 0);
    const cloth = this.add(g, new THREE.PlaneGeometry(0.24, 0.15).translate(0.12, 0, 0), '#e9c440', 0, 0.46, 0, { side: THREE.DoubleSide });
    return { g, key: 'flag', cloth };
  }

  private flagsAndGoods(game: Game, now: number) {
    const seen = new Set<number>();
    for (const f of game.flags.values()) {
      seen.add(f.id);
      let m = this.flags.get(f.id);
      if (!m) {
        m = this.makeFlag();
        m.g.position.set(f.x + 0.5, this.heightAt(f.x + 0.5, f.y + 0.5), f.y + 0.5);
        this.flags.set(f.id, m);
        this.scene.add(m.g);
      }
      m.cloth!.rotation.y = Math.sin(now * 4 + f.x) * 0.4;
      const p = m.g.position;
      f.items.forEach((it, k) => {
        const a = (k / 8) * Math.PI * 2 + 0.4;
        this.good(it.g, p.x + Math.cos(a) * 0.2, p.y + 0.04, p.z + Math.sin(a) * 0.2, -a);
      });
    }
    for (const [id, m] of this.flags)
      if (!seen.has(id)) {
        this.scene.remove(m.g);
        this.flags.delete(id);
      }
  }

  private makePerson(role: Role): Person {
    const g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    const legs = [-0.03, 0.03].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.12, 0);
      this.add(pivot, new THREE.BoxGeometry(0.035, 0.12, 0.04), '#3a2a1c', 0, -0.06, 0);
      body.add(pivot);
      return pivot;
    });
    this.add(body, new THREE.CylinderGeometry(0.05, 0.065, 0.15, 8), ROLE_COLOR[role], 0, 0.19, 0);
    this.add(body, new THREE.SphereGeometry(0.042, 10, 8), '#e8bf94', 0, 0.3, 0);
    this.add(body, new THREE.CylinderGeometry(0.03, 0.06, 0.04, 10), shadeOf(ROLE_COLOR[role], 0.65), 0, 0.34, 0);
    const tool = new THREE.Group();
    tool.position.set(0.07, 0.22, 0.02);
    this.add(tool, new THREE.BoxGeometry(0.015, 0.015, 0.16), '#6b4a28', 0, 0, 0.08);
    this.add(tool, new THREE.BoxGeometry(0.04, 0.04, 0.03), role === 'forester' ? '#6abf4b' : '#c0c4c8', 0, 0, 0.16);
    tool.visible = false;
    body.add(tool);
    return { g, legs, tool, body, px: NaN, py: NaN, heading: 0 };
  }

  private settlers(game: Game, now: number) {
    const seen = new Set<number>();
    for (const s of game.settlers.values()) {
      if (s.inside) continue;
      seen.add(s.id);
      let p = this.people.get(s.id);
      if (!p) {
        p = this.makePerson(s.role);
        this.people.set(s.id, p);
        this.scene.add(p.g);
      }
      this.pose(s, p, now);
    }
    for (const [id, p] of this.people)
      if (!seen.has(id)) {
        this.scene.remove(p.g);
        this.people.delete(id);
      }
  }

  private pose(s: Settler, p: Person, now: number) {
    const x = s.x + 0.5, z = s.y + 0.5;
    const dx = x - p.px, dz = z - p.py;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < 1) {
      const want = Math.atan2(dx, dz);
      let d = want - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * 0.3;
    }
    p.px = x;
    p.py = z;
    const ph = now * 11 + s.id;
    const y = this.heightAt(x, z);
    p.g.position.set(x, y + (s.walking ? Math.abs(Math.sin(ph)) * 0.02 : 0), z);
    p.g.rotation.y = p.heading;
    const swing = s.walking ? Math.sin(ph) * 0.6 : 0;
    p.legs[0].rotation.x = swing;
    p.legs[1].rotation.x = -swing;
    p.tool.visible = !!s.anim;
    if (s.anim) p.tool.rotation.x = s.anim === 'plant' ? 0.9 + Math.sin(now * 6) * 0.3 : -0.4 + Math.sin(now * 9) * 0.9;
    if (s.carrying) this.good(s.carrying, x, y + 0.42, z, p.heading + Math.PI / 2);
  }

  // --- overlays ------------------------------------------------------------

  private tileOutline(line: THREE.LineLoop | THREE.Mesh, x: number, y: number, lift = 0.04) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].forEach(([cx, cy], i) => a.setXYZ(i, cx, this.heightAt(cx, cy) + lift, cy));
    a.needsUpdate = true;
    line.visible = true;
  }

  private circle(line: THREE.LineLoop, x: number, y: number, r: number) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2, px = x + 0.5 + Math.cos(t) * r, pz = y + 0.5 + Math.sin(t) * r;
      a.setXYZ(i, px, Math.max(SEA, this.heightAt(px, pz)) + 0.05, pz);
    }
    a.needsUpdate = true;
    line.visible = true;
  }

  private overlays(game: Game, view: View) {
    for (const o of [this.hoverFill, this.hoverRing, this.selRing, this.fromRing, this.selRadius, this.placeRadius, this.ghostFlag]) o.visible = false;
    for (const g of this.ghosts.values()) g.visible = false;
    const world = game.world;

    const from = view.tool === 'road' && view.roadFrom ? game.flags.get(view.roadFrom) : null;
    if (from) this.tileOutline(this.fromRing, from.x, from.y);
    const path = from ? view.preview : null;
    if (path !== this.previewOf) {
      this.previewOf = path;
      const g = new THREE.BufferGeometry();
      if (path) g.setFromPoints(path.map((p) => new THREE.Vector3(p.x + 0.5, this.heightAt(p.x + 0.5, p.y + 0.5) + 0.08, p.y + 0.5)));
      this.preview.geometry.dispose();
      this.preview.geometry = g;
      // A geometry without points has no position attribute, which computeLineDistances needs.
      if (path) this.preview.computeLineDistances();
    }
    this.preview.visible = !!path;

    const sel = game.buildings.get(view.selected);
    if (sel) {
      this.tileOutline(this.selRing, sel.x, sel.y);
      const r = BDEFS[sel.type].radius;
      if (r && sel.type !== 'hq') this.circle(this.selRadius, sel.x, sel.y, r);
    }

    const hv = view.hover;
    if (!hv || !world.inside(hv.x, hv.y)) return;
    if (view.placing) {
      this.tileOutline(this.hoverFill, hv.x, hv.y, 0.03);
      (this.hoverFill.material as THREE.MeshBasicMaterial).color.set(view.placeOk ? '#78ff8c' : '#ff5a50');
      const r = BDEFS[view.placing].radius;
      if (r) this.circle(this.placeRadius, hv.x, hv.y, r);
      if (view.placeOk) {
        let ghost = this.ghosts.get(view.placing);
        if (!ghost) {
          ghost = this.makeBuilding(view.placing, true).g;
          this.ghostify(ghost);
          ghost.traverse((o) => { if ((o as THREE.Sprite).isSprite) o.visible = false; });
          this.ghosts.set(view.placing, ghost);
          this.scene.add(ghost);
        }
        ghost.position.set(hv.x + 0.5, this.heightAt(hv.x + 0.5, hv.y + 0.5), hv.y + 0.5);
        ghost.visible = true;
        this.ghostFlag.position.set(hv.x + 0.5, this.heightAt(hv.x + 0.5, hv.y + 1.5), hv.y + 1.5);
        this.ghostFlag.visible = true;
      }
    } else {
      (this.hoverRing.material as THREE.LineBasicMaterial).color.set(view.tool === 'remove' ? '#ff6a5a' : '#ffffff');
      this.tileOutline(this.hoverRing, hv.x, hv.y);
    }
  }
}

function shadeOf(hex: string, k: number) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}
