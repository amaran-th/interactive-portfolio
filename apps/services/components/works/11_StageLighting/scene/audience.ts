// 객석 관객: 좌석마다 앉은 사람. 수백 명이라 성별마다 몸체·머리카락 InstancedMesh 하나씩만 쓴다(드로우콜 4개).
// 옷·피부 색은 인스턴스 속성으로, 머리 색은 instanceColor로 사람마다 다르게 준다. 모습은 좌석 순번으로 정해져 다시 그려도 같다.
// 그림자는 드리우지도 받지도 않는다(조명 수만큼 그림자 계산이 늘어서).
// 사람 모델은 한 명에 약 1만 5천 삼각형이라(중극장 318석이면 약 500만) 최고 화질에서만 쓰고,
// 그 밖에는(화질이 내려갔거나 모델을 받는 중·실패) 약 3천 삼각형짜리 마네킹으로 앉힌다.
import * as THREE from "three";
import type { Gender, Stage, Venue } from "../show";
import { type SeatRef, audienceMember, seatLayout } from "../venue";
import type { HumanLibrary } from "./humans";
import { buildMannequinGeometry } from "./mannequin";

const UP = new THREE.Vector3(0, 1, 0);
const HAIR: Record<Gender, "long" | "parted"> = { female: "long", male: "parted" };
const BOTTOM = "#26262e";
const SHOE = "#1a1a1a";

/** 사람 재질의 관객용 변형: 피부·상의 색을 uniform 대신 인스턴스 속성(aSkin·aTop)에서 읽는다. */
function audienceMaterial(): THREE.MeshStandardMaterial {
  const uBottom = { value: new THREE.Color(BOTTOM) };
  const uShoe = { value: new THREE.Color(SHOE) };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uBottom, uShoe });
    sh.vertexShader =
      "attribute vec4 region;\nattribute vec3 aSkin;\nattribute vec3 aTop;\nvarying vec4 vRegion;\nvarying vec3 vSkin;\nvarying vec3 vTop;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvRegion = region;\nvSkin = aSkin;\nvTop = aTop;");
    sh.fragmentShader =
      "uniform vec3 uBottom;\nuniform vec3 uShoe;\nvarying vec4 vRegion;\nvarying vec3 vSkin;\nvarying vec3 vTop;\n" +
      sh.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = vSkin * vRegion.x + vTop * vRegion.y + uBottom * vRegion.z + uShoe * vRegion.w;",
      );
  };
  mat.customProgramCacheKey = () => "stage-audience";
  return mat;
}

