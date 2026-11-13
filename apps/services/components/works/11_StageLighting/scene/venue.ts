// 극장 공간: 계단식 객석, 벽·천장, 프로시니엄 아치, 배턴, 천장 객석등 원판.
// 모두 정적 메시 몇 개로 합쳐 드로우콜을 늘리지 않는다. 객석은 그림자를 받기만 한다.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type HangId, type Stage, type Venue, hangPoint, hangRange } from "../show";
import { HOUSE_FLOOR, riserBoxes, seatLayout, venueBox } from "../venue";
import { disposeGroup } from "./dispose";

const UP = new THREE.Vector3(0, 1, 0);

function seatGeometry(): THREE.BufferGeometry {
  // 좌석 정면이 +z. 등받이는 -z 쪽.
  return mergeGeometries([
    new THREE.BoxGeometry(0.48, 0.38, 0.4).translate(0, 0.19, 0),
    new THREE.BoxGeometry(0.5, 0.08, 0.46).translate(0, 0.42, 0.02),
    new THREE.BoxGeometry(0.5, 0.55, 0.07).translate(0, 0.72, -0.2),
  ])!;
}

function std(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });
}

export class VenueLayer {
  readonly group = new THREE.Group();
  private houseMaterial = std("#2a2a2a", { emissive: "#fff2d8", emissiveIntensity: 0 });

  build(stage: Stage, venue: Venue): void {
    this.clear();
    const box = venueBox(stage, venue);

    // 좌석
    const seats = seatLayout(venue);
    const seatMesh = new THREE.InstancedMesh(seatGeometry(), std("#6b1d24"), Math.max(1, seats.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    seats.forEach((s, i) => {
      q.setFromAxisAngle(UP, s.rotationY);
      seatMesh.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, s.y, s.z), q, one));
    });
    seatMesh.count = seats.length;
    seatMesh.receiveShadow = true;
    seatMesh.frustumCulled = false;
    this.group.add(seatMesh);

    // 계단 단: 단위 상자 하나를 좌석마다 늘려 쓴다(좌석이 수천 개여도 드로우콜 하나).
    const risers = riserBoxes(venue);
    if (risers.length > 0) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std("#26262c"), risers.length);
      const size = new THREE.Vector3();
      risers.forEach((b, i) => {
        q.setFromAxisAngle(UP, b.rotationY);
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, HOUSE_FLOOR, b.z), q, size.set(b.w, b.h, b.d)));
      });
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }

    // 벽·천장·바닥(안쪽 면)
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(box.maxX - box.minX, box.height - HOUSE_FLOOR, box.maxZ - box.minZ),
      std("#17171c", { side: THREE.BackSide }),
    );
    hall.position.set((box.minX + box.maxX) / 2, (box.height + HOUSE_FLOOR) / 2, (box.minZ + box.maxZ) / 2);
    hall.receiveShadow = true;
    this.group.add(hall);

    // 프로시니엄 아치(원형 무대에는 없다)
    if (stage.shape !== "round") {
      const w = stage.width;
      const top = box.height - stage.height;
      const parts = [
        new THREE.BoxGeometry(1.5, stage.height, 0.4).translate(-(w / 2 + 0.75), stage.height / 2, -0.3),
        new THREE.BoxGeometry(1.5, stage.height, 0.4).translate(w / 2 + 0.75, stage.height / 2, -0.3),
        new THREE.BoxGeometry(w + 3, top, 0.4).translate(0, stage.height + top / 2, -0.3),
      ];
      const arch = new THREE.Mesh(mergeGeometries(parts)!, std("#3a1418"));
      arch.receiveShadow = true;
      this.group.add(arch);
      for (const g of parts) g.dispose();
    }

    // 배턴(가로 파이프)과 붐(세로 기둥)
    const pipes: THREE.BufferGeometry[] = [];
    for (const hang of ["foh", "e1", "e2", "e3"] as HangId[]) {
      const [lo, hi] = hangRange(stage, hang);
      const p = hangPoint(stage, hang, 0);
      pipes.push(new THREE.CylinderGeometry(0.03, 0.03, hi - lo + 0.6, 8).rotateZ(Math.PI / 2).translate(0, p.y + 0.3, p.z));
    }
    for (const hang of ["boomL", "boomR"] as HangId[]) {
      const p = hangPoint(stage, hang, 0);
      pipes.push(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 8).translate(p.x, 2.3, p.z));
    }
    const pipeMesh = new THREE.Mesh(mergeGeometries(pipes)!, std("#55565c", { roughness: 0.5, metalness: 0.6 }));
    this.group.add(pipeMesh);
    for (const g of pipes) g.dispose();

    // 천장 객석등: 객석 위에 2줄 × 4개 원판
    const lamps = new THREE.InstancedMesh(new THREE.CircleGeometry(0.35, 20).rotateX(Math.PI / 2), this.houseMaterial, 8);
    const seatZ = seats.length ? seats.reduce((a, s) => a + s.z, 0) / seats.length : 4;
    let i = 0;
    for (const dz of [-2, 2]) {
      for (const fx of [-0.3, -0.1, 0.1, 0.3]) {
        const x = fx * (box.maxX - box.minX);
        lamps.setMatrixAt(i++, m.compose(new THREE.Vector3(x, box.height - 0.02, seatZ + dz), new THREE.Quaternion(), one));
      }
    }
    this.group.add(lamps);
  }

  /** 천장 원판의 밝기(0..1). 실제 빛은 씬의 객석등 광원이 맡는다. */
  setHouseLevel(v: number): void {
    this.houseMaterial.emissiveIntensity = v * 3;
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      // InstancedMesh의 인스턴스 행렬 버퍼는 geometry.dispose로 풀리지 않는다.
      if ((child as THREE.InstancedMesh).isInstancedMesh) (child as THREE.InstancedMesh).dispose();
      const mat = mesh.material as THREE.Material | undefined;
      if (mat && mat !== this.houseMaterial) mat.dispose();
    }
  }

  dispose(): void {
    this.clear();
    this.houseMaterial.dispose();
    disposeGroup(this.group);
  }
}
