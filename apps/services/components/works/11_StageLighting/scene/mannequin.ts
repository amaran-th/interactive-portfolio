// 절차적 마네킹: 사람 모델(scene/humans.ts)을 받는 동안·받지 못했을 때 대신 그린다.
// 부위를 캡슐·구로 만들어 하나로 합친다(인물당 드로우콜 1).
// groups[0] = 옷, groups[1] = 피부(머리·목·손). 원점은 발바닥, +z가 정면.
// 자세 14가지를 뼈대 4가지(서기·앉기·팔 벌리기·걷기)로 줄여 그리고, 눕기는 서기를 바닥에 눕힌다.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Build, Pose } from "../show";

const BASE = 1.7;
const WIDTH: Record<Build, number> = { slim: 0.85, average: 1, stocky: 1.25 };

type V = [number, number, number];
type Basic = "stand" | "sit" | "armsOpen" | "walk";
const BASIC: Record<Pose, Basic> = {
  stand: "stand",
  talk: "stand",
  walk: "walk",
  formalWalk: "walk",
  run: "walk",
  sit: "sit",
  sitTalk: "sit",
  crouch: "sit",
  kneel: "sit",
  dance: "armsOpen",
  push: "walk",
  reach: "stand",
  lie: "stand",
  armsOpen: "armsOpen",
};
type Joints = { hipY: number; knee: [V, V]; ankle: [V, V]; elbow: [V, V]; wrist: [V, V] };

function joints(pose: Basic): Joints {
  switch (pose) {
    case "sit":
      return {
        hipY: 0.47,
        knee: [[-0.1, 0.47, 0.42], [0.1, 0.47, 0.42]],
        ankle: [[-0.1, 0.06, 0.45], [0.1, 0.06, 0.45]],
        elbow: [[-0.23, 0.7, 0.08], [0.23, 0.7, 0.08]],
        wrist: [[-0.2, 0.55, 0.3], [0.2, 0.55, 0.3]],
      };
    case "armsOpen":
      return {
        hipY: 0.92,
        knee: [[-0.1, 0.48, 0], [0.1, 0.48, 0]],
        ankle: [[-0.1, 0.06, 0], [0.1, 0.06, 0]],
        elbow: [[-0.5, 1.42, 0], [0.5, 1.42, 0]],
        wrist: [[-0.78, 1.42, 0], [0.78, 1.42, 0]],
      };
    case "walk":
      return {
        hipY: 0.92,
        knee: [[-0.1, 0.5, 0.15], [0.1, 0.49, -0.06]],
        ankle: [[-0.1, 0.06, 0.28], [0.1, 0.1, -0.22]],
        elbow: [[-0.23, 1.14, -0.08], [0.23, 1.14, 0.1]],
        wrist: [[-0.24, 0.9, -0.15], [0.24, 0.9, 0.2]],
      };
    case "stand":
      return {
        hipY: 0.92,
        knee: [[-0.1, 0.48, 0], [0.1, 0.48, 0]],
        ankle: [[-0.1, 0.06, 0], [0.1, 0.06, 0]],
        elbow: [[-0.24, 1.13, 0], [0.24, 1.13, 0]],
        wrist: [[-0.25, 0.86, 0], [0.25, 0.86, 0]],
      };
  }
}

const UP = new THREE.Vector3(0, 1, 0);

function limb(a: V, b: V, r: number): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = Math.max(0.001, dir.length());
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const mid = va.add(vb).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
}

function ball(c: V, r: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 16, 12).translate(...c);
}

export function buildMannequinGeometry(height: number, build: Build, pose: Pose): THREE.BufferGeometry {
  const j = joints(BASIC[pose]);
  // 앉은 자세는 상체가 엉덩이 높이를 따라 내려온다.
  const top = j.hipY - 0.92;
  const shoulderY = 1.42 + top;
  const hip: [V, V] = [[-0.1, j.hipY, 0], [0.1, j.hipY, 0]];
  const shoulder: [V, V] = [[-0.21, shoulderY, 0], [0.21, shoulderY, 0]];
  const cloth: THREE.BufferGeometry[] = [
    limb([0, j.hipY + 0.08, 0], [0, j.hipY + 0.42, 0], 0.15),
    limb(hip[0], hip[1], 0.09),
    limb(shoulder[0], shoulder[1], 0.07),
  ];
  for (const s of [0, 1] as const) {
    cloth.push(limb(hip[s], j.knee[s], 0.07), limb(j.knee[s], j.ankle[s], 0.06));
    cloth.push(limb(shoulder[s], j.elbow[s], 0.05), limb(j.elbow[s], j.wrist[s], 0.042));
  }
  const skin: THREE.BufferGeometry[] = [
    limb([0, j.hipY + 0.5, 0], [0, j.hipY + 0.56, 0], 0.045),
    ball([0, j.hipY + 0.66, 0], 0.11),
    ball(j.wrist[0], 0.05),
    ball(j.wrist[1], 0.05),
  ];
  const merged = mergeGeometries([mergeGeometries(cloth)!, mergeGeometries(skin)!], true)!;
  const s = height / BASE;
  const w = s * WIDTH[build];
  merged.scale(w, s, w);
  if (pose === "lie") merged.rotateX(-Math.PI / 2).translate(0, 0.12 * s, height / 2); // 머리가 -z, 가운데 정렬
  merged.computeBoundingSphere();
  return merged;
}

/** 선택·레이캐스트에 쓰는 상자 크기(폭, 키, 두께). */
export function mannequinBox(height: number, build: Build, pose: Pose): { x: number; y: number; z: number } {
  const w = WIDTH[build];
  const b = BASIC[pose];
  const wide = b === "armsOpen" ? 1.6 : 0.6;
  if (pose === "lie") return { x: wide * w * (height / BASE), y: 0.35, z: height };
  return { x: wide * w * (height / BASE), y: b === "sit" ? height * 0.75 : height, z: (b === "sit" ? 0.7 : 0.4) * w };
}