/** 마네킹 부위 하나(상의 또는 피부)를 인스턴스 속성 색으로 칠하는 재질. */
function attrMaterial(attr: "aTop" | "aSkin"): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader =
      `attribute vec3 ${attr};\nvarying vec3 vAttr;\n` +
      sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\nvAttr = ${attr};`);
    sh.fragmentShader =
      "varying vec3 vAttr;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = vAttr;");
  };
  mat.customProgramCacheKey = () => `stage-audience-${attr}`;
  return mat;
}

export class AudienceLayer {
  readonly group = new THREE.Group();
  private bodyMat = audienceMaterial();
  private hairMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
  private mannequinMats = [attrMaterial("aTop"), attrMaterial("aSkin")];
  private detailed = true;
  private owned: THREE.BufferGeometry[] = [];
  private on = false;
  private stage: Stage | null = null;
  private venue: Venue | null = null;
  private skip: SeatRef | null = null;

  constructor(private readonly humans: HumanLibrary) {
    this.group.visible = false;
  }

  /** 켜고 끈다. 처음 켤 때 사람 모델을 받기 시작한다. */
  setEnabled(on: boolean): void {
    this.on = on;
    if (on) this.humans.ensure();
    this.rebuild();
  }

  /** 최고 화질이면 사람 모델, 아니면 마네킹. */
  setDetail(detailed: boolean): void {
    if (detailed === this.detailed) return;
    this.detailed = detailed;
    this.rebuild();
  }

  /** 객석이 바뀌거나 사람 모델을 다 받으면 다시 앉힌다. 고른 좌석(관객 시점 자리)은 비워 둔다. */
  update(stage: Stage, venue: Venue, skip: SeatRef | null): void {
    this.stage = stage;
    this.venue = venue;
    this.skip = skip;
    this.rebuild();
  }

  rebuild(): void {
    this.clear();
    this.group.visible = this.on;
    if (!this.on || !this.stage || !this.venue) return;
    const seats = seatLayout(this.stage, this.venue)
      .map((s, i) => ({ s, who: audienceMember(i) }))
      .filter(({ s }) => !(this.skip && s.blockId === this.skip.blockId && s.row === this.skip.row && s.seat === this.skip.seat));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const c = new THREE.Color();
    for (const gender of ["female", "male"] as Gender[]) {
      const parts = this.detailed ? this.humans.parts(gender, "sit", "average", HAIR[gender]) : null;
      const list = seats.filter(({ who }) => who.gender === gender);
      if (list.length === 0) continue;
      if (!parts) {
        this.addMannequins(list);
        continue;
      }
      // 공유 지오메트리에 인스턴스 속성을 붙이지 않게 복제해 쓴다
      const body = parts.body.clone();
      const skin = new Float32Array(list.length * 3);
      const top = new Float32Array(list.length * 3);
      list.forEach(({ who }, i) => {
        c.setStyle(who.skinColor).toArray(skin, i * 3);
        c.setStyle(who.topColor).toArray(top, i * 3);
      });
      body.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 3));
      body.setAttribute("aTop", new THREE.InstancedBufferAttribute(top, 3));
      this.owned.push(body);
      const bodies = new THREE.InstancedMesh(body, this.bodyMat, list.length);
      const hair = parts.hair ? new THREE.InstancedMesh(parts.hair, this.hairMat, list.length) : null;
      list.forEach(({ s, who }, i) => {
        q.setFromAxisAngle(UP, s.rotationY);
        m.compose(p.set(s.x, s.y, s.z), q, sc.setScalar(who.height / parts.modelHeight));
        bodies.setMatrixAt(i, m);
        if (hair) {
          hair.setMatrixAt(i, m);
          hair.setColorAt(i, c.setStyle(who.hairColor));
        }
      });
      for (const mesh of hair ? [bodies, hair] : [bodies]) {
        mesh.frustumCulled = false;
        this.group.add(mesh);
      }
    }
  }

  /** 마네킹은 키 1m로 만들어 사람마다 키만큼 늘린다(상의·피부 두 부위, 머리카락 없음). */
  private addMannequins(list: { s: { x: number; y: number; z: number; rotationY: number }; who: { height: number; topColor: string; skinColor: string } }[]): void {
    const g = buildMannequinGeometry(1, "average", "sit");
    const top = new Float32Array(list.length * 3);
    const skin = new Float32Array(list.length * 3);
    const c = new THREE.Color();
    list.forEach(({ who }, i) => {
      c.setStyle(who.topColor).toArray(top, i * 3);
      c.setStyle(who.skinColor).toArray(skin, i * 3);
    });
    g.setAttribute("aTop", new THREE.InstancedBufferAttribute(top, 3));
    g.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 3));
    this.owned.push(g);
    const mesh = new THREE.InstancedMesh(g, this.mannequinMats, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    list.forEach(({ s, who }, i) => {
      q.setFromAxisAngle(UP, s.rotationY);
      mesh.setMatrixAt(i, m.compose(p.set(s.x, s.y, s.z), q, sc.setScalar(who.height)));
    });
    mesh.frustumCulled = false;
    this.group.add(mesh);
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      // InstancedMesh의 인스턴스 버퍼는 geometry.dispose로 풀리지 않는다. 머리카락 지오메트리는 라이브러리 것이라 두고, 복제한 몸체만 지운다.
      (child as THREE.InstancedMesh).dispose();
    }
    for (const g of this.owned) g.dispose();
    this.owned = [];
  }

  dispose(): void {
    this.clear();
    this.bodyMat.dispose();
    this.hairMat.dispose();
    for (const m of this.mannequinMats) m.dispose();
  }
}
