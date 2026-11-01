// An empty bowl that bobs over each hut whose worker is hungry, so you see at a glance who needs food.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Game } from '../game';
import { piece } from './kit';
import type { Terrain } from './terrain';

const MAX = 200; // bowls drawn at most
const LIFT = 1.5; // how high over the ground the bowl floats

function bowl() {
  return mergeGeometries([
    piece(new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#f2e6cf', 0, 0.14, 0),
    piece(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 12), '#8a5a36', 0, 0.135, 0), // the empty inside
    piece(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 10), '#e0d2b6', 0, -0.03, 0),
    piece(new THREE.BoxGeometry(0.025, 0.3, 0.02).rotateZ(-0.5), '#c8c8c8', 0.2, 0.2, 0), // a spoon
  ]);
}

export class HungerMarks {
  private mesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();

  constructor(scene: THREE.Scene, private ground: Terrain) {
    this.mesh = new THREE.InstancedMesh(bowl(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: '#3a2a10', emissiveIntensity: 0.4 }), MAX);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  draw(game: Game, now: number) {
    let n = 0;
    for (const b of game.buildings.values()) {
      if (!b.hungry || !b.worker || n >= MAX) continue;
      const bob = Math.sin(now * 3 + b.id) * 0.06;
      const y = this.ground.heightAt(b.x + 0.5, b.y + 0.5) + LIFT + bob;
      this.m.makeRotationY(Math.PI / 4).setPosition(b.x + 0.5, y, b.y + 0.5);
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
