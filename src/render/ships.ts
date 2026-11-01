// Ships: a small sailing ship with settlers and crates on deck, and how it bobs and turns on the water.
import * as THREE from 'three';
import type { Game, Ship } from '../game';
import { add } from './kit';
import { disposeModel, mergeModel } from './merge';
import { crate } from './props';
import { SEA } from './terrain';

const HULL = '#6b4a2c', DECK = '#a07a4e', MAST = '#4e3420', SAIL = '#efe6cf', STRIPE = '#283090';
const COATS = ['#b5523b', '#3d6fa8', '#5f8a3a', '#c89a3a', '#7a4f8f'];
// Drawn larger than true scale, like the settlers, so you can spot it.
const SCALE = 1.4;

interface Boat {
  g: THREE.Group;
  people: THREE.Group; // settlers on deck, shown while they are on board
  load: THREE.Group; // crates on deck, shown while there is cargo
  sail: THREE.Object3D;
  heading: number;
}

export class Ships {
  private boats = new Map<number, Boat>();

  constructor(private scene: THREE.Scene) {}

  draw(game: Game, now: number) {
    const seen = new Set<number>();
    for (const s of game.ships) {
      seen.add(s.id);
      let b = this.boats.get(s.id);
      if (!b) {
        b = makeShip();
        b.heading = headingOf(s, 0);
        this.boats.set(s.id, b);
        this.scene.add(b.g);
      }
      this.pose(s, b, now);
    }
    for (const [id, b] of this.boats)
      if (!seen.has(id)) {
        this.drop(b);
        this.boats.delete(id);
      }
  }

  clear() {
    for (const b of this.boats.values()) this.drop(b);
    this.boats.clear();
  }

  private drop(b: Boat) {
    this.scene.remove(b.g);
    disposeModel(b.g);
  }

  private pose(s: Ship, b: Boat, now: number) {
    // Turn smoothly toward the next water tile.
    let d = headingOf(s, b.heading) - b.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    b.heading += d * 0.08;
    const sailing = s.leg !== 'moored';
    // Tied up, it lies alongside the end of the pier rather than on top of it.
    const side = sailing ? 0 : 0.42;
    const x = s.x + 0.5 + Math.cos(b.heading) * side, z = s.y + 0.5 - Math.sin(b.heading) * side;
    b.g.position.set(x, SEA + Math.sin(now * 1.6 + s.id) * 0.025, z);
    b.g.rotation.set(Math.sin(now * 1.3 + s.id) * 0.04, b.heading, Math.sin(now * 1.1) * (sailing ? 0.05 : 0.02));
    b.people.visible = s.crew > 0;
    b.load.visible = Object.values(s.cargo).some((n) => n > 0);
    b.sail.scale.y = sailing ? 1 : 0.3; // furled up to the yard at the dock
    b.sail.position.y = sailing ? 0.72 : 0.91;
  }
}

// Which way the ship faces: toward the next tile on its way, or as it was.
function headingOf(s: Ship, was: number) {
  const n = s.path[0];
  if (!n || Math.hypot(n.x - s.x, n.y - s.y) < 1e-3) return was;
  return Math.atan2(n.x - s.x, n.y - s.y);
}

// The ship points along +z, its bow at the front.
function makeShip(): Boat {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(0.46, 0.16, 1.0), HULL, 0, 0.04, -0.05);
  add(g, new THREE.CylinderGeometry(0, 0.23, 0.36, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.48, 1), HULL, 0, 0.06, 0.62);
  add(g, new THREE.BoxGeometry(0.48, 0.03, 1.02), STRIPE, 0, 0.11, -0.05);
  add(g, new THREE.BoxGeometry(0.4, 0.02, 0.96), DECK, 0, 0.13, -0.05);
  add(g, new THREE.BoxGeometry(0.42, 0.12, 0.2), HULL, 0, 0.18, -0.48); // the stern cabin
  add(g, new THREE.CylinderGeometry(0.025, 0.03, 1.0, 6), MAST, 0, 0.62, 0.08);
  add(g, new THREE.BoxGeometry(0.62, 0.025, 0.025), MAST, 0, 0.98, 0.1);
  const sail = add(g, new THREE.BoxGeometry(0.58, 0.5, 0.02), SAIL, 0, 0.72, 0.12);
  const people = new THREE.Group(), load = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group();
    p.position.set(i % 2 ? 0.1 : -0.1, 0.14, -0.28 + Math.floor(i / 2) * 0.62);
    add(p, new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6), COATS[i % COATS.length], 0, 0.06, 0);
    add(p, new THREE.SphereGeometry(0.035, 6, 5), '#e8b88f', 0, 0.15, 0);
    people.add(p);
  }
  crate(load, -0.08, 0.14, -0.05, 0.11);
  crate(load, 0.09, 0.14, -0.1, 0.1);
  crate(load, 0.0, 0.25, -0.07, 0.09);
  g.add(people, load);
  mergeModel(g, [people, load, sail]);
  g.scale.setScalar(SCALE);
  return { g, people, load, sail, heading: 0 };
}
