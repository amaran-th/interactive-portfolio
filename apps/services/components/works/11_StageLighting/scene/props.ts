// 소품: 종류별 InstancedMesh 하나에 instanceColor로 색을 넣는다(드로우콜 = 종류 수).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PROP_KINDS, type Prop, type PropKind, type Vec3 } from "../show";

const CAPACITY = 40;

function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/** 크기 1×1×1, 바닥이 y=0, x·z 가운데 정렬인 단위 지오메트리. */
function unitGeometry(kind: PropKind): THREE.BufferGeometry {
  const legs = (s: number, h: number, o: number) =>
    [-o, o].flatMap((x) => [-o, o].map((z) => box(s, h, s, x, h / 2, z)));
  switch (kind) {
    case "box":
    case "platform":
      return box(1, 1, 1, 0, 0.5, 0);
    case "pillar":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24).translate(0, 0.5, 0);
    case "chair":
      return mergeGeometries([box(1, 0.07, 1, 0, 0.5, 0), box(1, 0.5, 0.08, 0, 0.75, -0.46), ...legs(0.08, 0.5, 0.44)])!;
    case "table":
      return mergeGeometries([box(1, 0.06, 1, 0, 0.97, 0), ...legs(0.06, 0.94, 0.45)])!;
    case "stairs":
      return mergeGeometries(
        [0, 1, 2].map((i) => {
          const h = (i + 1) / 3;
          return box(1, h, 1 / 3, 0, h / 2, 0.5 - (i + 0.5) / 3);
        }),
      )!;
    case "doorframe":
      return mergeGeometries([box(0.12, 1, 1, -0.44, 0.5, 0), box(0.12, 1, 1, 0.44, 0.5, 0), box(1, 0.1, 1, 0, 0.95, 0)])!;
  }
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export class PropLayer {
  readonly group = new THREE.Group();
  private meshes = new Map<PropKind, THREE.InstancedMesh>();
  private slots = new Map<string, { kind: PropKind; index: number; scale: Vec3 }>();
  private material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, metalness: 0 });

  constructor() {
    for (const kind of PROP_KINDS) {
      const mesh = new THREE.InstancedMesh(unitGeometry(kind), this.material, CAPACITY);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.meshes.set(kind, mesh);
      this.group.add(mesh);
    }
  }

  private write(mesh: THREE.InstancedMesh, index: number, pos: Vec3, rotationY: number, scale: Vec3) {
    tmpP.set(pos.x, pos.y, pos.z);
    tmpQ.setFromAxisAngle(UP, rotationY);
    tmpS.set(scale.x, scale.y, scale.z);
    mesh.setMatrixAt(index, tmpM.compose(tmpP, tmpQ, tmpS));
    mesh.instanceMatrix.needsUpdate = true;
  }

  sync(props: Prop[]): void {
    this.slots.clear();
    const counts = new Map<PropKind, number>();
    for (const p of props) {
      const mesh = this.meshes.get(p.kind)!;
      const index = counts.get(p.kind) ?? 0;
      counts.set(p.kind, index + 1);
      this.write(mesh, index, p.position, p.rotationY, p.scale);
      mesh.setColorAt(index, tmpC.setStyle(p.color));
      this.slots.set(p.id, { kind: p.kind, index, scale: p.scale });
    }
    for (const [kind, mesh] of this.meshes) {
      mesh.count = counts.get(kind) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  setTransform(id: string, pos: Vec3, rotationY: number): void {
    const slot = this.slots.get(id);
    if (!slot) return;
    this.write(this.meshes.get(slot.kind)!, slot.index, pos, rotationY, slot.scale);
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
  }
}
