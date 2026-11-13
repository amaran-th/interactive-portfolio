import type * as THREE from "three";

/** 그룹 안 메시의 지오메트리·재질을 모두 dispose한다. */
export function disposeGroup(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) for (const x of mat) x.dispose();
    else if (mat) mat.dispose();
  });
}
