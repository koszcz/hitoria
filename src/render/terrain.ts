// The island's ground, the sea around it and the dashed border of your land.
import * as THREE from 'three';
import { World } from '../world';
import { ART } from '../art';
import { grade, hash } from './kit';
import { groundHeight } from './elevation';
import { FINE, Relief } from './relief';
import { grainTexture, rippleNormals } from './textures';
import { seasonGround } from './seasonal';
import { wornLook } from '../game/wear';

export const SEA = -0.04;


export class Terrain {
  mesh!: THREE.Mesh;
  grain = grainTexture();

  private world: World | null = null;
  private corners = new Float32Array(0);
  private relief!: Relief;
  private cornerCol = new Float32Array(0);
  private water!: THREE.Mesh;
  private border = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#ffeaa0', dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 }));
  private c = new THREE.Color();
  private deep = new THREE.Color(ART.deep); // sea floor colour far from shore

  constructor(private scene: THREE.Scene) {
    scene.add(this.border);
    this.border.renderOrder = 2;
  }

  // Height of the ground at a point in tile coordinates.
  heightAt(x: number, y: number) {
    return this.relief.at(x, y);
  }

  // Where a ray from the camera meets the ground, in tile coordinates.
  pick(ray: THREE.Ray) {
    const p = this.relief?.hit(ray.origin, ray.direction);
    return p && { x: p.x, y: p.z };
  }

  build(world: World) {
    this.world = world;
    const { w: W, h: H } = world;
    const C = (this.corners = new Float32Array((W + 1) * (H + 1)));
    this.cornerCol = new Float32Array((W + 1) * (H + 1) * 3);
    for (let j = 0; j <= H; j++)
      for (let i = 0; i <= W; i++) {
        let sum = 0, n = 0;
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]])
          if (world.inside(x, y)) {
            sum += groundHeight(world.at(x, y).h);
            n++;
          }
        C[j * (W + 1) + i] = n ? sum / n : -1;
      }

    if (this.mesh) {
      this.scene.remove(this.mesh, this.water);
      this.mesh.geometry.dispose();
    }
    // The mesh has FINE points along each tile side, so mountains show crags and ledges.
    const r = (this.relief = new Relief(C, W, H, { snowLine: ART.snowLine, sea: SEA, home: { x: world.start.x + 0.5, y: world.start.y + 0.5 } })), n = r.n;
    const pos = new Float32Array(r.heights.length * 3), uv = new Float32Array(r.heights.length * 2);
    for (let k = 0; k < r.heights.length; k++) {
      const x = (k % n) / FINE, z = Math.floor(k / n) / FINE;
      pos.set([x, r.heights[k], z], k * 3);
      uv.set([x / 5, z / 5], k * 2);
    }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let q = 0;
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx.set([a, c, b, b, c, d], q);
        q += 6;
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    geo.setAttribute('wear', new THREE.BufferAttribute(new Float32Array(r.heights.length), 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.grain, roughness: 0.95 });
    seasonGround(mat);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;

    const ripples = rippleNormals();
    ripples.repeat.set(40, 40);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 8, H * 8).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: ART.water, roughness: 0.15, metalness: 0.05, transparent: true, opacity: ART.waterOpacity, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35) }),
    );
    this.water.position.set(W / 2, SEA, H / 2);
    this.water.receiveShadow = true;
    this.scene.add(this.mesh, this.water);
  }

  // Moves the ripples on the sea.
  animate(now: number) {
    const water = this.water.material as THREE.MeshStandardMaterial;
    water.normalMap!.offset.set(now * 0.012, now * 0.007);
  }

  // Corner colours blend the four tiles around them, and each fine point blends its corners.
  // Slope and height then add rock and snow. `wear` turns grass and sand toward dirt.
  paint(wear: Float32Array) {
    const world = this.world!, CC = this.cornerCol, { w: W, h: H } = world;
    const col = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const trail = this.mesh.geometry.attributes.wear as THREE.BufferAttribute;
    const base = new Map<number, THREE.Color>();
    const path = new THREE.Color(ART.path);
    const tileCol = (x: number, y: number) => {
      const key = y * W + x;
      let c = base.get(key);
      if (c) return c;
      const t = world.at(x, y);
      c = t.t === 'water' ? new THREE.Color(ART.sand)
        : world.hasOre(x, y) ? new THREE.Color(ART.ore[hash(x, y) < 0.35 ? 1 : 0]).multiplyScalar(0.92 + hash(y, x) * 0.16)
        : t.t === 'mountain' ? new THREE.Color().setHSL(0.07, 0.1, 0.44 + hash(x, y) * 0.08)
        : t.t === 'grass' ? new THREE.Color(t.col).offsetHSL(ART.grass.h, ART.grass.s, ART.grass.l)
        : new THREE.Color(t.col).offsetHSL(0, 0.05, 0.04);
      if (t.t !== 'grass') c.set(grade('#' + c.getHexString()));
      // Land outside your border stays readable, just cooler and dimmer.
      if (!world.territory[key] && t.t !== 'water') c.offsetHSL(0, -0.12, 0).multiplyScalar(0.72).lerp(new THREE.Color('#4a5070'), 0.12);
      base.set(key, c);
      return c;
    };
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
        CC.set([c.r, c.g, c.b], k * 3);
      }
    // How worn each tile looks. Fine points blend the tile centres around them,
    // so a path one tile wide stays one tile wide instead of spreading onto its neighbours.
    const look = new Float32Array(W * H);
    for (let k = 0; k < look.length; k++) look[k] = wornLook(wear[k]);
    const lookAt = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : look[y * W + x]);
    const r = this.relief, n = r.n, rock = new THREE.Color(ART.rock), snow = new THREE.Color(ART.snow);
    for (let k = 0; k < r.heights.length; k++) {
      const fx = (k % n) / FINE, fy = Math.floor(k / n) / FINE;
      const i = Math.min(W - 1, Math.floor(fx)), j = Math.min(H - 1, Math.floor(fy)), tx = fx - i, ty = fy - j;
      const a = (j * (W + 1) + i) * 3, b = a + 3, d = a + (W + 1) * 3, e = d + 3;
      const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
      const c = this.c.setRGB(
        CC[a] * w0 + CC[b] * w1 + CC[d] * w2 + CC[e] * w3,
        CC[a + 1] * w0 + CC[b + 1] * w1 + CC[d + 1] * w2 + CC[e + 1] * w3,
        CC[a + 2] * w0 + CC[b + 2] * w1 + CC[d + 2] * w2 + CC[e + 2] * w3,
      );
      const u = fx - 0.5, v = fy - 0.5, ci = Math.floor(u), cj = Math.floor(v), su = u - ci, sv = v - cj;
      const worn = (lookAt(ci, cj) * (1 - su) + lookAt(ci + 1, cj) * su) * (1 - sv)
        + (lookAt(ci, cj + 1) * (1 - su) + lookAt(ci + 1, cj + 1) * su) * sv;
      if (worn) c.lerp(path, Math.min(0.85, worn));
      if (r.rock[k]) c.lerp(rock, r.rock[k]);
      if (r.snow[k]) c.lerp(snow, r.snow[k]);
      if (r.deep[k]) c.lerp(this.deep, r.deep[k]);
      col.setXYZ(k, c.r, c.g, c.b);
      trail.setX(k, worn); // snow keeps off a worn path
    }
    col.needsUpdate = true;
    trail.needsUpdate = true;
  }

  drawBorder() {
    const world = this.world!, { w: W, h: H } = world;
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
}
