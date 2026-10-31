// Wild animal models, deer, hares and foxes, and how they walk, hop and graze each frame.
import * as THREE from 'three';
import type { Animal, AnimalKind, Game } from '../game';
import { add } from './kit';
import { disposeModel, mergeModel } from './merge';
import type { Terrain } from './terrain';

// Drawn larger than true scale, like the settlers, so you can spot them.
const SCALE = 1.35;

interface Beast {
  g: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Object3D[];
  px: number;
  py: number;
  heading: number;
}

export class Animals {
  private beasts = new Map<number, Beast>();

  constructor(private scene: THREE.Scene, private ground: Terrain) {}

  draw(game: Game, now: number) {
    for (const a of game.animals.values()) {
      let b = this.beasts.get(a.id);
      if (!b) {
        b = makeAnimal(a.kind, a.id % 2 === 0);
        this.beasts.set(a.id, b);
        this.scene.add(b.g);
      }
      this.pose(a, b, now);
    }
    for (const [id, b] of this.beasts)
      if (!game.animals.has(id)) {
        this.drop(b);
        this.beasts.delete(id);
      }
  }

  clear() {
    for (const b of this.beasts.values()) this.drop(b);
    this.beasts.clear();
  }

  private drop(b: Beast) {
    this.scene.remove(b.g);
    disposeModel(b.g);
  }

  private pose(a: Animal, b: Beast, now: number) {
    const x = a.x + 0.5, z = a.y + 0.5;
    const dx = x - b.px, dz = z - b.py;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < 1) {
      let d = Math.atan2(dx, dz) - b.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      b.heading += d * 0.3;
    }
    b.px = x;
    b.py = z;
    const moving = !!a.path;
    const ph = now * (a.fleeing ? 16 : 10) + a.id;
    b.g.position.set(x, this.ground.heightAt(x, z), z);
    b.g.rotation.y = b.heading;
    // Hares hop; deer and foxes trot with their legs in pairs.
    b.body.position.y = moving && a.kind === 'hare' ? Math.abs(Math.sin(ph * 0.7)) * 0.08 : 0;
    const swing = moving ? Math.sin(ph) * 0.7 : 0;
    b.legs.forEach((l, i) => (l.rotation.x = i === 0 || i === 3 ? swing : -swing));
    // Standing still, deer and hares lower their heads to graze now and then.
    const graze = !moving && a.kind !== 'fox' && Math.sin(now * 0.7 + a.id * 1.7) > 0;
    b.head.rotation.x = graze ? 0.9 + Math.sin(now * 5 + a.id) * 0.08 : 0;
  }
}

function makeAnimal(kind: AnimalKind, antlers: boolean): Beast {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  g.add(body);
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const leg = (x: number, z: number, top: number, color: string, w = 0.025) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, top, z);
    add(pivot, new THREE.BoxGeometry(w, top, w), color, 0, -top / 2, 0);
    body.add(pivot);
    legs.push(pivot);
  };
  if (kind === 'deer') {
    const fur = '#a0683a', dark = '#5a3a22';
    add(body, new THREE.BoxGeometry(0.11, 0.11, 0.28), fur, 0, 0.27, 0);
    add(body, new THREE.BoxGeometry(0.05, 0.05, 0.03), '#f2ece0', 0, 0.3, -0.15);
    for (const [x, z] of [[-0.035, 0.1], [0.035, 0.1], [-0.035, -0.1], [0.035, -0.1]]) leg(x, z, 0.23, dark);
    head.position.set(0, 0.3, 0.12);
    add(head, new THREE.BoxGeometry(0.05, 0.13, 0.05), fur, 0, 0.06, 0.02).rotation.x = 0.35;
    add(head, new THREE.BoxGeometry(0.06, 0.06, 0.11), fur, 0, 0.13, 0.07);
    add(head, new THREE.BoxGeometry(0.03, 0.025, 0.02), '#2a1c12', 0, 0.12, 0.13);
    for (const s of [-1, 1]) {
      add(head, new THREE.BoxGeometry(0.04, 0.02, 0.012), fur, s * 0.045, 0.17, 0.04).rotation.z = s * 0.4;
      if (antlers) {
        add(head, new THREE.BoxGeometry(0.01, 0.1, 0.01), '#e8dcc0', s * 0.022, 0.21, 0.05).rotation.z = s * 0.3;
        add(head, new THREE.BoxGeometry(0.01, 0.05, 0.01), '#e8dcc0', s * 0.04, 0.23, 0.07).rotation.x = 0.6;
      }
    }
  } else if (kind === 'hare') {
    const fur = '#8f7a62';
    add(body, new THREE.SphereGeometry(0.06, 8, 6).scale(0.85, 0.8, 1.2), fur, 0, 0.07, 0);
    add(body, new THREE.SphereGeometry(0.022, 6, 4), '#f2ece0', 0, 0.09, -0.07);
    for (const [x, z] of [[-0.03, 0.04], [0.03, 0.04], [-0.035, -0.04], [0.035, -0.04]]) leg(x, z, 0.04, fur, 0.02);
    head.position.set(0, 0.09, 0.06);
    add(head, new THREE.SphereGeometry(0.034, 8, 6), fur, 0, 0.02, 0.02);
    add(head, new THREE.SphereGeometry(0.008, 4, 3), '#1c140e', 0.025, 0.03, 0.04);
    add(head, new THREE.SphereGeometry(0.008, 4, 3), '#1c140e', -0.025, 0.03, 0.04);
    for (const s of [-1, 1]) add(head, new THREE.BoxGeometry(0.016, 0.09, 0.026), fur, s * 0.014, 0.085, -0.005).rotation.set(-0.35, 0, s * 0.15);
  } else {
    const fur = '#d06a24', white = '#f4eee2', dark = '#2e2218';
    add(body, new THREE.BoxGeometry(0.075, 0.075, 0.2), fur, 0, 0.13, 0);
    add(body, new THREE.BoxGeometry(0.05, 0.03, 0.12), white, 0, 0.1, 0.03);
    for (const [x, z] of [[-0.025, 0.07], [0.025, 0.07], [-0.025, -0.07], [0.025, -0.07]]) leg(x, z, 0.1, dark, 0.02);
    const tail = add(body, new THREE.BoxGeometry(0.045, 0.045, 0.16), fur, 0, 0.12, -0.17);
    tail.rotation.x = 0.45;
    add(body, new THREE.BoxGeometry(0.045, 0.045, 0.04), white, 0, 0.085, -0.245).rotation.x = 0.45;
    head.position.set(0, 0.15, 0.1);
    add(head, new THREE.BoxGeometry(0.07, 0.06, 0.06), fur, 0, 0.01, 0.02);
    add(head, new THREE.ConeGeometry(0.025, 0.07, 6).rotateX(Math.PI / 2), white, 0, 0, 0.08);
    add(head, new THREE.SphereGeometry(0.008, 4, 3), dark, 0, 0, 0.115);
    for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.018, 0.045, 4), fur, s * 0.022, 0.055, 0.015);
  }
  body.scale.setScalar(SCALE);
  mergeModel(g, [body, head, ...legs]);
  return { g, body, head, legs, px: NaN, py: NaN, heading: 0 };
}
