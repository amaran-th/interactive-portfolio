"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { type Board, type Change, type ChipShape, BACK, DEFAULT_SHAPE, EMPTY } from "./board";
import { type Point, boardSize, cellCenter } from "./layout";
import { CHIP_RADIUS, chipOutline } from "./shapes";

const CHIP_THICKNESS = 0.06;
const CHIP_Y = CHIP_THICKNESS / 2;
const FOV = 35;
const TILT = THREE.MathUtils.degToRad(25);
const MAX_ZOOM = 8;
const FLIP_MS = 200;
const REMOVE_MS = 150;
const PLACE_MS = 150;
const FLIP_LIFT = 0.08;
const DROP_HEIGHT = 0.15;
const BACKGROUND = "#d9f0ff";
// 평면 PNG: 칩 하나당 픽셀 수와 긴 변 상한
const EXPORT_PX_PER_CHIP = 40;
const EXPORT_MAX_PX = 4096;

export type SceneApi = {
  setBoard(b: Board): void;
  animateChanges(changes: Change[], delayOf?: (c: Change, i: number) => number): void;
  setColors(front: string, back: string, base: string): void;
  setShape(shape: ChipShape): void;
  boardPoint(clientX: number, clientY: number): Point | null;
  zoomAt(clientX: number, clientY: number, factor: number): void;
  panBy(dx: number, dy: number): void;
  fit(): void;
  exportPng(): Promise<Blob | null>;
};

