"use client";

// 조명 연습실 three.js 씬. store를 구독해 바뀐 것만 반영하고, 필요할 때만 그린다.
// - 렌더: requestRender()가 다음 rAF 한 번으로 묶는다. 정지 상태에서는 0프레임.
// - 그림자: autoUpdate를 끄고 위치·조준이 바뀔 때만 다시 계산한다(밝기·색만 바뀌면 그대로).
// - 조작 중에는 픽셀 비율을 1로 낮추고, 드래그 중 그림자는 4프레임에 한 번만 갱신한다.

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type Quality, type Tier, TIERS, effectiveTier, nextTier, shadowFixtureIds } from "./quality";
import { buildBeamGeometry, createBeamMaterial } from "./scene/beam";
import { disposeGroup } from "./scene/dispose";
import { buildFixtureBodyGeometry } from "./scene/fixtureBody";
import { buildMannequinGeometry, mannequinBox } from "./scene/mannequin";
import { PropLayer } from "./scene/props";
import { buildStage } from "./scene/stage";
import { type Actor, type Fixture, type FixtureLevel, type LookState, type Show, type Vec3, levelOf } from "./show";
import { type Store, diffShow } from "./store";

export type ViewMode = "edit" | "audience" | "top";
export type Pick = { type: "prop" | "actor" | "fixture" | "aim"; id: string } | null;

export type SceneApi = {
  requestRender(): void;
  applyLook(look: LookState, shadows: boolean): void;
  setView(v: ViewMode): void;
  setWorkLight(on: boolean): void;
  setQuality(q: Quality): void;
  setSelected(id: string | null): void;
  pick(clientX: number, clientY: number): Pick;
  floorPoint(clientX: number, clientY: number): Vec3 | null;
  previewEntity(id: string, pos: Vec3): void;
  previewAim(fixtureId: string, target: Vec3): void;
  beginInteraction(): void;
  endInteraction(): void;
  onTierChange(fn: (t: Tier) => void): void;
};

type StageStats = { renders: number; shadowUpdates: number; frameMs: number[] };
declare global {
  interface Window {
    __stageStats?: StageStats;
  }
}

const CANDELA = 600; // 밝기 1일 때 광도
const MAX_DPR = 2;
const RESTORE_MS = 150;
const DRAG_SHADOW_EVERY = 4;
const HANDLE_RADIUS = 0.4;
const DEG = Math.PI / 180;

type FixtureView = { fixture: Fixture; light: THREE.SpotLight; beam: THREE.Mesh; body: THREE.Mesh; level: FixtureLevel };
type ActorView = { actor: Actor; key: string; mesh: THREE.Mesh; materials: THREE.MeshStandardMaterial[] };

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_MIN = new THREE.Vector3(-0.5, 0, -0.5);
const UNIT_MAX = new THREE.Vector3(0.5, 1, 0.5);
const CENTER_MIN = new THREE.Vector3(-0.5, -0.5, -0.5);
const CENTER_MAX = new THREE.Vector3(0.5, 0.5, 0.5);

const actorKey = (a: Actor) => `${a.height}|${a.build}|${a.pose}`;

