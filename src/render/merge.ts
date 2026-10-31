// Joins the many small boxes a model is built from into a few meshes, so the GPU draws a
// building or a settler in a handful of calls instead of dozens.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EXTRA, vertexMat } from './kit';

// Merges every mesh under `root` that `add()` made. Parts that move on their own (`keep`) stay
// separate objects; the meshes under each of them are merged among themselves. Meshes with the
// same material settings become one mesh, with each part's colour kept as a vertex colour.
export function mergeModel(root: THREE.Object3D, keep: (THREE.Object3D | undefined)[]) {
  const anchors = new Set<THREE.Object3D>([root, ...keep.filter((k): k is THREE.Object3D => !!k)]);
  root.updateMatrixWorld(true);
  const groups = new Map<THREE.Object3D, Map<string, THREE.Mesh[]>>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || anchors.has(m)) return;
    const extra = (m.material as THREE.Material).userData[EXTRA];
    if (extra === undefined) return;
    let a = m.parent!;
    while (!anchors.has(a)) a = a.parent!;
    let byMat = groups.get(a);
    if (!byMat) groups.set(a, (byMat = new Map()));
    const list = byMat.get(extra) ?? [];
    list.push(m);
    byMat.set(extra, list);
  });

  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  for (const [anchor, byMat] of groups) {
    inv.copy(anchor.matrixWorld).invert();
    for (const [extra, list] of byMat) {
      if (list.length < 2) continue;
      const parts = list.map((m) => {
        rel.multiplyMatrices(inv, m.matrixWorld);
        const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(rel);
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        const c = (m.material as THREE.MeshStandardMaterial).color;
        const col = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      });
      const merged = new THREE.Mesh(mergeGeometries(parts)!, vertexMat(extra));
      merged.castShadow = list.some((m) => m.castShadow);
      merged.receiveShadow = list.some((m) => m.receiveShadow);
      for (const p of parts) p.dispose();
      for (const m of list) {
        const parent = m.parent;
        m.removeFromParent();
        m.geometry.dispose();
        // Anything hanging under a merged part that is not merged itself keeps its place.
        if (parent) for (const kid of [...m.children]) if (!list.includes(kid as THREE.Mesh)) parent.attach(kid);
      }
      anchor.add(merged);
    }
  }
}

// Frees the GPU buffers of a model that left the scene. Materials are shared, so they stay.
export function disposeModel(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}
