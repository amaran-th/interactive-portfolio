"use client";

// 조명 연습실 본체. StageLightingLoader가 SSR 없이 불러오므로 첫 렌더부터 localStorage를 읽는다.
import { useEffect, useMemo, useRef, useState } from "react";
import { isTextEntryTarget } from "@/components/works/_shared/imageInput";
import CueBar from "./CueBar";
import Inspector from "./Inspector";
import LinePanel from "./LinePanel";
import Outliner from "./Outliner";
import PlotLabels from "./PlotLabels";
import PlotMap, { type PlotMapMode } from "./PlotMap";
import SeatSelect from "./SeatSelect";
import { SeatPicker } from "./SeatMap";
import Sidebar, { type SidebarTab } from "./Sidebar";
import { loadQuality, loadShow, saveQuality, useAutoSave } from "./persistence";
import type { Quality, Tier } from "./quality";
import { dragHeight, dropAt } from "./placement";
import { stageBounds } from "./scene/stage";
import {
  CUE_PARAMS,
  HANG_LABELS,
  type HangId,
  type LineOffset,
  type Show,
  type Vec3,
  hangFromRay,
  rayAtY,
  rayAtZ,
  setLineOffset,
  hangPoint,
  addActor,
  addFixture,
  addProp,
  duplicateEntity,
  removeEntity,
  resolve,
  setAmbient,
  setHaze,
  updateActor,
  updateFixture,
  updateFocus,
  updateLevel,
  updateProp,
} from "./show";
import { createStore } from "./store";
import AddMenu, { type AddItem } from "./AddMenu";
import Toolbar from "./Toolbar";
import { useCuePlayback } from "./useCuePlayback";
import { useShow } from "./useShow";
import { type ViewMode, useStageScene } from "./useStageScene";
import { type SeatRef, clampSeat, defaultSeat, seatLabel, stepSeat } from "./venue";

type Drag = {
  type: "prop" | "actor" | "aim" | "fixture";
  id: string;
  pointerId: number;
  offset: { x: number; z: number };
  baseY: number;
  /** 조명기: 지금 걸린 라인(끄는 동안 바뀔 수 있다). */
  hang: HangId | null;
  along: number;
  clientX: number;
  clientY: number;
  raf: number;
  last: Vec3 | null;
};

// 라인(파이프) 끌기. Shift를 누르면 높이(붐은 무대와의 거리)를, 아니면 앞뒤를 바꾼다.
type LineDrag = {
  hang: HangId;
  pointerId: number;
  boom: boolean;
  shift: boolean;
  wantShift: boolean;
  start: LineOffset;
  ref: number;
  planeY: number;
  planeZ: number;
  clientX: number;
  clientY: number;
  raf: number;
};
const BOOM_DRAG_Y = 2; // 붐은 이 높이의 수평면에서 끈다

const CLICK_SLOP = 4;
const NOTICE_MS = 5000;

function exists(s: Show, id: string): boolean {
  return s.props.some((p) => p.id === id) || s.actors.some((a) => a.id === id) || s.fixtures.some((f) => f.id === id);
}

