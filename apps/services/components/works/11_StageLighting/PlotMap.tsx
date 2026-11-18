"use client";

// 평면도: 위에서 본 무대를 쇼 데이터로 그린 SVG. 3D를 한 번 더 그리지 않아 가볍다.
// 라인·조명기·조준점·인물·소품을 여기서도 고르고 끈다. 끄는 동안은 3D와 같이 미리보기만 하고, 놓을 때 저장한다.
import { type RefObject, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { bodiesOf, dragHeight, dropAt } from "./placement";
import { stageBounds } from "./scene/stage";
import {
  CUE_PARAMS,
  HANGS,
  HANG_LABELS,
  type HangId,
  type LineOffset,
  type MapPt,
  type Vec3,
  deckOutline,
  dragLineOnMap,
  fixtureMapPoint,
  hangFromMap,
  hangPoint,
  lineMapSegment,
  mapBounds,
  resolve,
  setLineOffset,
  updateActor,
  updateFixture,
  updateFocus,
  updateLevel,
  updateProp,
} from "./show";
import type { Store } from "./store";
import type { SceneApi } from "./useStageScene";
import { useShow } from "./useShow";

export type PlotMapMode = "off" | "mini" | "split";

type Drag =
  | { type: "fixture"; id: string; hang: HangId; along: number }
  | { type: "aim"; id: string; y: number; offset: MapPt; pos: Vec3 | null }
  | { type: "prop" | "actor"; id: string; offset: MapPt; pos: Vec3 | null }
  | { type: "line"; hang: HangId; start: LineOffset; from: MapPt };

type Props = {
  store: Store;
  sceneRef: RefObject<SceneApi | null>;
  mode: Exclude<PlotMapMode, "off">;
  onMode: (m: PlotMapMode) => void;
  selectedId: string | null;
  selectedLine: HangId | null;
  onPick: (id: string | null) => void;
  onPickLine: (hang: HangId) => void;
  onBegin: () => void;
};

const LABEL_ROOM = 1.6; // m. 라인 이름을 쓸 왼쪽 여백
const SLOP = 4; // px. 이보다 덜 움직이면 클릭으로 본다
const HOVER = "#ffe08a";
const ACTIVE = "#ffb000";
const deg = (r: number) => (r * 180) / Math.PI;

export default function PlotMap({ store, sceneRef, mode, onMode, selectedId, selectedLine, onPick, onPickLine, onBegin }: Props) {
  const show = useShow(store, (s) => s);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ drag: Drag; pointerId: number; x: number; y: number; moved: boolean; raf: number; pt: MapPt } | null>(null);
  const [preview, setPreview] = useState<{ id: string; pos: Vec3; hang?: HangId; along?: number } | null>(null);
  const [hoverLine, setHoverLine] = useState<HangId | null>(null);
  // 항목 위에서 누른 클릭. 포인터를 잡아 두면 click이 바탕(svg)에서 나서, 빈 곳 클릭과 가려야 한다
  const itemDownRef = useRef(false);
  // 끄는 동안은 범위를 굳혀 평면도가 출렁이지 않게 한다
  const [frozen, setFrozen] = useState<ReturnType<typeof mapBounds> | null>(null);
  const live = useMemo(() => mapBounds(show), [show]);
  // 왼쪽에 라인 이름 자리를 더 둔다
  const fb = frozen ?? live;
  const b = { ...fb, minX: fb.minX - LABEL_ROOM };
  const bodies = useMemo(() => new Map(bodiesOf(show).map((x) => [x.id, x])), [show]);

  const toWorld = (clientX: number, clientY: number): MapPt => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return { x: 0, z: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, z: p.y };
  };

  const highlight = (hover: HangId | null) => {
    setHoverLine(hover);
    sceneRef.current?.setLineHighlight(hover, selectedLine);
  };

  // ── 끌기 ──
  const step = () => {
    const d = dragRef.current;
    if (!d) return;
    const s = store.get();
    const scene = sceneRef.current;
    const g = d.drag;
    if (g.type === "line") {
      const next = dragLineOnMap(g.hang, g.start, d.pt.x - g.from.x, d.pt.z - g.from.z);
      store.set(setLineOffset(s, g.hang, { dz: Math.round(next.dz * 20) / 20, dy: Math.round(next.dy * 20) / 20 }));
      return;
    }
    if (g.type === "fixture") {
      const line = hangFromMap(s.stage, d.pt, g.hang);
      g.hang = line.hang;
      g.along = line.along;
      const pos = hangPoint(s.stage, line.hang, line.along);
      scene?.previewFixture(g.id, pos);
      setPreview({ id: g.id, pos, hang: line.hang, along: line.along });
      return;
    }
    const sb = stageBounds(s.stage);
    const x = Math.min(sb.maxX, Math.max(sb.minX, d.pt.x + g.offset.x));
    const z = Math.min(sb.maxZ, Math.max(sb.minZ, d.pt.z + g.offset.z));
    if (g.type === "aim") {
      g.pos = { x, y: g.y, z };
      scene?.previewAim(g.id, g.pos);
      setPreview({ id: `aim:${g.id}`, pos: g.pos });
    } else {
      g.pos = { x, y: dragHeight(s, g.type, g.id, x, z), z };
      scene?.previewEntity(g.id, g.pos);
      setPreview({ id: g.id, pos: g.pos });
    }
  };

  const commit = (g: Drag) => {
    const s = store.get();
    if (g.type === "fixture") store.set(updateFixture(s, g.id, { hang: g.hang, along: g.along }));
    else if (g.type === "aim") {
      if (!g.pos) return;
      const f = s.fixtures.find((x) => x.id === g.id);
      if (f && CUE_PARAMS[f.kind].includes("target")) store.set(updateLevel(s, g.id, { target: g.pos }));
      else store.set(updateFocus(s, g.id, { target: g.pos }));
    } else if (g.type === "prop" || g.type === "actor") {
      if (!g.pos) return;
      const at = dropAt(s, g.type, g.id, g.pos, stageBounds(s.stage));
      store.set(g.type === "prop" ? updateProp(s, g.id, { position: at }) : updateActor(s, g.id, { position: at }));
    }
  };

  const start = (e: React.PointerEvent, drag: Drag) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    itemDownRef.current = true;
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { drag, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false, raf: 0, pt: toWorld(e.clientX, e.clientY) };
  };

  const onDownFixture = (e: React.PointerEvent, id: string) => {
    const f = store.get().fixtures.find((x) => x.id === id);
    if (!f) return;
    onPick(id);
    start(e, { type: "fixture", id, hang: f.hang, along: f.along });
  };
  const onDownAim = (e: React.PointerEvent, id: string, target: Vec3) => {
    const p = toWorld(e.clientX, e.clientY);
    start(e, { type: "aim", id, y: target.y, offset: { x: target.x - p.x, z: target.z - p.z }, pos: null });
  };
  const onDownEntity = (e: React.PointerEvent, type: "prop" | "actor", id: string, at: Vec3) => {
    onPick(id);
    const p = toWorld(e.clientX, e.clientY);
    start(e, { type, id, offset: { x: at.x - p.x, z: at.z - p.z }, pos: null });
  };
  const onDownLine = (e: React.PointerEvent, hang: HangId) => {
    onPickLine(hang);
    start(e, { type: "line", hang, start: store.get().stage.rig[hang], from: toWorld(e.clientX, e.clientY) });
  };

  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < SLOP) return;
      // 실제로 끌기 시작할 때만 되돌리기 지점을 남긴다(클릭만으로는 남기지 않는다)
      d.moved = true;
      setFrozen(live);
      onBegin();
      sceneRef.current?.beginInteraction();
    }
    d.pt = toWorld(e.clientX, e.clientY);
    if (!d.raf)
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        step();
      });
  };

  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    cancelAnimationFrame(d.raf);
    if (d.moved) {
      d.pt = toWorld(e.clientX, e.clientY);
      step();
      commit(d.drag);
      sceneRef.current?.endInteraction();
    }
    setFrozen(null);
    setPreview(null);
  };

  // ── 그리기 ──
  const deck = deckOutline(show.stage);
  const w = b.maxX - b.minX;
  const h = b.maxZ - b.minZ;
  const at = (id: string, p: Vec3) => (preview?.id === id ? preview.pos : p);

  return (
    <div
      className={`flex flex-col overflow-hidden border-2 border-point bg-[#0d0d12]/90 shadow-[2px_2px_0_0_var(--color-point)] backdrop-blur ${
        mode === "split" ? "h-full w-full rounded-none border-y-0 border-l-0" : "w-72 rounded-md"
      }`}
    >
      <div className="flex items-center justify-between gap-1 bg-point px-2 py-1 text-[11px] font-bold text-white">
        <span>평면도 · 위에서 본 무대</span>
        <span className="flex gap-0.5">
          <button type="button" className="hidden rounded p-0.5 hover:bg-white/20 md:block" aria-label={mode === "split" ? "작게 보기" : "화면 반으로 나눠 보기"}
            title={mode === "split" ? "작게 보기" : "화면 반으로 나눠 보기"} onClick={() => onMode(mode === "split" ? "mini" : "split")}>
            {mode === "split" ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
          </button>
          <button type="button" className="rounded p-0.5 hover:bg-white/20" aria-label="평면도 닫기" title="평면도 닫기" onClick={() => onMode("off")}>
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      </div>
      <svg
        ref={svgRef}
        role="img"
        aria-label="위에서 본 무대 평면도"
        viewBox={`${b.minX} ${b.minZ} ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className={`touch-none select-none ${mode === "split" ? "min-h-0 flex-1" : ""}`}
        style={mode === "split" ? undefined : { aspectRatio: `${w} / ${h}`, maxHeight: 260 }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => {
          // 빈 곳 클릭: 고른 것을 푼다
          if (!itemDownRef.current && e.target === svgRef.current) onPick(null);
          itemDownRef.current = false;
        }}
      >
        {/* 객석 방향 */}
        <text x={0} y={b.maxZ - 0.08} textAnchor="middle" fontSize={0.4} fill="#ffffff55" className="pointer-events-none">
          객석 ▼
        </text>

        {/* 무대 바닥 */}
        <g className="pointer-events-none" fill="#2a2a33" stroke="#55556a" strokeWidth={0.05}>
          {deck.kind === "circle" ? (
            <circle cx={deck.cx} cy={deck.cz} r={deck.r} />
          ) : (
            deck.rects.map((r, i) => <rect key={i} x={r.x} y={r.z} width={r.w} height={r.h} />)
          )}
        </g>

        {/* 빛이 닿는 자리(밝을수록 진하게) */}
        <g className="pointer-events-none">
          {show.fixtures.map((f) => {
            const r = resolve(show.stage, f, show.live.levels[f.id]);
            if (r.intensity <= 0) return null;
            const pos = at(f.id, r.position);
            const tgt = at(`aim:${f.id}`, r.target);
            const dist = Math.hypot(tgt.x - pos.x, tgt.y - pos.y, tgt.z - pos.z);
            const rad = Math.max(0.3, dist * Math.tan((r.beamAngle * Math.PI) / 360));
            return <circle key={f.id} cx={tgt.x} cy={tgt.z} r={rad} fill={r.color} fillOpacity={0.12 + 0.3 * r.intensity} />;
          })}
        </g>

        {/* 소품 */}
        {show.props.map((p) => {
          const pos = at(p.id, p.position);
          const r = bodies.get(p.id)?.r ?? 0.4;
          const sel = p.id === selectedId;
          return (
            <rect key={p.id} x={pos.x - r} y={pos.z - r} width={r * 2} height={r * 2} rx={0.08}
              transform={`rotate(${-deg(p.rotationY)} ${pos.x} ${pos.z})`}
              fill={p.color} fillOpacity={0.8} stroke={sel ? ACTIVE : "#ffffff66"} strokeWidth={sel ? 0.12 : 0.04}
              className="cursor-grab" onPointerDown={(e) => onDownEntity(e, "prop", p.id, p.position)} />
          );
        })}

        {/* 라인(파이프) */}
        {HANGS.map((hang) => {
          const [a, c] = lineMapSegment(show.stage, hang);
          const on = selectedLine === hang;
          const hov = hoverLine === hang;
          const boom = hang === "boomL" || hang === "boomR";
          return (
            <g key={hang} className="cursor-grab" onPointerDown={(e) => onDownLine(e, hang)}
              onPointerEnter={() => highlight(hang)} onPointerLeave={() => highlight(null)}>
              <line x1={a.x} y1={a.z} x2={c.x} y2={c.z} stroke="transparent" strokeWidth={0.6} strokeLinecap="round" />
              <line x1={a.x} y1={a.z} x2={c.x} y2={c.z} stroke={on ? ACTIVE : hov ? HOVER : "#8a8b95"}
                strokeWidth={on ? 0.16 : hov ? 0.12 : 0.07} strokeLinecap="round" />
              <text x={boom ? a.x : a.x - 0.25} y={boom ? a.z + 0.55 : a.z + 0.14} textAnchor={boom ? "middle" : "end"} fontSize={0.36}
                fontWeight={700} fill={on ? ACTIVE : hov ? HOVER : "#ffffff88"} className="pointer-events-none">
                {HANG_LABELS[hang]}
              </text>
            </g>
          );
        })}

        {/* 인물 */}
        {show.actors.map((a) => {
          const pos = at(a.id, a.position);
          const sel = a.id === selectedId;
          return (
            <g key={a.id} className="cursor-grab" onPointerDown={(e) => onDownEntity(e, "actor", a.id, a.position)}>
              <circle cx={pos.x} cy={pos.z} r={0.3} fill={a.topColor} stroke={sel ? ACTIVE : "#ffffff"} strokeWidth={sel ? 0.12 : 0.05} />
              <text x={pos.x} y={pos.z + 0.7} textAnchor="middle" fontSize={0.32} fill="#ffffffcc" className="pointer-events-none">
                {a.name}
              </text>
            </g>
          );
        })}

        {/* 조명기·조준선 */}
        {show.fixtures.map((f) => {
          const r = resolve(show.stage, f, show.live.levels[f.id]);
          const pos = preview?.id === f.id && preview.hang ? fixtureMapPoint(show.stage, preview.hang, preview.along ?? 0) : fixtureMapPoint(show.stage, f.hang, f.along);
          const tgt = at(`aim:${f.id}`, r.target);
          const sel = f.id === selectedId;
          return (
            <g key={f.id}>
              <line x1={pos.x} y1={pos.z} x2={tgt.x} y2={tgt.z} stroke={r.color} strokeOpacity={sel ? 0.9 : 0.25 + 0.5 * r.intensity}
                strokeWidth={sel ? 0.06 : 0.035} strokeDasharray={r.intensity > 0 ? undefined : "0.15 0.12"} className="pointer-events-none" />
              <g className="cursor-grab" onPointerDown={(e) => onDownFixture(e, f.id)}>
                <circle cx={pos.x} cy={pos.z} r={0.3} fill="#1b1b6b" stroke={sel ? ACTIVE : r.color} strokeWidth={sel ? 0.12 : 0.08} />
                <text x={pos.x} y={pos.z + 0.12} textAnchor="middle" fontSize={0.3} fontWeight={700} fill="#ffffff" className="pointer-events-none">
                  {f.channel}
                </text>
              </g>
              {sel && (
                <g className="cursor-crosshair" onPointerDown={(e) => onDownAim(e, f.id, r.target)}>
                  <circle cx={tgt.x} cy={tgt.z} r={0.35} fill="transparent" stroke={ACTIVE} strokeWidth={0.07} />
                  <path d={`M${tgt.x - 0.5} ${tgt.z}H${tgt.x + 0.5}M${tgt.x} ${tgt.z - 0.5}V${tgt.z + 0.5}`} stroke={ACTIVE} strokeWidth={0.05} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <p className="px-2 py-1 text-[10px] text-white/60">
        조명기·인물·소품·라인을 끌어 옮겨요. 조명기를 고르면 십자 표시로 조준점을 끌 수 있어요.
      </p>
    </div>
  );
}

