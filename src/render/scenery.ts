// Trees, plants, rocks and grain fields, redrawn each frame so they sway in the wind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { World, W, H } from '../world';
import { wind, flutter } from '../wind';
import { ART } from '../art';
import { grade, hash } from './kit';
import { KINDS, Kind, LEAN_AXIS, PETALS, PLANTS, UP, birch, blossom, boulder, broadleaf, conifer, flowerParts } from './plants';
import type { Terrain } from './terrain';

export class Scenery {
  private trees: THREE.InstancedMesh[];
  private plants = {} as Record<Kind, THREE.InstancedMesh>;
  private petals: THREE.InstancedMesh;
  private rocks: THREE.InstancedMesh;
  private crops: THREE.InstancedMesh;
  private fields: THREE.InstancedMesh;

  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(scene: THREE.Scene, private ground: Terrain) {
    const tree = (geo: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), W * H);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.trees = [tree(broadleaf()), tree(conifer()), tree(birch()), tree(blossom())];
    const plant = (geo: THREE.BufferGeometry, shadow = false) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), W * H);
      m.castShadow = shadow;
      m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    for (const k of KINDS) this.plants[k] = plant(PLANTS[k].geo(), PLANTS[k].shadow);
    this.petals = plant(flowerParts(true));
    this.rocks = new THREE.InstancedMesh(boulder(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), W * H * 3);
    this.rocks.castShadow = this.rocks.receiveShadow = true;
    this.rocks.frustumCulled = false;
    scene.add(this.rocks);

    // Grain fields: a patch of tilled soil under a tuft of stalks that grows and turns gold.
    const stalks: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const sx = ((i % 4) - 1.5) * 0.2 + (hash(i, 3) - 0.5) * 0.08, sz = (Math.floor(i / 4) - 1.5) * 0.2 + (hash(3, i) - 0.5) * 0.08;
      stalks.push(new THREE.BoxGeometry(0.025, 0.3, 0.025).translate(sx, 0.15, sz), new THREE.BoxGeometry(0.04, 0.07, 0.04).translate(sx, 0.31, sz));
    }
    this.crops = new THREE.InstancedMesh(mergeGeometries(stalks), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), W * H);
    this.crops.castShadow = this.crops.receiveShadow = true;
    this.fields = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), W * H);
    this.fields.receiveShadow = true;
    for (const m of [this.crops, this.fields]) {
      m.frustumCulled = false;
      scene.add(m);
    }
  }

  // Turns a model by `yaw` around its base, then bends it `bend` radians with the wind.
  private bent(yaw: number, bend: number) {
    this.q.setFromAxisAngle(UP, yaw);
    this.q2.setFromAxisAngle(LEAN_AXIS, bend);
    return this.q.premultiply(this.q2);
  }

  draw(world: World, now: number) {
    const height = (x: number, y: number) => this.ground.heightAt(x, y);
    const [leafy, pine, birch, bloom] = this.trees;
    const nt = [0, 0, 0, 0];
    const np = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
    let nr = 0, nc = 0, nf = 0, ns = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = world.at(x, y);
        const gust = wind(x, y, now);
        if (t.tree > 0) {
          const px = x + 0.5 + (hash(x, y) - 0.5) * 0.3, pz = y + 0.5 + (hash(y, x) - 0.5) * 0.3;
          const s = (0.3 + 0.7 * t.tree) * (0.85 + hash(x * 3, y) * 0.35);
          // Some leafy trees are birches, and a few are in blossom. Only the look changes.
          const pick = hash(x * 7 + 1, y * 13 + 2);
          const kind = t.conifer ? 1 : pick < 0.2 ? 2 : pick < 0.27 ? 3 : 0;
          const bend = gust * 0.07 + flutter(x, y, now) * 0.012;
          this.m4.compose(this.v.set(px, height(px, pz) - 0.02, pz), this.bent(hash(x, y * 7) * Math.PI * 2, bend), this.s.setScalar(s));
          const mesh = this.trees[kind], n = nt[kind]++;
          mesh.setMatrixAt(n, this.m4);
          // A little warmer or cooler, lighter or darker, so a forest is not one flat green.
          mesh.setColorAt(n, this.c.setHSL(ART.tree.hue + (hash(y, x * 5) - 0.5) * ART.tree.range, ART.tree.s, ART.tree.l + hash(x, y * 3) * 0.22));
        }
        // A farm's field is tilled soil from the day the farm is placed. Grain grows on it.
        if (t.field || t.crop > 0) {
          this.m4.compose(this.v.set(x + 0.5, height(x + 0.5, y + 0.5) + 0.015, y + 0.5), this.q.identity(), this.s.setScalar(1));
          this.fields.setMatrixAt(ns++, this.m4);
        }
        if (t.crop > 0) {
          const px = x + 0.5, pz = y + 0.5, gy = height(px, pz);
          const bend = (gust * 0.16 + flutter(x, y, now, 1.3) * 0.03) * t.crop;
          const q = this.bent(0, bend);
          this.m4.compose(this.v.set(px, gy, pz), q, this.s.set(1, 0.08 + 0.92 * t.crop, 1));
          this.crops.setMatrixAt(nc, this.m4);
          // Green while growing, gold when ripe.
          this.crops.setColorAt(nc++, t.crop >= 1 ? this.c.set('#e0b84a') : this.c.setHSL(0.25 - 0.1 * t.crop, 0.55, 0.36 + 0.1 * t.crop));
        }
        // A plant hides under anything else on its tile, and comes back when that is gone.
        if (t.plant && !t.tree && !t.crop && !t.field && !t.rock && !t.b && !t.flag && !t.road) {
          const p = PLANTS[t.plant], mesh = this.plants[t.plant], n = np[t.plant]++;
          const px = x + 0.5 + (hash(x * 5, y) - 0.5) * 0.2, pz = y + 0.5 + (hash(x, y * 5) - 0.5) * 0.2;
          const bend = p.bend * (gust + flutter(x, y, now, 1.6) * 0.25);
          const s = 0.85 + hash(x * 11, y * 3) * 0.35;
          const q = this.bent(hash(y * 3, x) * Math.PI * 2, bend);
          this.m4.compose(this.v.set(px, height(px, pz) - 0.01, pz), q, this.s.setScalar(s));
          mesh.setMatrixAt(n, this.m4);
          mesh.setColorAt(n, t.plant === 'pebbles' ? this.c.setHSL(0.08, 0.08, 0.55 + hash(x, y * 9) * 0.2) : this.c.setHSL(0.15, 0.2, 0.85 + hash(x * 9, y) * 0.15));
          if (t.plant === 'flowers') {
            this.petals.setMatrixAt(nf, this.m4);
            this.petals.setColorAt(nf++, this.c.set(grade(PETALS[Math.floor(hash(x * 13, y * 17) * PETALS.length)])));
          }
        }
        if (t.rock > 0) {
          const k = Math.min(3, Math.ceil(t.rock / 2));
          for (let i = 0; i < k; i++) {
            const px = x + 0.5 + (hash(x + i, y) - 0.5) * 0.55, pz = y + 0.5 + (hash(x, y + i) - 0.5) * 0.55;
            const s = 0.9 + hash(x * (i + 1), y) * 0.6 + t.rock * 0.08;
            this.e.set(hash(i, x) * 3, hash(y, i) * 6, 0);
            this.m4.compose(this.v.set(px, height(px, pz) + 0.02, pz), this.q.setFromEuler(this.e), this.s.set(s, s * 0.7, s));
            this.rocks.setMatrixAt(nr, this.m4);
            this.rocks.setColorAt(nr++, this.c.setHSL(0.08 + hash(i, y) * 0.04, 0.08, 0.5 + hash(x + i, y * 2) * 0.14));
          }
        }
      }
    for (const k of KINDS) {
      const m = this.plants[k];
      m.count = np[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    for (const [m, n] of [[leafy, nt[0]], [pine, nt[1]], [birch, nt[2]], [bloom, nt[3]], [this.petals, nf], [this.rocks, nr], [this.crops, nc], [this.fields, ns]] as const) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
