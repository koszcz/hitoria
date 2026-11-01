// The geologist's signs on the mountains. Each sign shows what lies below: a grey stone for stone,
// or a lump of coal and a lump of iron ore. A rich spot gets a gold sign with a gold knob on top.
import * as THREE from 'three';
import type { Game } from '../game';
import { W } from '../world';
import { add } from './kit';
import { disposeModel, mergeModel } from './merge';
import type { Terrain } from './terrain';

export class Signs {
  private group = new THREE.Group();
  private key = -1;
  private of: Uint8Array | null = null; // the signs of the game last drawn

  constructor(private scene: THREE.Scene, private ground: Terrain) {
    scene.add(this.group);
  }

  draw(game: Game) {
    if (game.signed === this.key && game.signs === this.of) return;
    this.key = game.signed;
    this.of = game.signs;
    this.scene.remove(this.group);
    disposeModel(this.group);
    const g = (this.group = new THREE.Group());
    game.signs.forEach((s, i) => {
      if (!s) return;
      const x = i % W, y = (i / W) | 0;
      if (game.world.at(x, y).t !== 'mountain') return;
      const rich = game.rich[i] === 1;
      const ore = game.world.hasOre(x, y);
      const sign = new THREE.Group();
      sign.position.set(x + 0.5, this.ground.heightAt(x + 0.5, y + 0.5), y + 0.5);
      sign.rotation.y = Math.PI / 4; // face the camera
      add(sign, new THREE.BoxGeometry(0.03, 0.4, 0.03), '#6b4a28', 0, 0.2, 0);
      if (rich) add(sign, new THREE.BoxGeometry(0.28, 0.17, 0.02), '#ffc820', 0, 0.36, 0.016, { emissive: '#c08000', emissiveIntensity: 0.5 });
      else add(sign, new THREE.BoxGeometry(0.24, 0.14, 0.02), '#e8e0cc', 0, 0.36, 0.016);
      const lumps: [string, number][] = ore ? [['#1a1818', -0.05], ['#b0502a', 0.05]] : [['#7a766c', 0]];
      for (const [c, dx] of lumps) add(sign, new THREE.DodecahedronGeometry(0.035, 0), c, dx, 0.36, 0.04);
      if (rich) add(sign, new THREE.OctahedronGeometry(0.06, 0), '#ffd84a', 0, 0.52, 0, { emissive: '#c08000', emissiveIntensity: 0.8 });
      g.add(sign);
    });
    mergeModel(g, []);
    this.scene.add(g);
  }
}
