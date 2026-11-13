// 무대 형태별 바닥·배경막·객석 바닥. 좌표 규약은 show.ts 머리말을 따른다.
import * as THREE from "three";
import type { Stage } from "../show";

export { disposeGroup } from "./dispose";

const DECK = 0.6; // 무대 높이(객석 바닥 기준)

function mat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
}

function deckBox(w: number, d: number, cx: number, cz: number, m: THREE.Material): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, DECK, d);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(cx, -DECK / 2, cz);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export function buildStage(stage: Stage): THREE.Group {
  const { width: w, depth: d, height: h } = stage;
  const group = new THREE.Group();
  const floor = mat(stage.floorColor);

  if (stage.shape === "round") {
    const r = Math.min(w, d) / 2;
    const g = new THREE.CylinderGeometry(r, r, DECK, 64);
    const disc = new THREE.Mesh(g, floor);
    disc.position.set(0, -DECK / 2, -d / 2);
    disc.receiveShadow = true;
    disc.castShadow = true;
    group.add(disc);
  } else {
    group.add(deckBox(w, d, 0, -d / 2, floor));
    if (stage.shape === "thrust") group.add(deckBox(w / 2, d * 0.4, 0, d * 0.2, floor));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, h + 1), mat(stage.backdropColor));
    back.position.set(0, (h + 1) / 2, -d - 0.05);
    back.receiveShadow = true;
    group.add(back);
  }

  return group;
}

/** 드래그 범위: 무대 바닥 바깥으로 2m까지. */
export function stageBounds(stage: Stage): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const { width: w, depth: d } = stage;
  if (stage.shape === "round") {
    const r = Math.min(w, d) / 2 + 2;
    return { minX: -r, maxX: r, minZ: -d / 2 - r, maxZ: -d / 2 + r };
  }
  const front = stage.shape === "thrust" ? d * 0.4 : 0;
  return { minX: -w / 2 - 2, maxX: w / 2 + 2, minZ: -d - 2, maxZ: front + 2 };
}