export function useStageScene(
  containerRef: RefObject<HTMLDivElement | null>,
  store: Store,
  onError: (msg: string) => void,
): RefObject<SceneApi | null> {
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
      onErrorRef.current("이 브라우저에서 3D 화면을 열지 못했어요.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const stats: StageStats | null =
      process.env.NODE_ENV !== "production" ? { renders: 0, shadowUpdates: 0, frameMs: [] } : null;
    if (stats) window.__stageStats = stats;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050507");
    const workLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    scene.add(workLight);

    let show: Show = store.get();
    let shadowsPending = true;

    // ── 카메라 ──
    const edit = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    const audience = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const top = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    top.up.set(0, 0, -1);
    const controls = {
      edit: new OrbitControls(edit, renderer.domElement),
      audience: new OrbitControls(audience, renderer.domElement),
      top: new OrbitControls(top, renderer.domElement),
    };
    for (const c of Object.values(controls)) {
      c.enableDamping = true;
      c.dampingFactor = 0.1;
    }
    controls.edit.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.edit.minDistance = 2;
    controls.edit.maxDistance = 60;
    controls.audience.enablePan = false;
    controls.audience.minAzimuthAngle = -25 * DEG;
    controls.audience.maxAzimuthAngle = 25 * DEG;
    controls.audience.minPolarAngle = 75 * DEG;
    controls.audience.maxPolarAngle = 95 * DEG;
    controls.top.enableRotate = false;
    controls.top.screenSpacePanning = true;
    let view: ViewMode = "edit";
    const activeCamera = (): THREE.Camera => (view === "edit" ? edit : view === "audience" ? audience : top);

    function placeCameras(resetEdit: boolean) {
      const d = show.stage.depth;
      if (resetEdit) {
        edit.position.set(0, 9, d + 8);
        controls.edit.target.set(0, 1, -d / 2);
      }
      audience.position.set(0, 1.2, d);
      controls.audience.target.set(0, 1, -d / 2);
      const dist = audience.position.distanceTo(controls.audience.target);
      controls.audience.minDistance = dist * 0.6;
      controls.audience.maxDistance = dist * 1.2;
      top.position.set(0, 30, -d / 2 + 1);
      controls.top.target.set(0, 0, -d / 2 + 1);
      top.zoom = 1;
      fitTop();
      for (const c of Object.values(controls)) c.update();
    }

    function fitTop() {
      const { width: w, depth: d } = show.stage;
      const rect = container!.getBoundingClientRect();
      const aspect = rect.width / Math.max(1, rect.height);
      const halfH = Math.max((d * 1.4 + 4) / 2, (w + 4) / 2 / aspect);
      top.left = -halfH * aspect;
      top.right = halfH * aspect;
      top.top = halfH;
      top.bottom = -halfH;
      top.updateProjectionMatrix();
    }

    // ── 무대·소품 ──
    let stageGroup = buildStage(show.stage);
    scene.add(stageGroup);
    const propLayer = new PropLayer();
    scene.add(propLayer.group);
    propLayer.sync(show.props);

    // ── 인물 ──
    const actors = new Map<string, ActorView>();
    function placeActor(v: ActorView) {
      v.mesh.position.set(v.actor.position.x, v.actor.position.y, v.actor.position.z);
      v.mesh.rotation.y = v.actor.rotationY;
      v.materials[0].color.setStyle(v.actor.clothColor);
      v.materials[1].color.setStyle(v.actor.skinColor);
    }
    function addActor(a: Actor) {
      const materials = [
        new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
        new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }),
      ];
      const mesh = new THREE.Mesh(buildMannequinGeometry(a.height, a.build, a.pose), materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const v: ActorView = { actor: a, key: actorKey(a), mesh, materials };
      placeActor(v);
      scene.add(mesh);
      actors.set(a.id, v);
    }
    function removeActor(id: string) {
      const v = actors.get(id);
      if (!v) return;
      scene.remove(v.mesh);
      v.mesh.geometry.dispose();
      for (const m of v.materials) m.dispose();
      actors.delete(id);
    }
    for (const a of show.actors) addActor(a);

    // ── 조명기 ──
    let tier: Tier = 0;
    let autoTier: Tier = 0;
    let quality: Quality = "auto";
    let beamGeometry = buildBeamGeometry(TIERS[0].segments);
    const bodyGeometry = buildFixtureBodyGeometry();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.5, metalness: 0.6 });
    const bodySelected = new THREE.MeshStandardMaterial({
      color: "#2a2a2e",
      emissive: "#ffd23f",
      emissiveIntensity: 0.6,
    });
    const fixtures = new Map<string, FixtureView>();
    const tmpDir = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();

    function applyLevel(v: FixtureView, level: FixtureLevel, haze: number) {
      v.level = level;
      const p = v.fixture.position;
      const { light, beam, body } = v;
      light.position.set(p.x, p.y, p.z);
      light.intensity = level.intensity * CANDELA;
      light.color.setStyle(level.color);
      light.angle = (level.beamAngle / 2) * DEG;
      light.penumbra = level.softness;
      light.target.position.set(level.target.x, level.target.y, level.target.z);
      light.target.updateMatrixWorld();
      tmpDir.set(level.target.x - p.x, level.target.y - p.y, level.target.z - p.z);
      const dist = Math.max(0.1, tmpDir.length());
      tmpQ.setFromUnitVectors(DOWN, tmpDir.normalize());
      body.position.set(p.x, p.y, p.z);
      body.quaternion.copy(tmpQ);
      const len = dist + 1;
      const r = len * Math.tan(light.angle);
      beam.position.set(p.x, p.y, p.z);
      beam.quaternion.copy(tmpQ);
      beam.scale.set(r, len, r);
      const u = (beam.material as THREE.ShaderMaterial).uniforms;
      u.uColor.value.setStyle(level.color);
      u.uIntensity.value = level.intensity;
      u.uHaze.value = haze;
      u.uSoftness.value = level.softness;
      beam.visible = haze > 0 && level.intensity > 0;
    }

    function addFixture(f: Fixture) {
      const light = new THREE.SpotLight(0xffffff, 0, 0, 0.5, 0.5, 2);
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 40;
      light.shadow.bias = -0.0005;
      scene.add(light, light.target);
      const beam = new THREE.Mesh(beamGeometry, createBeamMaterial());
      beam.frustumCulled = false;
      beam.renderOrder = 10;
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      scene.add(beam, body);
      const v: FixtureView = { fixture: f, light, beam, body, level: levelOf(show.live, f) };
      fixtures.set(f.id, v);
      applyLevel(v, v.level, show.live.haze);
    }
    function removeFixture(id: string) {
      const v = fixtures.get(id);
      if (!v) return;
      scene.remove(v.light, v.light.target, v.beam, v.body);
      v.light.shadow.map?.dispose();
      v.light.dispose();
      (v.beam.material as THREE.Material).dispose();
      fixtures.delete(id);
    }
    for (const f of show.fixtures) addFixture(f);

    function applyShadows() {
      const ids = new Set(shadowFixtureIds(show.fixtures, TIERS[tier].shadows));
      for (const [id, v] of fixtures) {
        const on = ids.has(id);
        if (v.light.castShadow !== on) {
          v.light.castShadow = on;
          if (!on) {
            v.light.shadow.map?.dispose();
            v.light.shadow.map = null;
          }
        }
      }
      shadowsPending = true;
    }

    // ── 선택 표시 ──
    const ringMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2), ringMat);
    ring.visible = false;
    const handleMat = new THREE.MeshBasicMaterial({ color: "#ffd23f", toneMapped: false, side: THREE.DoubleSide });
    const handle = new THREE.Group();
    handle.add(
      new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 32).rotateX(-Math.PI / 2), handleMat),
      new THREE.Mesh(new THREE.CircleGeometry(0.06, 16).rotateX(-Math.PI / 2), handleMat),
    );
    handle.visible = false;
    const aimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: "#ffd23f", dashSize: 0.2, gapSize: 0.15, toneMapped: false }),
    );
    aimLine.visible = false;
    scene.add(ring, handle, aimLine);
    let selectedId: string | null = null;

    function updateSelection() {
      ring.visible = false;
      handle.visible = false;
      aimLine.visible = false;
      for (const v of fixtures.values()) v.body.material = bodyMaterial;
      if (!selectedId) return;
      const prop = show.props.find((p) => p.id === selectedId);
      const actorView = actors.get(selectedId);
      const fx = fixtures.get(selectedId);
      if (prop) {
        ring.visible = true;
        ring.position.set(prop.position.x, 0.01, prop.position.z);
        ring.scale.setScalar(Math.hypot(prop.scale.x, prop.scale.z) / 2 + 0.15);
      } else if (actorView) {
        const b = mannequinBox(actorView.actor.height, actorView.actor.build, actorView.actor.pose);
        ring.visible = true;
        ring.position.set(actorView.mesh.position.x, 0.01, actorView.mesh.position.z);
        ring.scale.setScalar(Math.max(b.x, b.z) / 2 + 0.15);
      } else if (fx) {
        fx.body.material = bodySelected;
        const t = fx.level.target;
        handle.visible = true;
        handle.position.set(t.x, 0.02, t.z);
        const pos = aimLine.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, fx.fixture.position.x, fx.fixture.position.y, fx.fixture.position.z);
        pos.setXYZ(1, t.x, t.y, t.z);
        pos.needsUpdate = true;
        aimLine.geometry.computeBoundingSphere();
        aimLine.computeLineDistances();
        aimLine.visible = true;
      }
    }

    // ── 렌더 루프 ──
    let frameReq = 0;
    let interacting = false;
    let interactFrames = 0;
    let lastFrame = 0;
    let frameTimes: number[] = [];
    let restoreTimer = 0;
    const tierListeners = new Set<(t: Tier) => void>();

    function requestRender() {
      if (!frameReq) frameReq = requestAnimationFrame(frame);
    }

    function frame(now: number) {
      frameReq = 0;
      const moving = controls[view].update();
      if (interacting) {
        if (lastFrame) {
          frameTimes.push(now - lastFrame);
          if (frameTimes.length > 30) frameTimes = frameTimes.slice(-30);
          const next = nextTier(autoTier, frameTimes);
          if (next !== autoTier) {
            autoTier = next;
            frameTimes = [];
            applyTier();
          }
        }
        lastFrame = now;
        interactFrames += 1;
      }
      if (shadowsPending && (!interacting || interactFrames % DRAG_SHADOW_EVERY === 0)) {
        renderer.shadowMap.needsUpdate = true;
        shadowsPending = false;
        if (stats) stats.shadowUpdates += 1;
      }
      const t0 = performance.now();
      renderer.render(scene, activeCamera());
      if (stats) {
        stats.renders += 1;
        stats.frameMs.push(performance.now() - t0);
        if (stats.frameMs.length > 60) stats.frameMs.splice(0, stats.frameMs.length - 60);
      }
      if (moving || interacting) requestRender();
    }

    function applyTier() {
      const t = effectiveTier(quality, autoTier);
      if (t === tier) return;
      const segChanged = TIERS[t].segments !== TIERS[tier].segments;
      tier = t;
      if (segChanged) {
        const old = beamGeometry;
        beamGeometry = buildBeamGeometry(TIERS[t].segments);
        for (const v of fixtures.values()) v.beam.geometry = beamGeometry;
        old.dispose();
      }
      applyShadows();
      for (const fn of tierListeners) fn(t);
      requestRender();
    }

    function beginInteraction() {
      window.clearTimeout(restoreTimer);
      if (!interacting) {
        interacting = true;
        interactFrames = 0;
        lastFrame = 0;
        frameTimes = [];
        renderer.setPixelRatio(1);
      }
      requestRender();
    }

    function endInteraction() {
      if (!interacting) return;
      interacting = false;
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
        requestRender();
      }, RESTORE_MS);
      requestRender();
    }

    for (const c of Object.values(controls)) {
      c.addEventListener("change", requestRender);
      c.addEventListener("start", beginInteraction);
      c.addEventListener("end", endInteraction);
    }

    // ── store 동기화 ──
    function sync(prev: Show, next: Show) {
      show = next;
      const d = diffShow(prev, next);
      if (d.stage) {
        scene.remove(stageGroup);
        disposeGroup(stageGroup);
        stageGroup = buildStage(next.stage);
        scene.add(stageGroup);
        if (prev.stage.depth !== next.stage.depth || prev.stage.width !== next.stage.width) placeCameras(false);
      }
      if (d.props.added.length + d.props.changed.length + d.props.removed.length > 0) propLayer.sync(next.props);
      for (const id of d.actors.removed) removeActor(id);
      for (const a of next.actors) {
        const v = actors.get(a.id);
        if (!v) addActor(a);
        else if (v.actor !== a) {
          if (v.key !== actorKey(a)) {
            v.mesh.geometry.dispose();
            v.mesh.geometry = buildMannequinGeometry(a.height, a.build, a.pose);
            v.key = actorKey(a);
          }
          v.actor = a;
          placeActor(v);
        }
      }
      for (const id of d.fixtures.removed) removeFixture(id);
      for (const id of d.fixtures.added) addFixture(next.fixtures.find((f) => f.id === id)!);
      const fixtureChanged = d.fixtures.added.length + d.fixtures.removed.length + d.fixtures.changed.length > 0;
      for (const id of d.fixtures.changed) {
        const v = fixtures.get(id);
        if (v) v.fixture = next.fixtures.find((f) => f.id === id)!;
      }
      const touched = new Set([...d.levels, ...d.fixtures.changed]);
      for (const [id, v] of fixtures) {
        if (d.haze || touched.has(id)) applyLevel(v, levelOf(next.live, v.fixture), next.live.haze);
      }
      if (fixtureChanged) applyShadows();
      if (d.shadowsDirty) shadowsPending = true;
      updateSelection();
      requestRender();
    }
    let prevShow = show;
    const unsubscribe = store.subscribe(() => {
      const next = store.get();
      if (next === prevShow) return;
      const p = prevShow;
      prevShow = next;
      sync(p, next);
    });

    // ── 피킹 ──
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tmpM = new THREE.Matrix4();
    const tmpInv = new THREE.Matrix4();
    const tmpRay = new THREE.Ray();
    const tmpHit = new THREE.Vector3();
    const tmpBox = new THREE.Box3();
    const tmpPos = new THREE.Vector3();
    const tmpScale = new THREE.Vector3();

    function setRay(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, activeCamera());
    }

    function hitBox(pos: Vec3, rotY: number, size: Vec3, centered: boolean): number | null {
      tmpPos.set(pos.x, pos.y, pos.z);
      tmpQ.setFromAxisAngle(UP, rotY);
      tmpScale.set(Math.max(size.x, 0.2), Math.max(size.y, 0.2), Math.max(size.z, 0.2));
      tmpM.compose(tmpPos, tmpQ, tmpScale);
      tmpInv.copy(tmpM).invert();
      tmpRay.copy(raycaster.ray).applyMatrix4(tmpInv);
      tmpBox.set(centered ? CENTER_MIN : UNIT_MIN, centered ? CENTER_MAX : UNIT_MAX);
      if (!tmpRay.intersectBox(tmpBox, tmpHit)) return null;
      return tmpHit.applyMatrix4(tmpM).distanceTo(raycaster.ray.origin);
    }

    function floorPointRaw(): Vec3 | null {
      const { origin: o, direction: dir } = raycaster.ray;
      if (dir.y >= 0) return null;
      const t = -o.y / dir.y;
      return { x: o.x + dir.x * t, y: 0, z: o.z + dir.z * t };
    }

    function pick(clientX: number, clientY: number): Pick {
      setRay(clientX, clientY);
      const sel = selectedId ? fixtures.get(selectedId) : undefined;
      if (sel) {
        const fp = floorPointRaw();
        const t = sel.level.target;
        if (fp && Math.hypot(fp.x - t.x, fp.z - t.z) < HANDLE_RADIUS) return { type: "aim", id: sel.fixture.id };
      }
      let best: Pick = null;
      let bestD = Infinity;
      const consider = (type: "prop" | "actor" | "fixture", id: string, d: number | null) => {
        if (d !== null && d < bestD) {
          bestD = d;
          best = { type, id };
        }
      };
      for (const p of show.props) consider("prop", p.id, hitBox(p.position, p.rotationY, p.scale, false));
      for (const v of actors.values()) {
        const a = v.actor;
        consider("actor", a.id, hitBox(a.position, a.rotationY, mannequinBox(a.height, a.build, a.pose), false));
      }
      for (const v of fixtures.values()) {
        consider("fixture", v.fixture.id, hitBox(v.fixture.position, 0, { x: 0.5, y: 0.5, z: 0.5 }, true));
      }
      return best;
    }

    // ── API ──
    const api: SceneApi = {
      requestRender,
      applyLook(look, shadows) {
        for (const v of fixtures.values()) applyLevel(v, levelOf(look, v.fixture), look.haze);
        if (shadows) shadowsPending = true;
        updateSelection();
        requestRender();
      },
      setView(v) {
        if (v === view) return;
        controls[view].enabled = false;
        view = v;
        controls[view].enabled = true;
        requestRender();
      },
      setWorkLight(on) {
        workLight.visible = on;
        requestRender();
      },
      setQuality(q) {
        quality = q;
        applyTier();
      },
      setSelected(id) {
        selectedId = id;
        updateSelection();
        requestRender();
      },
      pick,
      floorPoint(clientX, clientY) {
        setRay(clientX, clientY);
        return floorPointRaw();
      },
      previewEntity(id, pos) {
        const prop = show.props.find((p) => p.id === id);
        if (prop) propLayer.setTransform(id, pos, prop.rotationY);
        const v = actors.get(id);
        if (v) v.mesh.position.set(pos.x, pos.y, pos.z);
        if (selectedId === id) ring.position.set(pos.x, 0.01, pos.z);
        shadowsPending = true;
        requestRender();
      },
      previewAim(fixtureId, target) {
        const v = fixtures.get(fixtureId);
        if (!v) return;
        applyLevel(v, { ...v.level, target }, show.live.haze);
        updateSelection();
        shadowsPending = true;
        requestRender();
      },
      beginInteraction,
      endInteraction,
      onTierChange(fn) {
        tierListeners.add(fn);
      },
    };
    apiRef.current = api;

    // ── 크기 ──
    function resize() {
      const rect = container!.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setSize(w, h);
      edit.aspect = audience.aspect = w / h;
      edit.updateProjectionMatrix();
      audience.updateProjectionMatrix();
      fitTop();
      requestRender();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.audience.enabled = false;
    controls.top.enabled = false;
    resize();
    placeCameras(true);
    applyShadows();
    requestRender();

    return () => {
      apiRef.current = null;
      unsubscribe();
      observer.disconnect();
      cancelAnimationFrame(frameReq);
      window.clearTimeout(restoreTimer);
      for (const c of Object.values(controls)) c.dispose();
      for (const id of [...fixtures.keys()]) removeFixture(id);
      for (const id of [...actors.keys()]) removeActor(id);
      disposeGroup(stageGroup);
      propLayer.dispose();
      beamGeometry.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      bodySelected.dispose();
      disposeGroup(handle);
      disposeGroup(ring);
      disposeGroup(aimLine);
      renderer.dispose();
      renderer.domElement.remove();
      if (stats && window.__stageStats === stats) delete window.__stageStats;
    };
  }, [containerRef, store]);

  return apiRef;
}
