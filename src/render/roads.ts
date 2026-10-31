// Draped ribbons along each road: a dark verge under a lighter packed-earth track.
import * as THREE from 'three';
import { Game } from '../game';
import { smoothPath } from '../curve';
import { ART } from '../art';
import type { Terrain } from './terrain';

export function drawRoads(roads: THREE.Group, game: Game, ground: Terrain) {
  for (const c of roads.children) (c as THREE.Mesh).geometry.dispose();
  roads.clear();
  for (const [width, color, lift, off] of [[0.38, ART.roads[0], 0.02, -1], [0.26, ART.roads[1], 0.03, -2]] as const) {
    const pos: number[] = [], idx: number[] = [];
    for (const r of game.roads.values()) {
      // Round the corners, then add points so no step is longer than a quarter tile.
      const curve = smoothPath(r.path), pts: THREE.Vector2[] = [];
      curve.forEach((p, i) => {
        if (i) {
          const a = curve[i - 1], n = Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / 0.25);
          for (let s = 1; s < n; s++) pts.push(new THREE.Vector2(a.x + 0.5 + ((p.x - a.x) * s) / n, a.y + 0.5 + ((p.y - a.y) * s) / n));
        }
        pts.push(new THREE.Vector2(p.x + 0.5, p.y + 0.5));
      });
      const base = pos.length / 3;
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const d = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
        const nx = -d.y * width / 2, ny = d.x * width / 2;
        pos.push(p.x + nx, ground.heightAt(p.x + nx, p.y + ny) + lift, p.y + ny);
        pos.push(p.x - nx, ground.heightAt(p.x - nx, p.y - ny) + lift, p.y - ny);
        if (i) {
          const k = base + i * 2;
          idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
        }
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 1 ? [] : [pos[i] * 1.5])), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, map: ground.grain, roughness: 1, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }));
    m.receiveShadow = true;
    roads.add(m);
  }
}