export default function StageLighting() {
  const [loaded] = useState(loadShow);
  const [store] = useState(() => createStore(loaded.show));
  const viewRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<string | null>(loaded.notice);
  const [fatal, setFatal] = useState<string | null>(null);
  const [inset, setInset] = useState({ right: 0, bottom: 0 });
  const sceneRef = useStageScene(viewRef, store, setFatal, setNotice);
  useAutoSave(store, setNotice);
  const playback = useCuePlayback(store, sceneRef, progressRef);

  const [pickedId, setPickedIdRaw] = useState<string | null>(null);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>("stage");
  // 고른 라인(파이프). 3D에서 진하게 칠하고 라인 패널에서 그 칸을 펼친다.
  const [selectedLine, setSelectedLine] = useState<HangId | null>(null);
  // 평면도: 넓은 화면은 작게 띄운 채로 시작하고, 좁은 화면은 접어 둔다
  const [mapMode, setMapMode] = useState<PlotMapMode>(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? "mini" : "off",
  );
  const [lineLabel, setLineLabel] = useState<{ x: number; y: number; text: string } | null>(null);
  // 다른 대상을 고르면 솔로와 고른 라인은 풀리고, 사이드바는 그 대상의 탭으로 넘어간다.
  const setPickedId = (id: string | null) => {
    setPickedIdRaw(id);
    setSoloId(null);
    setSelectedLine(null);
    if (!id) return;
    const s = store.get();
    if (s.fixtures.some((f) => f.id === id)) setTab("fixtures");
    else if (s.props.some((p) => p.id === id) || s.actors.some((a) => a.id === id)) setTab("elements");
  };
  const selectedId = useShow(store, (s) => (pickedId && exists(s, pickedId) ? pickedId : null));
  // 고른 대상이 속한 탭. 다른 탭을 보고 있으면 그 탭의 속성 칸은 비워 둔다.
  const selectedTab = useShow(store, (s): SidebarTab | null =>
    !selectedId ? null : s.fixtures.some((f) => f.id === selectedId) ? "fixtures" : "elements",
  );
  const tabSelectedId = selectedTab === tab ? selectedId : null;
  const haze = useShow(store, (s) => s.live.haze);
  const ambient = useShow(store, (s) => s.ambient);
  const [view, setView] = useState<ViewMode>("edit");
  const [workLight, setWorkLight] = useState(true);
  const [quality, setQuality] = useState<Quality>(loadQuality);
  const [tier, setTier] = useState<Tier>(0);
  const [audienceOnGo, setAudienceOnGo] = useState(true);
  const [houseLights, setHouseLights] = useState(false);
  const [audienceOn, setAudienceOn] = useState(false);
  const [seatPick, setSeatPick] = useState<SeatRef | null>(() => defaultSeat(loaded.show.stage, loaded.show.venue));
  const venue = useShow(store, (s) => s.venue);
  const stageForSeat = useShow(store, (s) => s.stage);
  // 템플릿이 바뀌어 블록이 없어지거나 줄어도 남아 있는 좌석으로 맞춘다.
  const seat = useMemo(() => clampSeat(stageForSeat, venue, seatPick), [stageForSeat, venue, seatPick]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hazeStatus, setHazeStatus] = useState<"rising" | "falling" | null>(null);
  const solo = soloId && soloId === selectedId ? soloId : null;

  // ── 씬에 UI 상태 반영 ──
  useEffect(() => sceneRef.current?.setSelected(selectedId), [sceneRef, selectedId]);
  useEffect(() => sceneRef.current?.setView(view), [sceneRef, view]);
  useEffect(() => sceneRef.current?.setWorkLight(workLight), [sceneRef, workLight]);
  useEffect(() => {
    sceneRef.current?.setQuality(quality);
    saveQuality(quality);
  }, [sceneRef, quality]);
  useEffect(() => sceneRef.current?.onTierChange(setTier), [sceneRef]);
  useEffect(() => sceneRef.current?.setHouseLights(houseLights), [sceneRef, houseLights]);
  useEffect(() => sceneRef.current?.setAudience(audienceOn), [sceneRef, audienceOn]);
  useEffect(() => sceneRef.current?.setSeat(seat), [sceneRef, seat]);
  useEffect(() => sceneRef.current?.setInset(inset.right, inset.bottom), [sceneRef, inset]);
  useEffect(() => sceneRef.current?.setSolo(solo), [sceneRef, solo]);
  // 공연 상태가 바뀌면(편집·되돌리기·큐 호출) 솔로를 푼다. 저장된 상태와 화면이 어긋나지 않게.
  useEffect(() => store.subscribe(() => setSoloId(null)), [store]);
  useEffect(
    () =>
      sceneRef.current?.onHaze((actual, target) =>
        setHazeStatus(Math.abs(actual - target) <= 0.01 ? null : actual < target ? "rising" : "falling"),
      ),
    [sceneRef],
  );

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [notice]);

  // ── 편집 ──
  const beginEdit = () => {
    setSoloId(null);
    playback.stop();
    store.checkpoint();
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    if (v === "audience") setWorkLight(false);
  };

  /** 새로 생긴 인물·소품을 다른 것과 겹치지 않게 옮겨 넣고 고른다. */
  const placeNew = (prev: Show, next: Show) => {
    const fresh = (list: { id: string }[], old: { id: string }[]) => list.find((x) => !old.some((o) => o.id === x.id));
    const prop = fresh(next.props, prev.props);
    const actor = fresh(next.actors, prev.actors);
    const fixture = fresh(next.fixtures, prev.fixtures);
    let out = next;
    if (prop || actor) {
      const type = prop ? "prop" : "actor";
      const id = (prop ?? actor)!.id;
      const pos = (prop ? next.props.find((p) => p.id === id)! : next.actors.find((a) => a.id === id)!).position;
      const at = dropAt(next, type, id, pos, stageBounds(next.stage));
      out = type === "prop" ? updateProp(next, id, { position: at }) : updateActor(next, id, { position: at });
    }
    store.set(out);
    setPickedId((prop ?? actor ?? fixture)?.id ?? null);
  };

  const add = (item: AddItem) => {
    beginEdit();
    const s = store.get();
    const next =
      item.type === "prop" ? addProp(s, item.kind) : item.type === "actor" ? addActor(s, item.gender) : addFixture(s, item.kind);
    if (next !== s) placeNew(s, next);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    beginEdit();
    const s = store.get();
    const next = duplicateEntity(s, selectedId);
    if (next !== s) placeNew(s, next);
  };

  const go = () => {
    setSoloId(null);
    if (audienceOnGo) changeView("audience");
    playback.go();
  };

  const undo = () => {
    playback.stop();
    store.undo();
  };
  const redo = () => {
    playback.stop();
    store.redo();
  };

  const removeSelected = () => {
    if (!selectedId) return;
    beginEdit();
    store.set(removeEntity(store.get(), selectedId));
    setPickedId(null);
  };

  // ── 3D 뷰 포인터: 대상 위에서 누르면 드래그, 빈 곳은 카메라 조작(OrbitControls)에 넘긴다 ──
  const dragRef = useRef<Drag | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const dragTarget = (d: Drag): Vec3 | null => {
    const scene = sceneRef.current;
    if (d.type === "fixture") {
      if (!scene) return null;
      // 포인터에 가장 가까운 라인 위로만 움직인다. 다른 라인 가까이 가면 그 라인으로 옮겨 건다.
      const s = store.get();
      const line = hangFromRay(s.stage, scene.screenRay(d.clientX, d.clientY), d.hang);
      d.hang = line.hang;
      d.along = line.along;
      return hangPoint(s.stage, line.hang, line.along);
    }
    const fp = scene?.floorPoint(d.clientX, d.clientY);
    if (!fp) return null;
    const s = store.get();
    const b = stageBounds(s.stage);
    const x = Math.min(b.maxX, Math.max(b.minX, fp.x + d.offset.x));
    const z = Math.min(b.maxZ, Math.max(b.minZ, fp.z + d.offset.z));
    // 인물·소품은 그 점 아래 단·계단·탁자·상자 윗면에 올라선다.
    return { x, y: d.type === "aim" ? d.baseY : dragHeight(s, d.type, d.id, x, z), z };
  };

  const preview = (d: Drag) => {
    const pos = dragTarget(d);
    if (!pos) return;
    d.last = pos;
    if (d.type === "aim") sceneRef.current?.previewAim(d.id, pos);
    else if (d.type === "fixture") sceneRef.current?.previewFixture(d.id, pos);
    else sceneRef.current?.previewEntity(d.id, pos);
  };

  const lineDragRef = useRef<LineDrag | null>(null);

  // 끌기를 시작할 때·Shift를 누르거나 뗄 때 기준점을 다시 잡는다
  const lineBaseline = (d: LineDrag, shift: boolean) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const s = store.get();
    const ray = scene.screenRay(d.clientX, d.clientY);
    const p = hangPoint(s.stage, d.hang, 0);
    d.start = s.stage.rig[d.hang];
    d.shift = shift;
    d.planeY = d.boom ? BOOM_DRAG_Y : p.y;
    d.planeZ = p.z;
    if (shift && !d.boom) d.ref = rayAtZ(ray, d.planeZ)?.y ?? NaN;
    else {
      const h = rayAtY(ray, d.planeY);
      d.ref = h ? (shift ? Math.abs(h.x) : h.z) : NaN;
    }
  };

  const applyLineDrag = (d: LineDrag) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (d.wantShift !== d.shift || Number.isNaN(d.ref)) {
      lineBaseline(d, d.wantShift);
      return;
    }
    const ray = scene.screenRay(d.clientX, d.clientY);
    let next: LineOffset | null = null;
    if (!d.shift) {
      const h = rayAtY(ray, d.planeY);
      if (h) next = { ...d.start, dz: d.start.dz + (h.z - d.ref) };
    } else if (d.boom) {
      const h = rayAtY(ray, d.planeY);
      if (h) next = { ...d.start, dy: d.start.dy + (Math.abs(h.x) - d.ref) };
    } else {
      const v = rayAtZ(ray, d.planeZ);
      if (v) next = { ...d.start, dy: d.start.dy + (v.y - d.ref) };
    }
    // 0.05m 단위로 맞춰 끄는 동안 값이 덜 떨리게 한다
    if (!next) return;
    const s2 = setLineOffset(store.get(), d.hang, { dz: Math.round(next.dz * 20) / 20, dy: Math.round(next.dy * 20) / 20 });
    store.set(s2);
    const o = s2.stage.rig[d.hang];
    const sign = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}m`;
    const r = viewRef.current?.getBoundingClientRect();
    if (r)
      setLineLabel({
        x: d.clientX - r.left + 14,
        y: d.clientY - r.top + 14,
        text: `${HANG_LABELS[d.hang]} · 앞뒤 ${sign(o.dz)} · ${d.boom ? "거리" : "높이"} ${sign(o.dy)}`,
      });
  };

  // 마우스를 올린 라인은 옅게 칠하고 커서를 손 모양으로 바꾼다
  const hoverRef = useRef<{ raf: number; x: number; y: number; line: HangId | null }>({ raf: 0, x: 0, y: 0, line: null });
  const onHover = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = hoverRef.current;
    h.x = e.clientX;
    h.y = e.clientY;
    if (h.raf || e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    h.raf = requestAnimationFrame(() => {
      h.raf = 0;
      const scene = sceneRef.current;
      if (!scene) return;
      const hit = scene.pick(h.x, h.y);
      const line = hit?.type === "line" ? (hit.id as HangId) : null;
      el.style.cursor = hit ? "grab" : "";
      if (line !== h.line) {
        h.line = line;
        scene.setLineHighlight(line, selectedLineRef.current);
      }
    });
  };
  const selectedLineRef = useRef<HangId | null>(null);
  useEffect(() => {
    selectedLineRef.current = selectedLine;
    sceneRef.current?.setLineHighlight(hoverRef.current.line, selectedLine);
  }, [sceneRef, selectedLine]);

  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY };
    const scene = sceneRef.current;
    if (!scene || e.button !== 0) return;
    const hit = scene.pick(e.clientX, e.clientY);
    if (!hit) return; // 빈 곳: 카메라 조작
    e.stopPropagation(); // 캔버스의 OrbitControls까지 가지 않게
    downRef.current = null;
    if (hit.type === "line") {
      // 라인 끌기: 걸린 조명기는 라인을 따라 함께 움직인다
      setPickedId(null);
      setSelectedLine(hit.id as HangId);
      setTab("fixtures");
      beginEdit();
      scene.beginInteraction();
      e.currentTarget.setPointerCapture(e.pointerId);
      const hang = hit.id as HangId;
      const d: LineDrag = {
        hang,
        pointerId: e.pointerId,
        boom: hang === "boomL" || hang === "boomR",
        shift: e.shiftKey,
        wantShift: e.shiftKey,
        start: store.get().stage.rig[hang],
        ref: NaN,
        planeY: 0,
        planeZ: 0,
        clientX: e.clientX,
        clientY: e.clientY,
        raf: 0,
      };
      lineBaseline(d, e.shiftKey);
      lineDragRef.current = d;
      return;
    }
    setPickedId(hit.id);
    const s = store.get();
    let base: Vec3;
    let fixtureLine: { hang: HangId; along: number } | null = null;
    if (hit.type === "fixture") {
      const f = s.fixtures.find((x) => x.id === hit.id);
      if (!f) return;
      fixtureLine = { hang: f.hang, along: f.along };
      base = hangPoint(s.stage, f.hang, f.along);
    } else if (hit.type === "aim") {
      const f = s.fixtures.find((x) => x.id === hit.id);
      if (!f) return;
      base = resolve(s.stage, f, s.live.levels[f.id]).target;
    } else {
      const ent = hit.type === "prop" ? s.props.find((x) => x.id === hit.id) : s.actors.find((x) => x.id === hit.id);
      if (!ent) return;
      base = ent.position;
    }
    const fp = hit.type === "fixture" ? base : scene.floorPoint(e.clientX, e.clientY);
    if (!fp) return;
    beginEdit();
    scene.beginInteraction();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: hit.type,
      id: hit.id,
      pointerId: e.pointerId,
      offset: { x: base.x - fp.x, z: base.z - fp.z },
      baseY: base.y,
      hang: fixtureLine?.hang ?? null,
      along: fixtureLine?.along ?? 0,
      clientX: e.clientX,
      clientY: e.clientY,
      raf: 0,
      last: null,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lineDragRef.current && !dragRef.current) {
      onHover(e);
      return;
    }
    const ld = lineDragRef.current;
    if (ld && ld.pointerId === e.pointerId) {
      ld.clientX = e.clientX;
      ld.clientY = e.clientY;
      ld.wantShift = e.shiftKey;
      if (!ld.raf)
        ld.raf = requestAnimationFrame(() => {
          ld.raf = 0;
          applyLineDrag(ld);
        });
      return;
    }
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.clientX = e.clientX;
    d.clientY = e.clientY;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      preview(d);
    });
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const ld = lineDragRef.current;
    if (ld && ld.pointerId === e.pointerId) {
      lineDragRef.current = null;
      cancelAnimationFrame(ld.raf);
      setLineLabel(null);
      sceneRef.current?.endInteraction();
      return true;
    }
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return false;
    dragRef.current = null;
    cancelAnimationFrame(d.raf);
    d.clientX = e.clientX;
    d.clientY = e.clientY;
    if (d.last) preview(d);
    const pos = d.last;
    if (pos) {
      const s = store.get();
      if (d.type === "prop" || d.type === "actor") {
        // 놓을 때 같은 높이의 다른 인물·소품과 겹치면 가까운 빈자리로 민다.
        const at = dropAt(s, d.type, d.id, pos, stageBounds(s.stage));
        if (d.type === "prop") store.set(updateProp(s, d.id, { position: at }));
        else store.set(updateActor(s, d.id, { position: at }));
      } else if (d.type === "fixture") {
        if (d.hang) store.set(updateFixture(s, d.id, { hang: d.hang, along: d.along }));
      } else {
        // 팔로우는 큐마다 대상을 따라가고, 나머지는 포커스(고정 조준)를 옮긴다.
        const f = s.fixtures.find((x) => x.id === d.id);
        if (f && CUE_PARAMS[f.kind].includes("target")) store.set(updateLevel(s, d.id, { target: pos }));
        else store.set(updateFocus(s, d.id, { target: pos }));
      }
    }
    sceneRef.current?.endInteraction();
    return true;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (finishDrag(e)) return;
    const down = downRef.current;
    downRef.current = null;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < CLICK_SLOP) setPickedId(null);
  };

  // ── 단축키 ──
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (isTextEntryTarget(t)) return;
      if (document.querySelector("dialog[open]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault(); // 브라우저 북마크 단축키 대신 복제
        duplicateSelected();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === " ") {
        // 버튼·체크박스 등에 포커스가 있으면 Space는 그 컨트롤 몫이다.
        if (t && t !== document.body && t.closest("button, input, select, a, [role=button]")) return;
        e.preventDefault();
        go();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          removeSelected();
        }
      } else if (view === "audience" && seat && e.key.startsWith("Arrow") && !e.altKey && !e.metaKey && !e.ctrlKey) {
        // 객석 시점: 방향키로 옆·앞·뒤 자리로 옮겨 앉는다(무대를 보는 관객 기준)
        e.preventDefault();
        const dir = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "front", ArrowDown: "back" } as const)[e.key as "ArrowLeft"];
        if (dir) setSeatPick(stepSeat(stageForSeat, venue, seat, dir));
      } else if (e.key === "Escape") {
        setPickedId(null);
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <Toolbar
        store={store}
        view={view}
        onView={changeView}
        workLight={workLight}
        onWorkLight={setWorkLight}
        quality={quality}
        tier={tier}
        onQuality={setQuality}
        haze={haze}
        ambient={ambient}
        onAmbient={(v) => store.set(setAmbient(store.get(), v))}
        onBegin={beginEdit}
        hazeStatus={hazeStatus}
        houseLights={houseLights}
        onHouseLights={setHouseLights}
        audience={audienceOn}
        onAudience={setAudienceOn}
        seatLabel={seatLabel(stageForSeat, venue, seat)}
        onSeatMap={() => {
          setPickedId(null);
          setTab("stage");
          setSidebarOpen(true);
        }}
        onHaze={(v) => {
          // 슬라이더로 정한 농도는 바로 보이게 한다(큐 재생 때만 천천히 차오른다).
          sceneRef.current?.setHazeTarget(v, true);
          store.set(setHaze(store.get(), v));
        }}
        onUndo={undo}
        onRedo={redo}
      />
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewRef}
          aria-label="무대 3D 화면"
          className={`absolute inset-y-0 right-0 touch-none overflow-hidden bg-[#050507] select-none ${mapMode === "split" ? "left-0 md:left-1/2" : "left-0"}`}
          onPointerDownCapture={onPointerDownCapture}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={finishDrag}
          onContextMenu={(e) => e.preventDefault()}
        >
          {view === "plot" && !fatal && <PlotLabels store={store} sceneRef={sceneRef} selectedId={selectedId} />}
          {lineLabel && (
            <span className="pointer-events-none absolute z-20 rounded-md bg-point px-2 py-1 text-[11px] font-bold tabular-nums text-white shadow"
              style={{ left: lineLabel.x, top: lineLabel.y }}>
              {lineLabel.text}
            </span>
          )}
          {fatal && (
            <p role="alert" className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm font-bold text-white">
              {fatal}
            </p>
          )}
          {notice && !fatal && (
            <p role="alert" className="absolute top-3 left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded-md border-2 border-point bg-white px-3 py-1.5 text-xs font-bold text-point shadow-[2px_2px_0_0_var(--color-point)]">
              {notice}
            </p>
          )}
        </div>
        {mapMode === "split" ? (
          <div className="absolute inset-y-0 left-0 z-20 hidden w-1/2 md:block">
            <PlotMap store={store} sceneRef={sceneRef} mode="split" onMode={setMapMode} selectedId={selectedId} selectedLine={selectedLine}
              onPick={setPickedId} onPickLine={(h) => { setPickedId(null); setSelectedLine(h); setTab("fixtures"); }} onBegin={beginEdit} />
          </div>
        ) : mapMode === "mini" && view !== "plot" ? (
          <div className="absolute left-3 z-20" style={{ bottom: inset.bottom + 12 }}>
            <PlotMap store={store} sceneRef={sceneRef} mode="mini" onMode={setMapMode} selectedId={selectedId} selectedLine={selectedLine}
              onPick={setPickedId} onPickLine={(h) => { setPickedId(null); setSelectedLine(h); setTab("fixtures"); }} onBegin={beginEdit} />
          </div>
        ) : mapMode === "off" ? (
          <button type="button" className="absolute left-3 z-20 rounded-md border-2 border-point bg-white px-2 py-1 text-xs font-bold text-point shadow-[2px_2px_0_0_var(--color-point)] hover:bg-shade"
            style={{ bottom: inset.bottom + 12 }} onClick={() => setMapMode("mini")}>
            평면도 보기
          </button>
        ) : null}
        <Sidebar
          open={sidebarOpen}
          onOpen={setSidebarOpen}
          tab={tab}
          onTab={setTab}
          side={
            tab === "stage"
              ? {
                  title: "좌석 미리보기",
                  content: (
                    <>
                      <SeatSelect stage={stageForSeat} venue={venue} seat={seat} onSeat={(ref) => { setSeatPick(ref); changeView("audience"); }} />
                      <SeatPicker store={store} seat={seat} onSeat={(ref) => { setSeatPick(ref); changeView("audience"); }} />
                    </>
                  ),
                }
              : undefined
          }
          actions={tab === "stage" ? undefined : <AddMenu store={store} onAdd={add} only={tab} />}
          onInset={(right, bottom) => setInset((o) => (o.right === right && o.bottom === bottom ? o : { right, bottom }))}
          outliner={
            tab === "stage" ? undefined : (
              <Outliner store={store} selectedId={selectedId} onPick={setPickedId} onBegin={beginEdit}
                groups={tab === "elements" ? ["people", "props"] : ["fixtures"]} />
            )
          }
          inspector={
            // 무대 설정 탭은 늘 무대·객석을, 나머지 탭은 그 탭의 대상을 골랐을 때만 속성을 보여 준다
            tab === "stage" || (tabSelectedId && tabSelectedId === selectedId) ? (
              <Inspector store={store} selectedId={tab === "stage" ? null : selectedId} tier={tier} solo={solo !== null} seat={seat}
                onSeat={(ref) => { setSeatPick(ref); changeView("audience"); }}
                onSolo={() => setSoloId(solo ? null : selectedId)} onBegin={beginEdit}
                onDuplicate={duplicateSelected} onDelete={removeSelected} />
            ) : (
              tab === "fixtures" ? (
                <LinePanel store={store} onBegin={beginEdit} selected={selectedLine} />
              ) : (
                <p className="p-3 text-xs text-ink/60">목록이나 3D 화면에서 인물·소품을 고르면 여기에 속성이 나와요.</p>
              )
            )
          }
        />
      </div>
      <CueBar
        store={store}
        playback={playback}
        progressRef={progressRef}
        onBegin={beginEdit}
        onGo={go}
        audienceOnGo={audienceOnGo}
        onAudienceOnGo={setAudienceOnGo}
      />
    </div>
  );
}
