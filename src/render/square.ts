// The Feast Square: a paved square with a long table, benches, a maypole, strings of bunting
// and two lanterns.
import * as THREE from 'three';
import { add, shadeOf } from './kit';

const WOOD = '#7a5530', DARK = '#5a3c22';

export function feastSquare(g: THREE.Group, wall: string, roof: string) {
  // Paving, with a border of darker stones.
  add(g, new THREE.BoxGeometry(0.92, 0.05, 0.92), shadeOf(wall, 0.78), 0, 0.0, 0);
  add(g, new THREE.BoxGeometry(0.82, 0.06, 0.82), wall, 0, 0.005, 0);
  // A long table with a white cloth, and a bench on each side.
  add(g, new THREE.BoxGeometry(0.56, 0.02, 0.16), '#f2ead8', 0.02, 0.17, 0.12);
  for (const [x, z] of [[-0.22, 0.06], [0.26, 0.06], [-0.22, 0.18], [0.26, 0.18]])
    add(g, new THREE.BoxGeometry(0.025, 0.15, 0.025), WOOD, x, 0.09, z);
  for (const z of [-0.04, 0.28]) {
    add(g, new THREE.BoxGeometry(0.54, 0.02, 0.06), WOOD, 0.02, 0.09, z);
    for (const x of [-0.2, 0.24]) add(g, new THREE.BoxGeometry(0.02, 0.08, 0.04), DARK, x, 0.045, z);
  }
  // Food on the table: a fish, a loaf and a roast.
  add(g, new THREE.SphereGeometry(0.03, 8, 6).scale(1.8, 0.6, 0.8), '#8fa6b0', -0.14, 0.195, 0.12);
  add(g, new THREE.SphereGeometry(0.035, 8, 6).scale(1.4, 0.8, 1), '#c88a44', 0.02, 0.2, 0.12);
  add(g, new THREE.SphereGeometry(0.035, 8, 6).scale(1.2, 0.8, 1), '#8a3a24', 0.17, 0.2, 0.12);
  // A maypole with a wreath at the top.
  add(g, new THREE.CylinderGeometry(0.015, 0.02, 0.95, 6), '#e8dcc0', -0.28, 0.48, -0.26);
  add(g, new THREE.TorusGeometry(0.06, 0.018, 6, 12).rotateX(Math.PI / 2), '#5f8a3a', -0.28, 0.88, -0.26);
  // Two strings of bunting from the maypole to corner posts.
  for (const [px, pz] of [[0.36, -0.32], [-0.34, 0.36]]) {
    add(g, new THREE.CylinderGeometry(0.012, 0.014, 0.6, 5), DARK, px, 0.3, pz);
    add(g, new THREE.SphereGeometry(0.035, 8, 6), '#ffd88a', px, 0.63, pz, { emissive: '#ffa040', emissiveIntensity: 0.8 });
    bunting(g, new THREE.Vector3(-0.28, 0.82, -0.26), new THREE.Vector3(px, 0.58, pz), roof);
  }
}

// A sagging string of little coloured flags from `a` to `b`.
function bunting(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, roof: string) {
  const colours = [roof, '#f0d040', '#4a8ad0', '#f2ead8'];
  const n = 7;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.08;
    const flag = add(g, new THREE.ConeGeometry(0.025, 0.06, 3).rotateX(Math.PI), colours[i % colours.length], p.x, p.y - 0.03, p.z, { side: THREE.DoubleSide });
    flag.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  }
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= 0.04;
  const len = a.distanceTo(b);
  const cord = add(g, new THREE.CylinderGeometry(0.003, 0.003, len, 3), '#d8d0c0', mid.x, mid.y, mid.z);
  cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
}