type Anim = {
  index: number;
  kind: "flip" | "remove" | "place";
  fromAngle: number;
  start: number;
  dur: number;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// 칩 하나의 형상. 재질 그룹 순서는 옆면(0), 윗면=앞면(1), 아랫면=뒷면(2)으로 맞춘다.
function chipGeometry(shape: ChipShape): THREE.BufferGeometry {
  // 원은 옆면 법선이 매끄러운 원기둥을 그대로 쓴다(그룹 순서도 같다)
  if (shape === "circle")
    return new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_THICKNESS, 48);
  const outline = new THREE.Shape(chipOutline(shape).map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(outline, { depth: CHIP_THICKNESS, bevelEnabled: false });
  // ExtrudeGeometry 그룹: [뚜껑(아랫면 z=0 → 윗면 z=depth 순), 옆면]
  const [lids, sides] = g.groups;
  const half = lids.count / 2;
  g.clearGroups();
  g.addGroup(sides.start, sides.count, 0);
  g.addGroup(lids.start + half, half, 1);
  g.addGroup(lids.start, half, 2);
  // 돌출 방향 +Z를 위(+Y)로 세우고 두께 가운데를 원점에 둔다
  g.rotateX(-Math.PI / 2);
  g.translate(0, -CHIP_THICKNESS / 2, 0);
  return g;
}

// three.js 장면을 container 안에 만들고, 조작용 API를 ref로 돌려준다.
// 칩 전체가 InstancedMesh 하나이고, 애니메이션 중인 칩만 매 프레임 행렬을 고친다.
// WebGL을 쓸 수 없으면 장면을 만들지 않고 onError를 부른다.
export function useChipScene(
  containerRef: RefObject<HTMLDivElement | null>,
  onError?: () => void,
) {
  const apiRef = useRef<SceneApi | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onErrorRef.current?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(-3, 8, 4);
    scene.add(light);

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);
    const target = new THREE.Vector3();
    let fitDistance = 10;
    let zoom = 1;

    let geometry = chipGeometry(DEFAULT_SHAPE);
    const chipMaterial = () => new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.35 });
    // 재질 순서: 옆면, 윗면(앞면), 아랫면(뒷면) — chipGeometry가 그룹을 이 순서로 맞춘다
    const sideMat = chipMaterial();
    const frontMat = chipMaterial();
    const backMat = chipMaterial();
    const baseMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    const baseMesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(
      new THREE.PlaneGeometry(1, 1),
      baseMat,
    );
    baseMesh.rotation.x = -Math.PI / 2;
    scene.add(baseMesh);
    let chips: THREE.InstancedMesh | null = null;
    let board: Board | null = null;
    const anims = new Map<number, Anim>();
    let needsRender = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();

    function setChipMatrix(i: number, angle: number, lift: number, s: number) {
      const b = board!;
      const c = cellCenter(i % b.w, Math.floor(i / b.w), b.w, b.h);
      pos.set(c.x, CHIP_Y + lift, c.y);
      euler.set(angle, 0, 0);
      quat.setFromEuler(euler);
      scale.setScalar(s);
      matrix.compose(pos, quat, scale);
      chips!.setMatrixAt(i, matrix);
    }

    function restMatrix(i: number) {
      const s = board!.cells[i];
      setChipMatrix(i, s === BACK ? Math.PI : 0, 0, s === EMPTY ? 0 : 1);
    }

    // 판 바닥은 무늬 없는 단색이다 — 칩을 빼면 흔적 없이 바닥만 보인다.
    function sizeBase(b: Board) {
      const { width, height } = boardSize(b.w, b.h);
      baseMesh.scale.set(width + 1, height + 1, 1);
    }

    function updateCamera() {
      const dist = fitDistance / zoom;
      camera.position.set(target.x, dist * Math.cos(TILT), target.z + dist * Math.sin(TILT));
      camera.lookAt(target);
      camera.updateMatrixWorld();
      needsRender = true;
    }

    function fit() {
      if (!board) return;
      const { width, height } = boardSize(board.w, board.h);
      const half = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
      fitDistance = Math.max((height + 1) / (2 * half), (width + 1) / (2 * half * camera.aspect)) * 1.05;
      zoom = 1;
      target.set(0, 0, 0);
      updateCamera();
    }

    function clampTarget() {
      if (!board) return;
      const { width, height } = boardSize(board.w, board.h);
      target.x = clamp(target.x, -width / 2, width / 2);
      target.z = clamp(target.z, -height / 2, height / 2);
    }

    const raycaster = new THREE.Raycaster();
    const chipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CHIP_Y);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    // 화면 좌표 → 칩 높이 평면 위의 점(layout 좌표). 지평선 위라 만나지 않으면 null.
    function boardPoint(clientX: number, clientY: number): Point | null {
      const r = renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(chipPlane, hit) ? { x: hit.x, y: hit.z } : null;
    }

    // 포인터 아래 지점이 그대로 머물도록 확대한다.
    function zoomAt(clientX: number, clientY: number, factor: number) {
      const before = boardPoint(clientX, clientY);
      zoom = clamp(zoom * factor, 1, MAX_ZOOM);
      updateCamera();
      const after = boardPoint(clientX, clientY);
      if (before && after) {
        target.x += before.x - after.x;
        target.z += before.y - after.y;
      }
      clampTarget();
      updateCamera();
    }

    function panBy(dx: number, dy: number) {
      const h = renderer.domElement.clientHeight || 1;
      const dist = fitDistance / zoom;
      const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV) / 2)) / h;
      target.x -= dx * worldPerPx;
      target.z -= (dy * worldPerPx) / Math.cos(TILT);
      clampTarget();
      updateCamera();
    }

    function setBoard(b: Board) {
      board = b;
      anims.clear();
      const n = b.w * b.h;
      if (!chips || chips.count !== n) {
        if (chips) {
          scene.remove(chips);
          chips.dispose();
        }
        chips = new THREE.InstancedMesh(geometry, [sideMat, frontMat, backMat], n);
        chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // 인스턴스 하나의 경계로 판 전체를 잘라 내지 않도록 끈다
        chips.frustumCulled = false;
        scene.add(chips);
      }
      for (let i = 0; i < n; i++) restMatrix(i);
      chips.instanceMatrix.needsUpdate = true;
      sizeBase(b);
      needsRender = true;
    }

    function animateChanges(changes: Change[], delayOf: (c: Change, i: number) => number = () => 0) {
      if (!board || !chips) return;
      const now = performance.now();
      changes.forEach((c, i) => {
        if (reduceMotion) {
          anims.delete(c.index);
          restMatrix(c.index);
          return;
        }
        const kind = c.after === EMPTY ? "remove" : c.before === EMPTY ? "place" : "flip";
        const fromAngle = c.before === BACK ? Math.PI : 0;
        const dur = kind === "flip" ? FLIP_MS : kind === "remove" ? REMOVE_MS : PLACE_MS;
        anims.set(c.index, { index: c.index, kind, fromAngle, start: now + delayOf(c, i), dur });
        // 차례가 올 때까지는 바뀌기 전 모습으로 둔다
        setChipMatrix(c.index, fromAngle, 0, c.before === EMPTY ? 0 : 1);
      });
      chips.instanceMatrix.needsUpdate = true;
      needsRender = true;
    }

    function setColors(front: string, back: string, base: string) {
      baseMat.color.set(base);
      frontMat.color.set(front);
      backMat.color.set(back);
      sideMat.color.set(front).lerp(new THREE.Color(back), 0.5).multiplyScalar(0.55);
      needsRender = true;
    }

    let shape: ChipShape = DEFAULT_SHAPE;
    function setShape(next: ChipShape) {
      if (next === shape) return;
      shape = next;
      const old = geometry;
      geometry = chipGeometry(next);
      if (chips) chips.geometry = geometry;
      old.dispose();
      needsRender = true;
    }

    // 판 전체를 바로 위에서 내려다본 평면 이미지로 저장한다. 화면 캔버스 크기를 잠깐 바꿔
    // 정사영 카메라로 한 장 그리고, 같은 작업 안에서 원래대로 되돌려 화면이 깜빡이지 않는다.
    // (toBlob은 호출하는 순간의 캔버스 내용을 쓴다)
    function exportPng(): Promise<Blob | null> {
      if (!board) return Promise.resolve(null);
      const { width, height } = boardSize(board.w, board.h);
      // 바닥판(sizeBase)과 같은 범위 — 바깥 하늘색 배경은 담지 않는다
      const viewW = width + 1;
      const viewH = height + 1;
      const maxPx = Math.min(EXPORT_MAX_PX, renderer.capabilities.maxTextureSize);
      const ppu = Math.min(EXPORT_PX_PER_CHIP, maxPx / Math.max(viewW, viewH));
      const pxW = Math.round(viewW * ppu);
      const pxH = Math.round(viewH * ppu);

      const ortho = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 0.1, 10);
      // 판의 아래쪽(+Z, layout y)이 이미지 아래로 가도록 위쪽을 -Z로 둔다
      ortho.up.set(0, 0, -1);
      ortho.position.set(0, 5, 0);
      ortho.lookAt(0, 0, 0);
      ortho.updateMatrixWorld();

      const prevSize = renderer.getSize(new THREE.Vector2());
      const prevRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(pxW, pxH, false);
      // 바로 위에서 보면 금속 칩에 조명이 정면으로 비쳐 색이 하얗게 날아간다. 어차피 칩 윗면은
      // 한 가지 색으로 보이므로, 저장할 때만 조명을 받지 않는 재질로 바꿔 고른 색을 그대로 담는다.
      const flat = [sideMat, frontMat, backMat, baseMat].map(
        (m) => new THREE.MeshBasicMaterial({ color: m.color }),
      );
      const chipMats = chips?.material;
      if (chips) chips.material = flat.slice(0, 3);
      baseMesh.material = flat[3];
      renderer.render(scene, ortho);
      if (chips && chipMats) chips.material = chipMats;
      baseMesh.material = baseMat;
      for (const m of flat) m.dispose();
      const blob = new Promise<Blob | null>((resolve) =>
        renderer.domElement.toBlob(resolve, "image/png"),
      );
      renderer.setPixelRatio(prevRatio);
      renderer.setSize(prevSize.x, prevSize.y, false);
      renderer.render(scene, camera);
      return blob;
    }

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (anims.size > 0 && chips && board) {
        const now = performance.now();
        for (const a of anims.values()) {
          const t = (now - a.start) / a.dur;
          if (t < 0) continue;
          if (t >= 1) {
            restMatrix(a.index);
            anims.delete(a.index);
            continue;
          }
          const k = easeOut(t);
          if (a.kind === "flip")
            setChipMatrix(a.index, a.fromAngle + Math.PI * k, Math.sin(Math.PI * t) * FLIP_LIFT, 1);
          else if (a.kind === "remove") setChipMatrix(a.index, a.fromAngle, k * DROP_HEIGHT, 1 - k);
          else setChipMatrix(a.index, 0, (1 - k) * DROP_HEIGHT, k);
        }
        chips.instanceMatrix.needsUpdate = true;
        needsRender = true;
      }
      if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    };
    raf = requestAnimationFrame(tick);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // 사용자가 확대·이동하지 않았다면 새 크기에 맞춰 다시 맞춘다
      if (zoom === 1 && target.lengthSq() === 0) fit();
      else updateCamera();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    apiRef.current = { setBoard, animateChanges, setColors, setShape, boardPoint, zoomAt, panBy, fit, exportPng };

    return () => {
      apiRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      chips?.dispose();
      geometry.dispose();
      for (const m of [sideMat, frontMat, backMat, baseMat]) m.dispose();
      baseMesh.geometry.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [containerRef]);

  return apiRef;
}
