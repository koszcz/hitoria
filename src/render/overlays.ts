// What the player is pointing at or doing: hover and selection rings, work radius circles,
// the planned road, and a see-through ghost of the building being placed.
import * as THREE from 'three';
import { Game, BDEFS, BType } from '../game';
import type { P } from '../path';
import { smoothPath } from '../curve';
import { ghostify, makeBuilding, makeFlag } from './buildings';
import { SEA, Terrain } from './terrain';

export interface View {
  hover: P | null;
  placing: BType | null;
  placeOk: boolean;
  tool: 'road' | 'remove' | null;
  roadFrom: number; // flag a road is being drawn from
  preview: P[] | null; // planned road under the cursor
  selected: number;
}

export class Overlays {
  private hoverFill: THREE.Mesh;
  private hoverRing: THREE.LineLoop;
  private selRing: THREE.LineLoop;
  private fromRing: THREE.LineLoop;
  private selRadius: THREE.LineLoop;
  private placeRadius: THREE.LineLoop;
  private preview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#fff5c8', dashSize: 0.2, gapSize: 0.14 }));
  private previewOf: P[] | null = null;
  private ghosts = new Map<BType, THREE.Group>();
  private ghostFlag: THREE.Group;

  constructor(private scene: THREE.Scene, private ground: Terrain) {
    scene.add(this.preview);
    const tileGeo = new THREE.BufferGeometry();
    tileGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    tileGeo.setIndex([0, 2, 1, 0, 3, 2]);
    this.hoverFill = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const loop = (color: string, n: number) => {
      const l = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      l.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    };
    this.hoverRing = loop('#ffffff', 4);
    this.selRing = loop('#ffe27a', 4);
    this.fromRing = loop('#ffe27a', 4);
    this.selRadius = loop('#ffffff', 96);
    this.placeRadius = loop('#ffffff', 96);
    this.hoverFill.frustumCulled = false;
    scene.add(this.hoverFill);

    this.ghostFlag = makeFlag().g;
    ghostify(this.ghostFlag);
    scene.add(this.ghostFlag);
  }

  private tileOutline(line: THREE.LineLoop | THREE.Mesh, x: number, y: number, lift = 0.04) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].forEach(([cx, cy], i) => a.setXYZ(i, cx, this.ground.heightAt(cx, cy) + lift, cy));
    a.needsUpdate = true;
    line.visible = true;
  }

  private circle(line: THREE.LineLoop, x: number, y: number, r: number) {
    const a = line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2, px = x + 0.5 + Math.cos(t) * r, pz = y + 0.5 + Math.sin(t) * r;
      a.setXYZ(i, px, Math.max(SEA, this.ground.heightAt(px, pz)) + 0.05, pz);
    }
    a.needsUpdate = true;
    line.visible = true;
  }

  draw(game: Game, view: View) {
    const height = (x: number, y: number) => this.ground.heightAt(x, y);
    for (const o of [this.hoverFill, this.hoverRing, this.selRing, this.fromRing, this.selRadius, this.placeRadius, this.ghostFlag]) o.visible = false;
    for (const g of this.ghosts.values()) g.visible = false;
    const world = game.world;

    const from = view.tool === 'road' && view.roadFrom ? game.flags.get(view.roadFrom) : null;
    if (from) this.tileOutline(this.fromRing, from.x, from.y);
    const path = from ? view.preview : null;
    if (path !== this.previewOf) {
      this.previewOf = path;
      const g = new THREE.BufferGeometry();
      if (path) g.setFromPoints(smoothPath(path).map((p) => new THREE.Vector3(p.x + 0.5, height(p.x + 0.5, p.y + 0.5) + 0.08, p.y + 0.5)));
      this.preview.geometry.dispose();
      this.preview.geometry = g;
      // A geometry without points has no position attribute, which computeLineDistances needs.
      if (path) this.preview.computeLineDistances();
    }
    this.preview.visible = !!path;

    const sel = game.buildings.get(view.selected);
    if (sel) {
      this.tileOutline(this.selRing, sel.x, sel.y);
      const r = BDEFS[sel.type].radius;
      if (r && sel.type !== 'hq') this.circle(this.selRadius, sel.x, sel.y, r);
    }

    const hv = view.hover;
    if (!hv || !world.inside(hv.x, hv.y)) return;
    if (view.placing) {
      this.tileOutline(this.hoverFill, hv.x, hv.y, 0.03);
      (this.hoverFill.material as THREE.MeshBasicMaterial).color.set(view.placeOk ? '#78ff8c' : '#ff5a50');
      const r = BDEFS[view.placing].radius;
      if (r) this.circle(this.placeRadius, hv.x, hv.y, r);
      if (view.placeOk) {
        let ghost = this.ghosts.get(view.placing);
        if (!ghost) {
          ghost = makeBuilding(view.placing, true).g;
          ghostify(ghost);
          ghost.traverse((o) => { if ((o as THREE.Sprite).isSprite) o.visible = false; });
          this.ghosts.set(view.placing, ghost);
          this.scene.add(ghost);
        }
        ghost.position.set(hv.x + 0.5, height(hv.x + 0.5, hv.y + 0.5), hv.y + 0.5);
        ghost.visible = true;
        this.ghostFlag.position.set(hv.x + 0.5, height(hv.x + 0.5, hv.y + 1.5), hv.y + 1.5);
        this.ghostFlag.visible = true;
      }
    } else {
      (this.hoverRing.material as THREE.LineBasicMaterial).color.set(view.tool === 'remove' ? '#ff6a5a' : '#ffffff');
      this.tileOutline(this.hoverRing, hv.x, hv.y);
    }
  }
}
