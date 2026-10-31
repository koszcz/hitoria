// The island's ground, the sea around it and the dashed border of your land.
import * as THREE from 'three';
import { World, W, H } from '../world';
import { ART } from '../art';
import { grade, hash } from './kit';
import { groundHeight } from './elevation';
import { grainTexture, rippleNormals } from './textures';

export const SEA = -0.04;


export class Terrain {
  mesh!: THREE.Mesh;
  grain = grainTexture();

  private world: World | null = null;
  private corners = new Float32Array((W + 1) * (H + 1));
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
    const cx = Math.max(0, Math.min(W - 0.001, x)), cy = Math.max(0, Math.min(H - 0.001, y));
    const i = Math.floor(cx), j = Math.floor(cy), tx = cx - i, ty = cy - j;
    const C = this.corners, k = j * (W + 1) + i;
    const a = C[k], b = C[k + 1], c = C[k + W + 1], d = C[k + W + 2];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  build(world: World) {
    this.world = world;
    const C = this.corners;
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
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: this.grain, roughness: 0.95 }));
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

  // Corner colours blend the four tiles around them; slope and height add rock and snow.
  paint() {
    const world = this.world!, C = this.corners;
    const col = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const base = new Map<number, THREE.Color>();
    const tileCol = (x: number, y: number) => {
      const key = y * W + x;
      let c = base.get(key);
      if (c) return c;
      const t = world.at(x, y);
      c = t.t === 'water' ? new THREE.Color(ART.sand)
        : t.t === 'mountain' ? new THREE.Color().setHSL(0.07, 0.1, 0.44 + hash(x, y) * 0.08)
        : t.t === 'grass' ? new THREE.Color(t.col).offsetHSL(ART.grass.h, ART.grass.s, ART.grass.l)
        : new THREE.Color(t.col).offsetHSL(0, 0.05, 0.04);
      if (t.t !== 'grass') c.set(grade('#' + c.getHexString()));
      // Land outside your border stays readable, just cooler and dimmer.
      if (!world.territory[key] && t.t !== 'water') c.offsetHSL(0, -0.12, 0).multiplyScalar(0.72).lerp(new THREE.Color('#4a5070'), 0.12);
      base.set(key, c);
      return c;
    };
    const rock = new THREE.Color(ART.rock), snow = new THREE.Color(ART.snow), line = ART.snowLine;
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
        if (h > line) c.lerp(snow, Math.min(1, (h - line) * 1.2));
        if (h < SEA) c.lerp(this.deep, Math.min(0.85, -h * 0.5));
        col.setXYZ(k, c.r, c.g, c.b);
      }
    col.needsUpdate = true;
  }

  drawBorder() {
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
}
