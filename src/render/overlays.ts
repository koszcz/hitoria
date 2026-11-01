// What the player is pointing at or doing: hover and selection rings, work radius circles,
// and a see-through ghost of the building being placed, with a farm's fields.
import * as THREE from 'three';
import { Game, BDEFS, BType, FARM_FIELDS } from '../game';
import type { P } from '../path';
import { ghostify, makeBuilding } from './buildings';
import { SEA, Terrain } from './terrain';

export interface View {
  hover: P | null;
  placing: BType | null;
  placeOk: boolean;
  tool: 'remove' | null;
  fields: P[]; // fields the farm being placed would take
  selected: number;
}

export class Overlays {
  private hoverFill: THREE.Mesh;
  private hoverRing: THREE.LineLoop;
  private selRing: THREE.LineLoop;
  private selRadius: THREE.LineLoop;
  private placeRadius: THREE.LineLoop;
  private ghosts = new Map<BType, THREE.Group>();
  private fieldFills: THREE.Mesh[];

  constructor(private scene: THREE.Scene, private ground: Terrain) {
    const tileFill = (color?: string) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      geo.setIndex([0, 2, 1, 0, 3, 2]);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.hoverFill = tileFill();
    this.fieldFills = Array.from({ length: FARM_FIELDS }, () => tileFill('#c98a4a'));
    const loop = (color: string, n: number) => {
      const l = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      l.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    };
    this.hoverRing = loop('#ffffff', 4);
    this.selRing = loop('#ffe27a', 4);
    this.selRadius = loop('#ffffff', 96);
    this.placeRadius = loop('#ffffff', 96);
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
    for (const o of [this.hoverFill, this.hoverRing, this.selRing, this.selRadius, this.placeRadius]) o.visible = false;
    for (const o of [...this.ghosts.values(), ...this.fieldFills]) o.visible = false;
    const world = game.world;

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
        view.fields.forEach((p, i) => this.fieldFills[i] && this.tileOutline(this.fieldFills[i], p.x, p.y, 0.03));
      }
    } else {
      (this.hoverRing.material as THREE.LineBasicMaterial).color.set(view.tool === 'remove' ? '#ff6a5a' : '#ffffff');
      this.tileOutline(this.hoverRing, hv.x, hv.y);
    }
  }
}
