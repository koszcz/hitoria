// Harbour boats: the small boat a harbour built, tied up across the end of its pier, bobbing on the water.
import * as THREE from 'three';
import { hasBoat, type Game } from '../game';
import { add } from './kit';
import { disposeModel, mergeModel } from './merge';
import { SEA } from './terrain';

const HULL = '#7a5532', INSIDE = '#a5804f', TRIM = '#3d6a5a', OAR = '#c9a46a', MAST = '#4e3420', SAIL = '#efe6cf';
const SCALE = 1.4; // drawn larger than true scale, like the ships, so you can spot it
const PAST_DOCK = 0.75; // how far past the end of the pier the boat lies, in tiles

export class HarbourBoats {
  private boats = new Map<number, THREE.Group>();

  constructor(private scene: THREE.Scene) {}

  draw(game: Game, now: number) {
    const seen = new Set<number>();
    for (const b of game.buildings.values()) {
      if (b.type !== 'harbour' || !hasBoat(b)) continue;
      const dock = game.dock(b);
      if (!dock) continue;
      seen.add(b.id);
      let m = this.boats.get(b.id);
      if (!m) {
        m = makeBoat();
        this.boats.set(b.id, m);
        this.scene.add(m);
      }
      const dx = dock.x - b.x, dz = dock.y - b.y, len = Math.hypot(dx, dz) || 1;
      const x = dock.x + 0.5 + (dx / len) * PAST_DOCK, z = dock.y + 0.5 + (dz / len) * PAST_DOCK;
      m.position.set(x, SEA + Math.sin(now * 1.8 + b.id) * 0.02, z);
      // Across the end of the pier, rocking gently.
      m.rotation.set(Math.sin(now * 1.4 + b.id) * 0.05, Math.atan2(dx, dz) + Math.PI / 2, Math.sin(now * 1.2 + b.id) * 0.04);
    }
    for (const [id, m] of this.boats)
      if (!seen.has(id)) {
        this.drop(m);
        this.boats.delete(id);
      }
  }

  clear() {
    for (const m of this.boats.values()) this.drop(m);
    this.boats.clear();
  }

  private drop(m: THREE.Group) {
    this.scene.remove(m);
    disposeModel(m);
  }
}

// A small open boat with a bench, two oars and a short mast with its sail furled. It points along +z.
function makeBoat() {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(0.26, 0.1, 0.5), HULL, 0, 0.03, -0.03);
  add(g, new THREE.CylinderGeometry(0, 0.13, 0.2, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.55, 1), HULL, 0, 0.04, 0.32);
  add(g, new THREE.BoxGeometry(0.28, 0.025, 0.52), TRIM, 0, 0.08, -0.03);
  add(g, new THREE.BoxGeometry(0.2, 0.02, 0.44), INSIDE, 0, 0.075, -0.03);
  add(g, new THREE.BoxGeometry(0.22, 0.02, 0.06), INSIDE, 0, 0.1, -0.08); // the bench
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.02, 0.015, 0.4).rotateY(s * 0.15), OAR, s * 0.07, 0.11, -0.05);
  add(g, new THREE.CylinderGeometry(0.014, 0.018, 0.42, 6), MAST, 0, 0.3, 0.1);
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6).rotateZ(Math.PI / 2), SAIL, 0, 0.44, 0.11); // the furled sail
  mergeModel(g, []);
  g.scale.setScalar(SCALE);
  return g;
}
