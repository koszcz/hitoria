// Snowflakes that drift down around the camera in winter.
import * as THREE from 'three';
import { hash } from './kit';
import { softDot } from './textures';

const FLAKES = 1800;
const TOP = 10; // flakes fall from this height to the ground, then start again at the top

export class Snowfall {
  private pos = new Float32Array(FLAKES * 3);
  private points: THREE.Points;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: '#ffffff', sizeAttenuation: false, map: softDot(), transparent: true, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
  }

  // `amount` from 0 to 1 sets how many flakes fall. `reach` is half the width of the view.
  draw(amount: number, centre: THREE.Vector3, reach: number, now: number, pixelRatio: number) {
    const n = Math.round(FLAKES * amount);
    this.points.visible = n > 0;
    if (!n) return;
    const box = reach * 2, p = this.pos;
    // A flake wraps around the box, so the box follows the camera with no flakes popping in.
    const wrap = (v: number, c: number) => c - reach + ((((v - c + reach) % box) + box) % box);
    for (let i = 0; i < n; i++) {
      const speed = 0.5 + hash(i, 1) * 0.4;
      const y = TOP - ((hash(i, 2) * TOP + now * speed) % TOP);
      const drift = Math.sin(now * 0.8 + i) * 0.3 + now * 0.25; // a light wind from the west
      p[i * 3] = wrap(hash(i, 3) * 200 + drift, centre.x);
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = wrap(hash(i, 4) * 200, centre.z);
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = true;
    const m = this.points.material as THREE.PointsMaterial;
    m.opacity = 0.6 + amount * 0.4;
    m.size = 4.5 * pixelRatio; // the size is in screen pixels, so sharp screens need bigger flakes
  }
}
