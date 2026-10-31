// Goods lying at buildings or carried by settlers. Each good is one instanced mesh,
// refilled every frame: call `start`, then `put` for each good, then `finish`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Good, GOODS, bag } from '../game';
import { piece } from './kit';

const MAX = 4000; // goods of one kind drawn at most

function goodGeometry(): Record<Good, THREE.BufferGeometry> {
  return {
    log: mergeGeometries([
      piece(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 7).rotateZ(Math.PI / 2), '#7a4a24', 0, 0, 0),
      piece(new THREE.CylinderGeometry(0.03, 0.03, 0.205, 7).rotateZ(Math.PI / 2), '#e0bf8a', 0, 0, 0),
    ]),
    plank: mergeGeometries([
      piece(new THREE.BoxGeometry(0.2, 0.025, 0.08), '#e0bb84', 0, 0, 0),
      piece(new THREE.BoxGeometry(0.2, 0.025, 0.08), '#cfa56c', 0.01, 0.026, 0.005),
    ]),
    stone: piece(new THREE.DodecahedronGeometry(0.055, 0), '#a8a69e', 0, 0, 0),
    fish: mergeGeometries([
      piece(new THREE.SphereGeometry(0.045, 8, 6).scale(1.9, 0.6, 0.75), '#8fb6c8', 0, 0, 0),
      piece(new THREE.ConeGeometry(0.035, 0.05, 4).rotateZ(Math.PI / 2), '#6f98ad', -0.1, 0, 0),
    ]),
    grain: mergeGeometries([
      piece(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 7), '#d8b84a', 0, 0.04, 0),
      piece(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 7), '#8a5a2a', 0, 0.03, 0),
      piece(new THREE.SphereGeometry(0.05, 7, 5), '#e8c860', 0, 0.12, 0),
    ]),
    flour: mergeGeometries([
      piece(new THREE.SphereGeometry(0.065, 8, 6).scale(1, 0.9, 1), '#f3eee2', 0, 0.02, 0),
      piece(new THREE.CylinderGeometry(0.02, 0.03, 0.04, 6), '#e2d8c0', 0, 0.09, 0),
      piece(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 6), '#a07a4a', 0, 0.075, 0),
    ]),
    water: mergeGeometries([
      piece(new THREE.CylinderGeometry(0.045, 0.036, 0.08, 9), '#8a6238', 0, 0.02, 0),
      piece(new THREE.CylinderGeometry(0.04, 0.04, 0.005, 9), '#4a8ab0', 0, 0.058, 0),
      piece(new THREE.TorusGeometry(0.045, 0.004, 4, 10, Math.PI), '#5a5048', 0, 0.06, 0),
    ]),
    bread: mergeGeometries([
      piece(new THREE.SphereGeometry(0.06, 8, 6).scale(1.5, 0.6, 0.9), '#b8732e', 0, 0, 0),
      piece(new THREE.BoxGeometry(0.012, 0.01, 0.06), '#e8c080', -0.03, 0.035, 0),
      piece(new THREE.BoxGeometry(0.012, 0.01, 0.06), '#e8c080', 0.03, 0.035, 0),
    ]),
    coal: mergeGeometries([
      piece(new THREE.DodecahedronGeometry(0.04, 0), '#242222', -0.025, 0, 0),
      piece(new THREE.DodecahedronGeometry(0.035, 0), '#1a1818', 0.03, 0, 0.01),
      piece(new THREE.DodecahedronGeometry(0.03, 0), '#2e2b2a', 0, 0.04, -0.005),
    ]),
    ore: mergeGeometries([
      piece(new THREE.DodecahedronGeometry(0.055, 0), '#8a4a30', 0, 0, 0),
      piece(new THREE.DodecahedronGeometry(0.02, 0), '#c8763e', 0.035, 0.03, 0.02),
    ]),
  };
}

export class Goods {
  private meshes = {} as Record<Good, THREE.InstancedMesh>;
  private n = bag();
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene) {
    const geo = goodGeometry();
    for (const g of GOODS) {
      const m = new THREE.InstancedMesh(geo[g], new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), MAX);
      m.castShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      this.meshes[g] = m;
    }
  }

  start() {
    this.n = bag();
  }

  put(g: Good, x: number, y: number, z: number, rot: number) {
    const n = this.n[g]++;
    if (n >= MAX) return;
    this.e.set(0, rot, 0);
    this.m4.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e), this.s);
    this.meshes[g].setMatrixAt(n, this.m4);
  }

  finish() {
    for (const g of GOODS) {
      this.meshes[g].count = this.n[g];
      this.meshes[g].instanceMatrix.needsUpdate = true;
    }
  }
}
