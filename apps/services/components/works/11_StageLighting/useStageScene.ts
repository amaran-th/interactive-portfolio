"use client";

// 조명 연습실 three.js 씬. store를 구독해 바뀐 것만 반영하고, 필요할 때만 그린다.
// - 렌더: requestRender()가 다음 rAF 한 번으로 묶는다. 정지 상태에서는 0프레임.
//   객석등 페이드·헤이즈 변화·카메라 관성이 진행 중일 때만 계속 그린다.
// - 그림자: autoUpdate를 끄고 위치·조준이 바뀔 때만 다시 계산한다(밝기·색만 바뀌면 그대로).
// - 조작 중에는 픽셀 비율을 1로 낮추고, 드래그 중 그림자는 4프레임에 한 번만 갱신한다.
// - 조명기 값은 resolve()로 포커스와 큐 값을 합친 결과만 쓴다.

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { stepHaze } from "./cues";
import { type Quality, type Tier, TIERS, effectiveTier, nextTier, shadowFixtureIds } from "./quality";
import { angleBoost, buildBeamGeometry, createBeamMaterial } from "./scene/beam";
import { disposeGroup } from "./scene/dispose";
import { buildFixtureBodyGeometry } from "./scene/fixtureBody";
import { type HumanMaterial, HumanLibrary, createHumanMaterial } from "./scene/humans";
import { buildMannequinGeometry, mannequinBox } from "./scene/mannequin";
import { PropLayer } from "./scene/props";
import { buildStage } from "./scene/stage";
import { VenueLayer } from "./scene/venue";
import { type Actor, type Fixture, HANGS, type LookState, type Ray, type Resolved, type Show, type Vec3, hangPoint, hangRange, raySegment, resolve } from "./show";
import { type Store, diffShow } from "./store";
import { type SeatRef, seatView, venueBox } from "./venue";

export type ViewMode = "edit" | "audience" | "plot";
export type Pick = { type: "prop" | "actor" | "fixture" | "aim" | "line"; id: string } | null;
export type ScreenPoint = { id: string; channel: number; color: string; x: number; y: number };

export type SceneApi = {
  requestRender(): void;
  applyLook(look: LookState, shadows: boolean): void;
  setView(v: ViewMode): void;
  setWorkLight(on: boolean): void;
  setHouseLights(on: boolean): void;
  setSeat(seat: SeatRef | null): void;
  setSolo(fixtureId: string | null): void;
  setHazeTarget(target: number, immediate: boolean): void;
  onHaze(fn: (actual: number, target: number) => void): () => void;
  setQuality(q: Quality): void;
  setSelected(id: string | null): void;
  /** 3D 화면을 덮는 사이드바 크기(px). 보이는 부분 가운데에 무대가 오도록 투영 중심을 옮긴다. */
  setInset(right: number, bottom: number): void;
  pick(clientX: number, clientY: number): Pick;
  floorPoint(clientX: number, clientY: number): Vec3 | null;
  /** 화면 좌표의 포인터 광선. 조명기 몸체를 끌 때 가장 가까운 라인을 찾는 데 쓴다. */
  screenRay(clientX: number, clientY: number): Ray;
  previewEntity(id: string, pos: Vec3): void;
  previewFixture(fixtureId: string, position: Vec3): void;
  previewAim(fixtureId: string, target: Vec3): void;
  fixtureScreenPoints(): ScreenPoint[];
  onCamera(fn: () => void): () => void;
  beginInteraction(): void;
  endInteraction(): void;
  onTierChange(fn: (t: Tier) => void): void;
};

type StageStats = { renders: number; shadowUpdates: number; frameMs: number[]; hazeActual: number };
declare global {
  interface Window {
    __stageStats?: StageStats;
  }
}

const CANDELA = 600; // 디머 100%일 때 광도
const MAX_DPR = 2;
const RESTORE_MS = 150;
const DRAG_SHADOW_EVERY = 4;
const HANDLE_RADIUS = 0.4;
const HOUSE_FADE_MS = 2000;
// 잔광: 유도등·통로등처럼 늘 남아 있는 약한 빛(잔광 100%일 때 세기).
const RESIDUAL = 1.5;
// 반사광: 켜진 조명기 밝기 합(최대 6대분)에 비례하는 환경광. 무대에서 튕겨 나온 빛을 흉내 낸다.
const BOUNCE_K = 0.15;
const BOUNCE_MAX = 6;
const DEG = Math.PI / 180;

