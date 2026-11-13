// 조명기 본체: 원통 + 요크. 렌즈 쪽이 -y.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function buildFixtureBodyGeometry(): THREE.BufferGeometry {
  const can = new THREE.CylinderGeometry(0.125, 0.15, 0.4, 16).translate(0, 0.05, 0);
  const yoke = new THREE.BoxGeometry(0.36, 0.04, 0.06).translate(0, 0.3, 0);
  const armL = new THREE.BoxGeometry(0.03, 0.3, 0.06).translate(-0.17, 0.15, 0);
  const armR = new THREE.BoxGeometry(0.03, 0.3, 0.06).translate(0.17, 0.15, 0);
  return mergeGeometries([can, yoke, armL, armR])!;
}
