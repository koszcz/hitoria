// Textures drawn in code: ground grain, water ripples, soft dots and building signs.
import * as THREE from 'three';
import { ART } from '../art';
import { hash } from './kit';

// Tileable value noise, used for the ground grain and the water ripples.
export function noiseField(size: number, seed: number) {
  const out = new Float32Array(size * size);
  for (const [cells, amp] of [[8, 0.55], [32, 0.3], [128, 0.15]] as const) {
    const g = Array.from({ length: cells * cells }, (_, i) => hash(i * 1.7 + seed, seed * 3.1));
    const at = (i: number, j: number) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const s = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells, fy = (y / size) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
  }
  return out;
}

export function grainTexture() {
  const n = 256, f = noiseField(n, 7);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const k = ART.grain;
    const v = Math.max(0, Math.min(255, 215 - 40 * k + f[i] * 70 * k + (Math.random() - 0.5) * 28 * k));
    img.data.set([v, v, v, 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function rippleNormals() {
  const n = 256, f = noiseField(n, 21);
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(n, n);
  const at = (x: number, y: number) => f[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 6, dy = (at(x, y + 1) - at(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      img.data.set([(-dx / l) * 127 + 128, (-dy / l) * 127 + 128, (1 / l) * 127 + 128, 255], (y * n + x) * 4);
    }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function softDot() {
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const cx = cv.getContext('2d')!;
  const g = cx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

// A small wooden shield with the building's symbol on it, hung over finished buildings.
export function iconTexture(icon: string) {
  const n = 96, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  const shield = () => {
    cx.beginPath();
    cx.moveTo(14, 12);
    cx.lineTo(82, 12);
    cx.lineTo(82, 50);
    cx.quadraticCurveTo(82, 78, 48, 90);
    cx.quadraticCurveTo(14, 78, 14, 50);
    cx.closePath();
  };
  shield();
  const wood = cx.createLinearGradient(0, 12, 0, 90);
  wood.addColorStop(0, '#f6e6c0');
  wood.addColorStop(1, '#e2c792');
  cx.fillStyle = wood;
  cx.fill();
  cx.lineWidth = 6;
  cx.strokeStyle = '#6a4628';
  cx.stroke();
  cx.font = '40px system-ui, "Apple Color Emoji", sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  // A plain colour, not the wood gradient. Safari paints emoji in the fill, so they vanished into the wood.
  cx.fillStyle = '#000';
  cx.fillText(icon, 48, 48);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A round sign showing a road with a red bar through it, over buildings with no road to the HQ.
export function noRoadTexture() {
  const n = 96, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const cx = cv.getContext('2d')!;
  cx.beginPath();
  cx.arc(48, 48, 42, 0, Math.PI * 2);
  cx.fillStyle = '#fff8ea';
  cx.fill();
  cx.lineWidth = 8;
  cx.strokeStyle = '#d23a2a';
  cx.stroke();
  // A road running off into the distance, with a dashed middle line.
  cx.beginPath();
  cx.moveTo(30, 80);
  cx.lineTo(43, 18);
  cx.lineTo(53, 18);
  cx.lineTo(66, 80);
  cx.closePath();
  cx.fillStyle = '#9a7a52';
  cx.fill();
  cx.strokeStyle = '#fff8ea';
  cx.lineWidth = 3;
  cx.setLineDash([7, 6]);
  cx.beginPath();
  cx.moveTo(48, 78);
  cx.lineTo(48, 20);
  cx.stroke();
  cx.setLineDash([]);
  cx.lineWidth = 9;
  cx.strokeStyle = '#d23a2a';
  cx.beginPath();
  cx.moveTo(19, 77);
  cx.lineTo(77, 19);
  cx.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
