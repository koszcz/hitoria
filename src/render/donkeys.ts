// Pack donkey models: a grey donkey with long ears and a basket on each side, and how it walks.
// A loaded donkey shows one good in each basket.
import * as THREE from 'three';
import type { Game, Good, Settler } from '../game';
import { add } from './kit';
import { disposeModel, mergeModel } from './merge';
import type { Terrain } from './terrain';

// Drawn larger than true scale, like the settlers, so you can spot it.
const SCALE = 1.35;
const BASKET_Y = 0.25 * SCALE; // the top of the baskets
const BASKET_X = 0.075 * SCALE; // how far each basket hangs out to the side

interface Donkey {
  g: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Object3D[];
  px: number;
  py: number;
  heading: number;
}

type Put = (good: Good, x: number, y: number, z: number, rot: number) => void;

export class Donkeys {
  private herd = new Map<number, Donkey>();

  constructor(private scene: THREE.Scene, private ground: Terrain) {}

  draw(game: Game, now: number, put: Put) {
    for (const s of game.donkeys.values()) {
      let d = this.herd.get(s.id);
      if (!d) {
        d = makeDonkey();
        this.herd.set(s.id, d);
        this.scene.add(d.g);
      }
      this.pose(s, d, now, put);
    }
    for (const [id, d] of this.herd)
      if (!game.donkeys.has(id)) {
        this.drop(d);
        this.herd.delete(id);
      }
  }

  clear() {
    for (const d of this.herd.values()) this.drop(d);
    this.herd.clear();
  }

  private drop(d: Donkey) {
    this.scene.remove(d.g);
    disposeModel(d.g);
  }

  private pose(s: Settler, d: Donkey, now: number, put: Put) {
    const x = s.x + 0.5, z = s.y + 0.5;
    const dx = x - d.px, dz = z - d.py;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < 1) {
      let a = Math.atan2(dx, dz) - d.heading;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      d.heading += a * 0.3;
    }
    d.px = x;
    d.py = z;
    const ph = now * 9 + s.id;
    const y = this.ground.heightAt(x, z);
    d.g.position.set(x, y, z);
    d.g.rotation.y = d.heading;
    d.body.position.y = s.walking ? Math.abs(Math.sin(ph)) * 0.012 : 0;
    const swing = s.walking ? Math.sin(ph) * 0.6 : 0;
    d.legs.forEach((l, i) => (l.rotation.x = i === 0 || i === 3 ? swing : -swing));
    // The head nods as it walks, and dips to graze now and then while it waits.
    d.head.rotation.x = s.walking ? Math.sin(ph * 2) * 0.08 : Math.sin(now * 0.6 + s.id) > 0.3 ? 0.7 : 0;
    if (!s.carrying) return;
    // One good in each basket, on either side of its back.
    const sx = Math.cos(d.heading), sz = -Math.sin(d.heading);
    for (let i = 0; i < (s.load ?? 1); i++) {
      const side = i % 2 ? -1 : 1, up = Math.floor(i / 2) * 0.06;
      put(s.carrying, x + sx * BASKET_X * side, y + BASKET_Y + up + d.body.position.y, z + sz * BASKET_X * side, d.heading);
    }
  }
}

function makeDonkey(): Donkey {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  g.add(body);
  body.add(head);
  const coat = '#8a8278', belly = '#d8d0c4', dark = '#3a342e', basket = '#a07840';
  const legs: THREE.Object3D[] = [];
  for (const [lx, lz] of [[-0.035, 0.08], [0.035, 0.08], [-0.035, -0.08], [0.035, -0.08]]) {
    const pivot = new THREE.Group();
    pivot.position.set(lx, 0.14, lz);
    add(pivot, new THREE.BoxGeometry(0.03, 0.14, 0.03), coat, 0, -0.07, 0);
    add(pivot, new THREE.BoxGeometry(0.032, 0.02, 0.034), dark, 0, -0.13, 0);
    body.add(pivot);
    legs.push(pivot);
  }
  add(body, new THREE.BoxGeometry(0.1, 0.1, 0.24), coat, 0, 0.18, 0);
  add(body, new THREE.BoxGeometry(0.08, 0.02, 0.2), belly, 0, 0.13, 0);
  add(body, new THREE.BoxGeometry(0.02, 0.012, 0.22), dark, 0, 0.236, 0); // the dark stripe along its back
  add(body, new THREE.BoxGeometry(0.015, 0.07, 0.015), dark, 0, 0.16, -0.125).rotation.x = -0.3; // tail
  // A blanket over its back, and a basket hanging on each side.
  add(body, new THREE.BoxGeometry(0.115, 0.012, 0.11), '#b0483a', 0, 0.235, -0.01);
  for (const side of [-1, 1]) add(body, new THREE.BoxGeometry(0.035, 0.07, 0.1), basket, side * 0.072, 0.2, -0.01);
  head.position.set(0, 0.22, 0.11);
  add(head, new THREE.BoxGeometry(0.05, 0.1, 0.05), coat, 0, 0.03, 0.02).rotation.x = 0.5; // neck
  add(head, new THREE.BoxGeometry(0.055, 0.055, 0.11), coat, 0, 0.08, 0.07);
  add(head, new THREE.BoxGeometry(0.05, 0.04, 0.03), belly, 0, 0.07, 0.13); // muzzle
  for (const s of [-1, 1]) {
    add(head, new THREE.BoxGeometry(0.018, 0.09, 0.025), coat, s * 0.02, 0.15, 0.04).rotation.z = s * 0.25; // long ears
    add(head, new THREE.SphereGeometry(0.007, 4, 3), dark, s * 0.028, 0.095, 0.1);
  }
  body.scale.setScalar(SCALE);
  mergeModel(g, [body, head, ...legs]);
  return { g, body, head, legs, px: NaN, py: NaN, heading: 0 };
}
