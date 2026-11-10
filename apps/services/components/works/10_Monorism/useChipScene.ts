"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { type Board, type Change, BACK, EMPTY } from "./board";
import { type Point, boardSize, cellCenter } from "./layout";

const CHIP_RADIUS = 0.46;
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
const BASE_COLOR = "#2b2f38";

export type SceneApi = {
  setBoard(b: Board): void;
  animateChanges(changes: Change[], delayOf?: (c: Change, i: number) => number): void;
  setColors(front: string, back: string): void;
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

    const geometry = new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_THICKNESS, 32);
    const chipMaterial = () => new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.35 });
    // CylinderGeometry 그룹 순서: 옆면, 윗면(앞면), 아랫면(뒷면)
    const sideMat = chipMaterial();
    const frontMat = chipMaterial();
    const backMat = chipMaterial();
    const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.9, metalness: 0 });
    const baseMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), baseMat);
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

    function setColors(front: string, back: string) {
      frontMat.color.set(front);
      backMat.color.set(back);
      sideMat.color.set(front).lerp(new THREE.Color(back), 0.5).multiplyScalar(0.55);
      needsRender = true;
    }

    function exportPng(): Promise<Blob | null> {
      renderer.render(scene, camera);
      return new Promise((resolve) => renderer.domElement.toBlob(resolve, "image/png"));
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

    apiRef.current = { setBoard, animateChanges, setColors, boardPoint, zoomAt, panBy, fit, exportPng };

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