type FixtureView = { fixture: Fixture; light: THREE.SpotLight; beam: THREE.Mesh; body: THREE.Mesh; res: Resolved };
// 사람 모델이 준비되면 human(지오메트리는 라이브러리 공유), 아니면 절차적 마네킹(인물마다 지오메트리).
// box는 group 로컬 좌표의 피킹 상자.
type ActorView = {
  actor: Actor;
  key: string;
  group: THREE.Group;
  human: boolean;
  box: THREE.Box3;
  skin: HumanMaterial;
  hairMat: THREE.MeshStandardMaterial;
  mannequin: THREE.MeshStandardMaterial[];
};

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_MIN = new THREE.Vector3(-0.5, 0, -0.5);
const UNIT_MAX = new THREE.Vector3(0.5, 1, 0.5);
const CENTER_MIN = new THREE.Vector3(-0.5, -0.5, -0.5);
const CENTER_MAX = new THREE.Vector3(0.5, 0.5, 0.5);

const actorKey = (a: Actor, ready: boolean) => `${ready}|${a.gender}|${a.pose}|${a.build}|${a.hair}|${a.height}`;

export function useStageScene(
  containerRef: RefObject<HTMLDivElement | null>,
  store: Store,
  onError: (msg: string) => void,
  onNotice: (msg: string) => void,
): RefObject<SceneApi | null> {
  const apiRef = useRef<SceneApi | null>(null);
  const onErrorRef = useRef(onError);
  const onNoticeRef = useRef(onNotice);
  useEffect(() => {
    onErrorRef.current = onError;
    onNoticeRef.current = onNotice;
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

    let show: Show = store.get();
    let shadowsPending = true;

    const stats: StageStats | null =
      process.env.NODE_ENV !== "production" ? { renders: 0, shadowUpdates: 0, frameMs: [], hazeActual: show.live.haze } : null;
    if (stats) window.__stageStats = stats;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050507");
    const workLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    scene.add(workLight);
    let workLightOn = true;

    // 객석등: 광원 개수를 고정해 두고 세기만 바꾼다(셰이더 재컴파일 없음).
    const houseHemi = new THREE.HemisphereLight(0xfff4e0, 0x202020, 0);
    const houseDir = new THREE.DirectionalLight(0xfff4e0, 0);
    scene.add(houseHemi, houseDir, houseDir.target);
    let houseLevel = 0;

    // 잔광과 반사광. 광원 개수는 고정이고 세기·색만 바꾼다(셰이더 재컴파일 없음).
    const residual = new THREE.HemisphereLight(0xb0bccc, 0x2a2622, 0);
    const bounce = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
    scene.add(residual, bounce);
    let ambient = show.ambient;
    const bounceSum = new THREE.Color();
    const tmpColor = new THREE.Color();
    let houseFade: { from: number; to: number; start: number } | null = null;

    // ── 카메라 ──
    const edit = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    const audience = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    const plot = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
    plot.up.set(0, 0, -1);
    const controls = {
      edit: new OrbitControls(edit, renderer.domElement),
      audience: new OrbitControls(audience, renderer.domElement),
      plot: new OrbitControls(plot, renderer.domElement),
    };
    for (const c of Object.values(controls)) {
      c.enableDamping = true;
      c.dampingFactor = 0.1;
    }
    controls.edit.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.edit.minDistance = 2;
    controls.edit.maxDistance = 60;
    controls.audience.enablePan = false;
    controls.audience.minPolarAngle = 70 * DEG;
    controls.audience.maxPolarAngle = 100 * DEG;
    controls.plot.enableRotate = false;
    controls.plot.screenSpacePanning = true;
    let view: ViewMode = "edit";
    let seat: SeatRef | null = null;
    const activeCamera = (): THREE.Camera => (view === "edit" ? edit : view === "audience" ? audience : plot);

    function placeAudience() {
      const { eye, target } = seatView(show.stage, show.venue, seat);
      audience.position.set(eye.x, eye.y, eye.z);
      controls.audience.target.set(target.x, target.y, target.z);
      // 좌석에서 무대 쪽을 본 방위각을 기준으로 좌우 25°까지만 돌린다.
      const az = Math.atan2(eye.x - target.x, eye.z - target.z);
      controls.audience.minAzimuthAngle = az - 25 * DEG;
      controls.audience.maxAzimuthAngle = az + 25 * DEG;
      const dist = audience.position.distanceTo(controls.audience.target);
      controls.audience.minDistance = dist * 0.6;
      controls.audience.maxDistance = dist * 1.05;
      controls.audience.update();
    }

    function placeCameras(resetEdit: boolean) {
      const d = show.stage.depth;
      const box = venueBox(show.stage, show.venue);
      if (resetEdit) {
        edit.position.set(0, Math.min(box.height - 1, 8), Math.min(box.maxZ - 1.5, d + 8));
        controls.edit.target.set(0, 1, -d / 2);
      }
      placeAudience();
      plot.position.set(0, 40, -d / 2 + 1);
      controls.plot.target.set(0, 0, -d / 2 + 1);
      plot.zoom = 1;
      fitPlot();
      for (const c of Object.values(controls)) c.update();
    }

    // 사이드바가 덮는 오른쪽·아래 크기(px)
    const inset = { right: 0, bottom: 0 };
    /** 화면 크기는 그대로 두고 보는 창을 사이드바 절반만큼 밀어, 보이는 부분의 가운데가 투영 중심이 되게 한다. */
    function applyInset(w: number, h: number) {
      for (const cam of [edit, audience, plot]) {
        if (inset.right || inset.bottom) cam.setViewOffset(w, h, inset.right / 2, inset.bottom / 2, w, h);
        else cam.clearViewOffset();
      }
    }

    function fitPlot() {
      const { width: w, depth: d } = show.stage;
      const rect = container!.getBoundingClientRect();
      // 평면도는 사이드바에 가리지 않는 부분에 맞춘다.
      const vw = Math.max(1, rect.width - inset.right);
      const vh = Math.max(1, rect.height - inset.bottom);
      // 보이는 부분(vw×vh)에 무대가 들어가는 화면 1px당 크기
      const unit = Math.max((d + 7) / vh, (w + 5) / vw);
      const halfH = (Math.max(1, rect.height) * unit) / 2;
      const aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
      plot.left = -halfH * aspect;
      plot.right = halfH * aspect;
      plot.top = halfH;
      plot.bottom = -halfH;
      plot.updateProjectionMatrix();
    }

    // ── 무대·극장·소품 ──
    let stageGroup = buildStage(show.stage);
    scene.add(stageGroup);
    const venue = new VenueLayer();
    venue.build(show.stage, show.venue);
    scene.add(venue.group);
    const propLayer = new PropLayer();
    scene.add(propLayer.group);
    propLayer.sync(show.props);

    function placeHouseLight() {
      const box = venueBox(show.stage, show.venue);
      houseDir.position.set(0, box.height - 0.5, box.maxZ - 1);
      houseDir.target.position.set(0, 0, -show.stage.depth / 2);
      houseDir.target.updateMatrixWorld();
    }
    placeHouseLight();

    // ── 인물 ──
    const actors = new Map<string, ActorView>();
    const tmpSize = new THREE.Vector3();
    const humans = new HumanLibrary((state) => {
      if (state === "failed") onNoticeRef.current("사람 모델을 받지 못해 단순한 마네킹으로 그려요.");
      for (const v of actors.values()) rebuildActor(v);
      updateSelection();
      shadowsPending = true;
      requestRender();
    });
    function clearActorMeshes(v: ActorView) {
      for (const child of [...v.group.children]) {
        v.group.remove(child);
        // 사람 모델 지오메트리는 라이브러리가 함께 쓰므로 마네킹 것만 지운다.
        if (!v.human) (child as THREE.Mesh).geometry.dispose();
      }
    }
    function rebuildActor(v: ActorView) {
      const a = v.actor;
      clearActorMeshes(v);
      const parts = humans.parts(a.gender, a.pose, a.build, a.hair);
      v.human = !!parts;
      v.key = actorKey(a, !!parts);
      if (parts) {
        const body = new THREE.Mesh(parts.body, v.skin);
        v.group.add(body);
        if (parts.hair) v.group.add(new THREE.Mesh(parts.hair, v.hairMat));
        v.group.scale.setScalar(a.height / parts.modelHeight);
        v.box.copy(parts.box);
      } else {
        v.group.add(new THREE.Mesh(buildMannequinGeometry(a.height, a.build, a.pose), v.mannequin));
        v.group.scale.setScalar(1);
        const b = mannequinBox(a.height, a.build, a.pose);
        v.box.set(new THREE.Vector3(-b.x / 2, 0, -b.z / 2), new THREE.Vector3(b.x / 2, b.y, b.z / 2));
      }
      v.group.traverse((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
      });
    }
    function placeActor(v: ActorView) {
      const a = v.actor;
      v.group.position.set(a.position.x, a.position.y, a.position.z);
      v.group.rotation.y = a.rotationY;
      v.group.updateMatrixWorld();
      v.skin.setColors(a.skinColor, a.topColor, a.bottomColor, a.shoeColor);
      v.hairMat.color.setStyle(a.hairColor);
      v.mannequin[0].color.setStyle(a.topColor);
      v.mannequin[1].color.setStyle(a.skinColor);
    }
    function addActor(a: Actor) {
      humans.ensure();
      const v: ActorView = {
        actor: a,
        key: "",
        group: new THREE.Group(),
        human: false,
        box: new THREE.Box3(),
        skin: createHumanMaterial(),
        hairMat: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }),
        mannequin: [
          new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
          new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }),
        ],
      };
      rebuildActor(v);
      placeActor(v);
      scene.add(v.group);
      actors.set(a.id, v);
    }
    function removeActor(id: string) {
      const v = actors.get(id);
      if (!v) return;
      scene.remove(v.group);
      clearActorMeshes(v);
      v.skin.dispose();
      v.hairMat.dispose();
      for (const m of v.mannequin) m.dispose();
      actors.delete(id);
    }
    for (const a of show.actors) addActor(a);

    // ── 조명기 ──
    let tier: Tier = 0;
    let autoTier: Tier = 0;
    let quality: Quality = "auto";
    let hazeTarget = show.live.haze;
    let hazeActual = show.live.haze;
    let hazeLast = 0;
    let soloId: string | null = null;
    let currentLook: LookState = show.live;
    let beamGeometry = buildBeamGeometry(TIERS[0].segments);
    const bodyGeometry = buildFixtureBodyGeometry();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.5, metalness: 0.6 });
    const bodySelected = new THREE.MeshStandardMaterial({ color: "#2a2a2e", emissive: "#ffd23f", emissiveIntensity: 0.6 });
    const fixtures = new Map<string, FixtureView>();
    const tmpDir = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();

    function beamVisible(v: FixtureView): boolean {
      return view !== "plot" && hazeActual > 0 && v.res.intensity > 0;
    }

    function draw(v: FixtureView) {
      const r = v.res;
      const p = r.position;
      const { light, beam, body } = v;
      light.position.set(p.x, p.y, p.z);
      light.intensity = r.intensity * CANDELA;
      light.color.setStyle(r.color);
      light.angle = (r.beamAngle / 2) * DEG;
      light.penumbra = r.softness;
      light.target.position.set(r.target.x, r.target.y, r.target.z);
      light.target.updateMatrixWorld();
      tmpDir.set(r.target.x - p.x, r.target.y - p.y, r.target.z - p.z);
      const dist = Math.max(0.1, tmpDir.length());
      tmpQ.setFromUnitVectors(DOWN, tmpDir.normalize());
      body.position.set(p.x, p.y, p.z);
      body.quaternion.copy(tmpQ);
      const len = dist + 1;
      const rad = len * Math.tan(light.angle);
      beam.position.set(p.x, p.y, p.z);
      beam.quaternion.copy(tmpQ);
      beam.scale.set(rad, len, rad);
      const u = (beam.material as THREE.ShaderMaterial).uniforms;
      u.uColor.value.setStyle(r.color);
      u.uIntensity.value = r.intensity;
      u.uHaze.value = hazeActual;
      u.uSoftness.value = r.softness;
      u.uLightPos.value.set(p.x, p.y, p.z);
      u.uAngleBoost.value = angleBoost(r.beamAngle);
      beam.visible = beamVisible(v);
    }

    /** 포커스·큐 값·솔로를 합쳐 조명기 하나를 다시 계산한다. */
    function apply(v: FixtureView, look: LookState) {
      const r = resolve(show.stage, v.fixture, look.levels[v.fixture.id]);
      v.res = soloId ? { ...r, intensity: v.fixture.id === soloId ? 1 : 0 } : r;
      draw(v);
    }

    function applyAll(look: LookState) {
      currentLook = look;
      for (const v of fixtures.values()) apply(v, look);
      updateAmbient();
    }

    /** 켜진 조명기의 밝기·색을 합쳐 반사광을 정한다. 바닥에서 올라오는 빛이라 아래쪽 색이 더 진하다. */
    function updateAmbient() {
      // 어두운 빛은 세기만큼 어둡게 느껴지지 않아서, 슬라이더 값에 제곱근을 씌운다(30% → 세기 약 55%).
      residual.intensity = RESIDUAL * Math.sqrt(ambient);
      let w = 0;
      bounceSum.setRGB(0, 0, 0);
      for (const v of fixtures.values()) {
        const i = v.res.intensity;
        if (i <= 0) continue;
        tmpColor.setStyle(v.res.color);
        bounceSum.r += tmpColor.r * i;
        bounceSum.g += tmpColor.g * i;
        bounceSum.b += tmpColor.b * i;
        w += i;
      }
      if (w > 0) {
        bounce.groundColor.setRGB(bounceSum.r / w, bounceSum.g / w, bounceSum.b / w);
        bounce.color.copy(bounce.groundColor).multiplyScalar(0.4);
      }
      bounce.intensity = ambient * BOUNCE_K * Math.min(w, BOUNCE_MAX);
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
      const v: FixtureView = { fixture: f, light, beam, body, res: resolve(show.stage, f, undefined) };
      fixtures.set(f.id, v);
      apply(v, currentLook);
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
    updateAmbient();

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

    function refreshViewState() {
      workLight.visible = workLightOn || view === "plot";
      for (const v of fixtures.values()) v.beam.visible = beamVisible(v);
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
        ring.position.set(prop.position.x, prop.position.y + 0.01, prop.position.z);
        ring.scale.setScalar(Math.hypot(prop.scale.x, prop.scale.z) / 2 + 0.15);
      } else if (actorView) {
        const size = actorView.box.getSize(tmpSize).multiplyScalar(actorView.group.scale.x);
        ring.visible = true;
        ring.position.set(actorView.group.position.x, actorView.group.position.y + 0.01, actorView.group.position.z);
        ring.scale.setScalar(Math.max(size.x, size.z) / 2 + 0.15);
      } else if (fx) {
        fx.body.material = bodySelected;
        const t = fx.res.target;
        const p = fx.res.position;
        handle.visible = true;
        handle.position.set(t.x, 0.02, t.z);
        const pos = aimLine.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, p.x, p.y, p.z);
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
    let cameraMoved = true;
    const tierListeners = new Set<(t: Tier) => void>();
    const hazeListeners = new Set<(actual: number, target: number) => void>();
    const cameraListeners = new Set<() => void>();

    function requestRender() {
      if (!frameReq) frameReq = requestAnimationFrame(frame);
    }

    function setBeamHaze() {
      for (const v of fixtures.values()) {
        (v.beam.material as THREE.ShaderMaterial).uniforms.uHaze.value = hazeActual;
        v.beam.visible = beamVisible(v);
      }
      for (const fn of hazeListeners) fn(hazeActual, hazeTarget);
      if (stats) stats.hazeActual = hazeActual;
    }

    function stepAnimations(now: number): boolean {
      let busy = false;
      if (houseFade) {
        const t = Math.min(1, (now - houseFade.start) / HOUSE_FADE_MS);
        houseLevel = houseFade.from + (houseFade.to - houseFade.from) * t;
        houseHemi.intensity = 1.2 * houseLevel;
        houseDir.intensity = 0.8 * houseLevel;
        venue.setHouseLevel(houseLevel);
        if (t >= 1) houseFade = null;
        else busy = true;
      }
      if (hazeActual !== hazeTarget) {
        const dt = hazeLast ? Math.min(0.1, (now - hazeLast) / 1000) : 0;
        hazeLast = now;
        hazeActual = stepHaze(hazeActual, hazeTarget, dt);
        setBeamHaze();
        if (hazeActual !== hazeTarget) busy = true;
        else hazeLast = 0;
      }
      return busy;
    }

    function frame(now: number) {
      frameReq = 0;
      const moving = controls[view].update();
      const animating = stepAnimations(now);
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
      if (moving || cameraMoved) {
        cameraMoved = false;
        for (const fn of cameraListeners) fn();
      }
      if (moving || interacting || animating) requestRender();
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

    const onControlsChange = () => {
      cameraMoved = true;
      requestRender();
    };
    for (const c of Object.values(controls)) {
      c.addEventListener("change", onControlsChange);
      c.addEventListener("start", beginInteraction);
      c.addEventListener("end", endInteraction);
    }

    function setHazeTarget(target: number, immediate: boolean) {
      hazeTarget = target;
      if (immediate) {
        hazeActual = target;
        hazeLast = 0;
      }
      setBeamHaze();
      requestRender();
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
      }
      if (d.stage || d.venue) {
        venue.build(next.stage, next.venue);
        placeHouseLight();
        // 객석만 바뀌면(좌석 지도 편집) 편집·플롯 카메라는 그대로 둔다.
        if (d.stage) placeCameras(false);
        else placeAudience();
        cameraMoved = true;
      }
      if (d.props.added.length + d.props.changed.length + d.props.removed.length > 0) propLayer.sync(next.props);
      for (const id of d.actors.removed) removeActor(id);
      for (const a of next.actors) {
        const v = actors.get(a.id);
        if (!v) addActor(a);
        else if (v.actor !== a) {
          v.actor = a;
          if (v.key !== actorKey(a, humans.state === "ready")) rebuildActor(v);
          placeActor(v);
        }
      }
      currentLook = next.live;
      for (const id of d.fixtures.removed) removeFixture(id);
      for (const id of d.fixtures.added) addFixture(next.fixtures.find((f) => f.id === id)!);
      for (const id of d.fixtures.changed) {
        const v = fixtures.get(id);
        if (v) v.fixture = next.fixtures.find((f) => f.id === id)!;
      }
      const touched = new Set([...d.levels, ...d.fixtures.changed]);
      for (const [id, v] of fixtures) if (d.stage || touched.has(id)) apply(v, next.live);
      if (d.fixtures.added.length + d.fixtures.removed.length + d.fixtures.changed.length > 0) applyShadows();
      ambient = next.ambient;
      updateAmbient();
      // 실행 취소·슬라이더처럼 store에서 바로 바뀐 헤이즈는 즉시 반영한다.
      // (큐 재생은 setHazeTarget으로 목표를 먼저 정하므로 여기서는 그대로다.)
      if (d.haze && next.live.haze !== hazeTarget) setHazeTarget(next.live.haze, true);
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
    const tmpProj = new THREE.Vector3();

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

    /** group 로컬 좌표의 상자와 광선이 만나는 거리. */
    function hitLocalBox(group: THREE.Object3D, box: THREE.Box3): number | null {
      group.updateMatrixWorld();
      tmpInv.copy(group.matrixWorld).invert();
      tmpRay.copy(raycaster.ray).applyMatrix4(tmpInv);
      if (!tmpRay.intersectBox(box, tmpHit)) return null;
      return tmpHit.applyMatrix4(group.matrixWorld).distanceTo(raycaster.ray.origin);
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
        const t = sel.res.target;
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
      for (const v of actors.values()) consider("actor", v.actor.id, hitLocalBox(v.group, v.box));
      const fixtureSize = view === "plot" ? { x: 0.9, y: 0.9, z: 0.9 } : { x: 0.5, y: 0.5, z: 0.5 };
      for (const v of fixtures.values()) consider("fixture", v.fixture.id, hitBox(v.res.position, 0, fixtureSize, true));
      if (best) return best;
      // 아무것도 맞지 않으면 라인(파이프) 가까이를 눌렀는지 본다
      const { origin: o, direction: dir } = raycaster.ray;
      const ray = { origin: { x: o.x, y: o.y, z: o.z }, dir: { x: dir.x, y: dir.y, z: dir.z } };
      let lineD = view === "plot" ? 0.6 : 0.35;
      let line: Pick = null;
      for (const hang of HANGS) {
        const [lo, hi] = hangRange(show.stage, hang);
        const { dist } = raySegment(ray, hangPoint(show.stage, hang, lo), hangPoint(show.stage, hang, hi));
        if (dist < lineD) {
          lineD = dist;
          line = { type: "line", id: hang };
        }
      }
      return line;
    }

    // ── API ──
    const api: SceneApi = {
      requestRender,
      applyLook(look, shadows) {
        applyAll(look);
        if (shadows) shadowsPending = true;
        updateSelection();
        requestRender();
      },
      setView(v) {
        if (v === view) return;
        controls[view].enabled = false;
        view = v;
        controls[view].enabled = true;
        refreshViewState();
        cameraMoved = true;
        requestRender();
      },
      setWorkLight(on) {
        workLightOn = on;
        refreshViewState();
        requestRender();
      },
      setHouseLights(on) {
        const to = on ? 1 : 0;
        if (houseFade ? houseFade.to === to : houseLevel === to) return;
        houseFade = { from: houseLevel, to, start: performance.now() };
        requestRender();
      },
      setSeat(ref) {
        seat = ref;
        placeAudience();
        cameraMoved = true;
        requestRender();
      },
      setSolo(id) {
        if (soloId === id) return;
        soloId = id;
        applyAll(currentLook);
        shadowsPending = true;
        requestRender();
      },
      setHazeTarget,
      onHaze(fn) {
        hazeListeners.add(fn);
        fn(hazeActual, hazeTarget);
        return () => hazeListeners.delete(fn);
      },
      setQuality(q) {
        quality = q;
        applyTier();
      },
      setInset(right, bottom) {
        if (inset.right === right && inset.bottom === bottom) return;
        inset.right = right;
        inset.bottom = bottom;
        resize();
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
      screenRay(clientX, clientY) {
        setRay(clientX, clientY);
        const { origin: o, direction: d } = raycaster.ray;
        return { origin: { x: o.x, y: o.y, z: o.z }, dir: { x: d.x, y: d.y, z: d.z } };
      },
      previewFixture(fixtureId, position) {
        const v = fixtures.get(fixtureId);
        if (!v) return;
        v.res = { ...v.res, position };
        draw(v);
        updateSelection();
        shadowsPending = true;
        requestRender();
      },
      previewEntity(id, pos) {
        const prop = show.props.find((p) => p.id === id);
        if (prop) propLayer.setTransform(id, pos, prop.rotationY);
        const v = actors.get(id);
        if (v) {
          v.group.position.set(pos.x, pos.y, pos.z);
          v.group.updateMatrixWorld();
        }
        if (selectedId === id) ring.position.set(pos.x, pos.y + 0.01, pos.z);
        shadowsPending = true;
        requestRender();
      },
      previewAim(fixtureId, target) {
        const v = fixtures.get(fixtureId);
        if (!v) return;
        v.res = { ...v.res, target };
        draw(v);
        updateSelection();
        shadowsPending = true;
        requestRender();
      },
      fixtureScreenPoints() {
        const rect = renderer.domElement.getBoundingClientRect();
        const cam = activeCamera();
        const out: ScreenPoint[] = [];
        for (const v of fixtures.values()) {
          const p = v.res.position;
          tmpProj.set(p.x, p.y, p.z).project(cam);
          if (tmpProj.z > 1) continue;
          out.push({
            id: v.fixture.id,
            channel: v.fixture.channel,
            color: resolve(show.stage, v.fixture, show.live.levels[v.fixture.id]).color,
            x: ((tmpProj.x + 1) / 2) * rect.width,
            y: ((1 - tmpProj.y) / 2) * rect.height,
          });
        }
        return out;
      },
      onCamera(fn) {
        cameraListeners.add(fn);
        return () => cameraListeners.delete(fn);
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
      applyInset(w, h);
      edit.updateProjectionMatrix();
      audience.updateProjectionMatrix();
      fitPlot();
      cameraMoved = true;
      requestRender();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.audience.enabled = false;
    controls.plot.enabled = false;
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
      humans.dispose();
      disposeGroup(stageGroup);
      venue.dispose();
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
