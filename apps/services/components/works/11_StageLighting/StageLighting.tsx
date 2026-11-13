"use client";

// 조명 연습실 본체. StageLightingLoader가 SSR 없이 불러오므로 첫 렌더부터 localStorage를 읽는다.
import { useEffect, useMemo, useRef, useState } from "react";
import { isTextEntryTarget } from "@/components/works/_shared/imageInput";
import ChannelPanel from "./ChannelPanel";
import CueBar from "./CueBar";
import Inspector from "./Inspector";
import PlotLabels from "./PlotLabels";
import SeatMap from "./SeatMap";
import { loadQuality, loadShow, saveQuality, useAutoSave } from "./persistence";
import type { Quality, Tier } from "./quality";
import { stageBounds } from "./scene/stage";
import {
  CUE_PARAMS,
  type Show,
  type Vec3,
  addActor,
  addFixture,
  addProp,
  removeEntity,
  resolve,
  setHaze,
  updateActor,
  updateFocus,
  updateLevel,
  updateProp,
} from "./show";
import { createStore } from "./store";
import Toolbar, { type AddItem } from "./Toolbar";
import { useCuePlayback } from "./useCuePlayback";
import { SEGMENT } from "./ui";
import { useShow } from "./useShow";
import { type ViewMode, useStageScene } from "./useStageScene";
import { type SeatRef, clampSeat, defaultSeat, seatLabel } from "./venue";

type Drag = {
  type: "prop" | "actor" | "aim";
  id: string;
  pointerId: number;
  offset: { x: number; z: number };
  baseY: number;
  clientX: number;
  clientY: number;
  raf: number;
  last: Vec3 | null;
};

const CLICK_SLOP = 4;
const TAB_LABELS = { props: "속성", channels: "채널", seats: "객석" } as const;
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
  const sceneRef = useStageScene(viewRef, store, setFatal);
  useAutoSave(store, setNotice);
  const playback = useCuePlayback(store, sceneRef, progressRef);

  const [pickedId, setPickedIdRaw] = useState<string | null>(null);
  const [soloId, setSoloId] = useState<string | null>(null);
  // 다른 대상을 고르면 솔로는 풀린다.
  const setPickedId = (id: string | null) => {
    setPickedIdRaw(id);
    setSoloId(null);
  };
  const selectedId = useShow(store, (s) => (pickedId && exists(s, pickedId) ? pickedId : null));
  const haze = useShow(store, (s) => s.live.haze);
  const [view, setView] = useState<ViewMode>("edit");
  const [workLight, setWorkLight] = useState(true);
  const [quality, setQuality] = useState<Quality>(loadQuality);
  const [tier, setTier] = useState<Tier>(0);
  const [audienceOnGo, setAudienceOnGo] = useState(true);
  const [houseLights, setHouseLights] = useState(false);
  const [seatPick, setSeatPick] = useState<SeatRef | null>(() => defaultSeat(loaded.show.venue));
  const venue = useShow(store, (s) => s.venue);
  // 블록이 지워지거나 줄어도 남아 있는 좌석으로 맞춘다.
  const seat = useMemo(() => clampSeat(venue, seatPick), [venue, seatPick]);
  const [tab, setTab] = useState<"props" | "channels" | "seats">("props");
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
  useEffect(() => sceneRef.current?.setSolo(solo), [sceneRef, solo]);
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

  const add = (item: AddItem) => {
    beginEdit();
    const s = store.get();
    const next =
      item.type === "prop" ? addProp(s, item.kind) : item.type === "actor" ? addActor(s) : addFixture(s, item.kind);
    if (next === s) return;
    store.set(next);
    const list = item.type === "prop" ? next.props : item.type === "actor" ? next.actors : next.fixtures;
    setPickedId(list[list.length - 1].id);
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
    const fp = scene?.floorPoint(d.clientX, d.clientY);
    if (!fp) return null;
    const b = stageBounds(store.get().stage);
    return {
      x: Math.min(b.maxX, Math.max(b.minX, fp.x + d.offset.x)),
      y: d.baseY,
      z: Math.min(b.maxZ, Math.max(b.minZ, fp.z + d.offset.z)),
    };
  };

  const preview = (d: Drag) => {
    const pos = dragTarget(d);
    if (!pos) return;
    d.last = pos;
    if (d.type === "aim") sceneRef.current?.previewAim(d.id, pos);
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
    if (hit.type === "fixture") return;
    const s = store.get();
    let base: Vec3;
    if (hit.type === "aim") {
      const f = s.fixtures.find((x) => x.id === hit.id);
      if (!f) return;
      base = resolve(s.stage, f, s.live.levels[f.id]).target;
    } else {
      const ent = hit.type === "prop" ? s.props.find((x) => x.id === hit.id) : s.actors.find((x) => x.id === hit.id);
      if (!ent) return;
      base = ent.position;
    }
    const fp = scene.floorPoint(e.clientX, e.clientY);
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
      if (d.type === "prop") store.set(updateProp(s, d.id, { position: pos }));
      else if (d.type === "actor") store.set(updateActor(s, d.id, { position: pos }));
      else {
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
        onBegin={beginEdit}
        hazeStatus={hazeStatus}
        houseLights={houseLights}
        onHouseLights={setHouseLights}
        seatLabel={seatLabel(venue, seat)}
        onSeatMap={() => setTab("seats")}
        onHaze={(v) => {
          // 슬라이더로 정한 농도는 바로 보이게 한다(큐 재생 때만 천천히 차오른다).
          sceneRef.current?.setHazeTarget(v, true);
          store.set(setHaze(store.get(), v));
        }}
        onAdd={add}
        onUndo={undo}
        onRedo={redo}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          ref={viewRef}
          aria-label="무대 3D 화면"
          className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[#050507] select-none"
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
            <p role="alert" className="absolute top-3 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-md border-2 border-point bg-white px-3 py-1.5 text-xs font-bold text-point shadow-[2px_2px_0_0_var(--color-point)]">
              {notice}
            </p>
          )}
        </div>
        <aside aria-label="속성" className="max-h-[40%] shrink-0 overflow-auto border-t-2 border-point bg-white md:max-h-none md:w-72 md:border-t-0 md:border-l-2">
          <div role="tablist" aria-label="패널" className="sticky top-0 z-10 flex gap-1 border-b-2 border-point bg-white px-3 py-2">
            {(["props", "channels", "seats"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t}
                onClick={() => setTab(t)} className={`${SEGMENT} aria-selected:bg-point aria-selected:text-white`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          {tab === "props" ? (
            <Inspector store={store} selectedId={selectedId} tier={tier} solo={solo !== null}
              onSolo={() => setSoloId(solo ? null : selectedId)} onBegin={beginEdit} onDeleted={() => setPickedId(null)} />
          ) : tab === "seats" ? (
            <SeatMap store={store} seat={seat} onBegin={beginEdit}
              onSeat={(ref) => { setSeatPick(ref); changeView("audience"); }} />
          ) : (
            <ChannelPanel store={store} selectedId={selectedId} onBegin={beginEdit}
              onPick={(id) => { setPickedId(id); setTab("props"); }} />
          )}
        </aside>
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
