"use client";

// 조명 연습실 본체. StageLightingLoader가 SSR 없이 불러오므로 첫 렌더부터 localStorage를 읽는다.
import { useEffect, useMemo, useRef, useState } from "react";
import { isTextEntryTarget } from "@/components/works/_shared/imageInput";
import CueBar from "./CueBar";
import Inspector from "./Inspector";
import Outliner from "./Outliner";
import PlotLabels from "./PlotLabels";
import { SeatPicker } from "./SeatMap";
import Sidebar, { type SidebarTab } from "./Sidebar";
import { loadQuality, loadShow, saveQuality, useAutoSave } from "./persistence";
import type { Quality, Tier } from "./quality";
import { dragHeight, dropAt } from "./placement";
import { stageBounds } from "./scene/stage";
import {
  CUE_PARAMS,
  type Show,
  type Vec3,
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
import { type SeatRef, clampSeat, defaultSeat, seatLabel } from "./venue";

type Drag = {
  type: "prop" | "actor" | "aim" | "fixture";
  id: string;
  pointerId: number;
  offset: { x: number; z: number };
  baseY: number;
  /** 조명기: 끌기 시작 자리. Shift를 누르는 동안은 높이만 바뀐다. */
  base: Vec3;
  shift: boolean;
  wasShift: boolean;
  clientX: number;
  clientY: number;
  raf: number;
  last: Vec3 | null;
};

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
  // 다른 대상을 고르면 솔로는 풀리고, 사이드바는 그 대상의 탭으로 넘어간다.
  const setPickedId = (id: string | null) => {
    setPickedIdRaw(id);
    setSoloId(null);
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
      const cur = d.last ?? d.base;
      if (d.shift) {
        const y = scene.heightAt(d.clientX, d.clientY, cur);
        d.wasShift = true;
        return y === null ? null : { ...cur, y: Math.min(15, Math.max(0, y)) };
      }
      // Shift를 떼면 지금 높이에서 수평 끌기를 다시 잡는다
      if (d.wasShift) {
        const p0 = scene.planePoint(d.clientX, d.clientY, cur.y);
        if (p0) d.offset = { x: cur.x - p0.x, z: cur.z - p0.z };
        d.wasShift = false;
      }
      const p = scene.planePoint(d.clientX, d.clientY, cur.y);
      return p ? { x: p.x + d.offset.x, y: cur.y, z: p.z + d.offset.z } : null;
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

  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY };
    const scene = sceneRef.current;
    if (!scene || e.button !== 0) return;
    const hit = scene.pick(e.clientX, e.clientY);
    if (!hit) return; // 빈 곳: 카메라 조작
    e.stopPropagation(); // 캔버스의 OrbitControls까지 가지 않게
    downRef.current = null;
    setPickedId(hit.id);
    const s = store.get();
    let base: Vec3;
    if (hit.type === "fixture") {
      const f = s.fixtures.find((x) => x.id === hit.id);
      if (!f) return;
      base = f.position;
    } else if (hit.type === "aim") {
      const f = s.fixtures.find((x) => x.id === hit.id);
      if (!f) return;
      base = resolve(s.stage, f, s.live.levels[f.id]).target;
    } else {
      const ent = hit.type === "prop" ? s.props.find((x) => x.id === hit.id) : s.actors.find((x) => x.id === hit.id);
      if (!ent) return;
      base = ent.position;
    }
    // 조명기 몸체는 그 높이의 수평면에서, 나머지는 바닥에서 잡은 점과의 차이를 유지한다
    const fp = hit.type === "fixture" ? scene.planePoint(e.clientX, e.clientY, base.y) : scene.floorPoint(e.clientX, e.clientY);
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
      base,
      shift: e.shiftKey,
      wasShift: false,
      clientX: e.clientX,
      clientY: e.clientY,
      raf: 0,
      last: null,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.clientX = e.clientX;
    d.clientY = e.clientY;
    d.shift = e.shiftKey;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      preview(d);
    });
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
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
        store.set(updateFixture(s, d.id, { position: pos }));
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
          className="absolute inset-0 touch-none overflow-hidden bg-[#050507] select-none"
          onPointerDownCapture={onPointerDownCapture}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={finishDrag}
          onContextMenu={(e) => e.preventDefault()}
        >
          {view === "plot" && !fatal && <PlotLabels store={store} sceneRef={sceneRef} selectedId={selectedId} />}
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
        <Sidebar
          open={sidebarOpen}
          onOpen={setSidebarOpen}
          tab={tab}
          onTab={setTab}
          side={
            tab === "stage"
              ? {
                  title: "좌석 미리보기",
                  content: <SeatPicker store={store} seat={seat} onSeat={(ref) => { setSeatPick(ref); changeView("audience"); }} />,
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
              <p className="p-3 text-xs text-ink/60">
                {tab === "elements" ? "목록이나 3D 화면에서 인물·소품을 고르면 여기에 속성이 나와요." : "목록이나 3D 화면에서 조명기를 고르면 여기에 속성이 나와요."}
              </p>
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
