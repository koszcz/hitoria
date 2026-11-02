// Fish that leap out of the sea now and then with a splash, and flocks of ducks paddling
// near the shore. Ducks fly south for the winter.
import * as THREE from 'three';
import { World } from '../world';
import { landDistance } from '../water/shore';
import { SPLASH, duckAt, ducksHome, fishAt, pickSpots, type Spot } from '../water/life';
import { add, hash } from './kit';
import { disposeModel, mergeModel } from './merge';
import { SEA } from './terrain';

const FISH = 14; // fish spots on the map
const FLOCKS = 6; // duck flocks on the map
const SCALE = 1.6; // drawn larger than true scale, like the settlers, so you can spot them

interface Fish { g: THREE.Group; ring: THREE.Mesh; spot: Spot }
interface Duck { g: THREE.Group; body: THREE.Group; spot: Spot; flock: number; k: number }

export class Waterlife {
  private fish: Fish[] = [];
  private ducks: Duck[] = [];
  private ringMat = new THREE.MeshBasicMaterial({ color: '#eef6f2', transparent: true, depthWrite: false });

  constructor(private scene: THREE.Scene) {}

  // `home` is the start of the game: the fish and ducks live mostly near it, where the player looks.
  build(world: World, home: Spot) {
    this.clear();
    const { w: W, h: H } = world;
    const dist = landDistance(world, W, H);
    // Fish leap a little way out from the beach; ducks keep to calm water near it.
    for (const spot of pickSpots(dist, W, home, 2, 6, 5, FISH, 1)) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2), this.ringMat.clone());
      ring.renderOrder = 1;
      const f = { g: makeFish(), ring, spot };
      this.fish.push(f);
      this.scene.add(f.g, ring);
    }
    pickSpots(dist, W, home, 2, 4, 5, FLOCKS, 2).forEach((spot, flock) => {
      const size = 2 + Math.floor(hash(flock, 31) * 3);
      for (let k = 0; k < size; k++) {
        const d = makeDuck(k === 0 && hash(flock, 32) < 0.7);
        this.ducks.push({ ...d, spot, flock, k });
        this.scene.add(d.g);
      }
    });
  }

  draw(now: number, snow: number) {
    this.fish.forEach((f, i) => {
      const l = fishAt(f.spot, i, now);
      f.g.visible = l.air;
      if (l.air) {
        f.g.position.set(l.x, SEA + l.z, l.y);
        f.g.rotation.set(-l.pitch, l.heading, 0, 'YXZ');
      }
      f.ring.visible = l.splash >= 0;
      if (l.splash >= 0) {
        const t = l.splash / SPLASH;
        f.ring.position.set(l.sx, SEA + 0.008, l.sy);
        f.ring.scale.setScalar(0.06 + t * 0.32);
        (f.ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
      }
    });
    const home = ducksHome(snow);
    for (const d of this.ducks) {
      d.g.visible = home;
      if (!home) continue;
      const p = duckAt(d.spot, d.flock, d.k, now);
      d.g.position.set(p.x, SEA + Math.sin(now * 2.2 + d.k + d.flock) * 0.006, p.y);
      d.g.rotation.y = p.heading;
      // Dabbling: the duck tips forward, head under water and tail in the air.
      d.body.rotation.x += ((p.dabble ? 1.25 : 0) - d.body.rotation.x) * 0.15;
    }
  }

  clear() {
    for (const f of this.fish) {
      this.scene.remove(f.g, f.ring);
      f.ring.geometry.dispose();
      (f.ring.material as THREE.Material).dispose();
    }
    for (const f of this.fish) disposeModel(f.g);
    for (const d of this.ducks) {
      this.scene.remove(d.g);
      disposeModel(d.g);
    }
    this.fish = [];
    this.ducks = [];
  }
}

// A small silver fish, nose along +z.
function makeFish() {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.05, 8, 6).scale(0.55, 0.8, 1.6), '#c8d6d8', 0, 0, 0);
  add(g, new THREE.SphereGeometry(0.03, 6, 4).scale(0.5, 0.6, 1.8), '#4f6670', 0, 0.02, 0);
  add(g, new THREE.ConeGeometry(0.035, 0.06, 4).rotateX(-Math.PI / 2).scale(0.3, 1, 1), '#7d949a', 0, 0, -0.1);
  g.scale.setScalar(SCALE);
  mergeModel(g, []);
  return g;
}

// A duck, facing +z. A drake has a green head and a white collar; a hen is mottled brown.
function makeDuck(drake: boolean) {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const back = drake ? '#c4c4bc' : '#8a6a46', breast = drake ? '#7a3a24' : '#9c7a52';
  add(body, new THREE.SphereGeometry(0.06, 8, 6).scale(0.85, 0.6, 1.3), back, 0, 0.025, 0);
  add(body, new THREE.SphereGeometry(0.045, 8, 6).scale(0.9, 0.8, 0.9), breast, 0, 0.03, 0.04);
  add(body, new THREE.ConeGeometry(0.025, 0.05, 4).rotateX(-Math.PI / 2 - 0.5), drake ? '#2a2a2a' : '#6a5038', 0, 0.05, -0.08);
  if (drake) add(body, new THREE.CylinderGeometry(0.022, 0.024, 0.01, 8), '#f2f0e8', 0, 0.07, 0.06);
  add(body, new THREE.SphereGeometry(0.03, 8, 6), drake ? '#1f8a4a' : '#8a6a46', 0, 0.1, 0.065);
  add(body, new THREE.BoxGeometry(0.024, 0.01, 0.04), '#e0a83a', 0, 0.095, 0.1);
  for (const s of [-1, 1]) add(body, new THREE.SphereGeometry(0.006, 4, 3), '#141414', s * 0.024, 0.108, 0.08);
  g.scale.setScalar(SCALE);
  mergeModel(g, [body]);
  return { g, body };
}
