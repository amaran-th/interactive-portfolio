"use client";

// 객석 좌석 지도. 위에서 본 극장에 블록별 좌석을 그린다.
// - 좌석을 누르면 그 자리에서 무대를 본다.
// - 블록을 끌면 옮기고, 블록 앞 노란 손잡이를 끌면 돌린다. 고른 블록은 아래에서 고친다.
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Slider, TextField } from "./fields";
import { LIMITS, type Show, addBlock, removeBlock, resetVenue, updateBlock } from "./show";
import type { Store } from "./store";
import { BUTTON, PANEL_TITLE } from "./ui";
import { useShow } from "./useShow";
import { type SeatRef, blockSeats, seatLabel, venueBox } from "./venue";

type Props = { store: Store; seat: SeatRef | null; onSeat: (ref: SeatRef) => void; onBegin: () => void };

type Gesture = {
  pointerId: number;
  mode: "move" | "rotate";
  blockId: string;
  seat: SeatRef | null;
  startX: number;
  startY: number;
  start: { x: number; z: number };
  origin: { x: number; z: number };
  moved: boolean;
  raf: number;
  last: { x: number; z: number };
};

const DEG = 180 / Math.PI;
const SLOP = 4;
const HANDLE = 1.3; // 블록 앞 손잡이 거리(m)
const snap = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(3));

export default function SeatMap({ store, seat, onSeat, onBegin }: Props) {
  const venue = useShow(store, (s) => s.venue);
  const stage = useShow(store, (s) => s.stage);
  const [picked, setPicked] = useState<string | null>(seat?.blockId ?? null);
  const block = venue.blocks.find((b) => b.id === picked) ?? null;
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const edit = (fn: (s: Show) => Show) => store.set(fn(store.get()));
  const box = venueBox(stage, venue);
  const vb = `${box.minX} ${box.minZ} ${box.maxX - box.minX} ${box.maxZ - box.minZ}`;
  const { width: w, depth: d } = stage;

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, z: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, z: p.y };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const el = (e.target as Element).closest<SVGElement>("[data-block]");
    if (!el) {
      setPicked(null);
      return;
    }
    const blockId = el.dataset.block!;
    const b = venue.blocks.find((x) => x.id === blockId);
    if (!b) return;
    setPicked(blockId);
    const row = Number(el.dataset.row);
    const seatNo = Number(el.dataset.seat);
    const p = toWorld(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      pointerId: e.pointerId,
      mode: el.dataset.rotate ? "rotate" : "move",
      blockId,
      seat: row && seatNo ? { blockId, row, seat: seatNo } : null,
      startX: e.clientX,
      startY: e.clientY,
      start: p,
      origin: { x: b.x, z: b.z },
      moved: false,
      raf: 0,
      last: p,
    };
  };

  const apply = (g: Gesture) => {
    const p = g.last;
    if (g.mode === "move") {
      edit((s) =>
        updateBlock(s, g.blockId, { x: snap(g.origin.x + p.x - g.start.x, 0.1), z: snap(g.origin.z + p.z - g.start.z, 0.1) }),
      );
    } else {
      // 손잡이 방향이 블록이 보는 방향(-sinθ, -cosθ)이 되게 돌린다. 5° 단위.
      const rot = Math.atan2(-(p.x - g.origin.x), -(p.z - g.origin.z));
      edit((s) => updateBlock(s, g.blockId, { rotationY: snap(rot * DEG, 5) / DEG }));
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    if (!g.moved) {
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < SLOP) return;
      g.moved = true;
      onBegin();
    }
    g.last = toWorld(e.clientX, e.clientY);
    if (g.raf) return;
    g.raf = requestAnimationFrame(() => {
      g.raf = 0;
      apply(g);
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    cancelAnimationFrame(g.raf);
    if (g.moved) apply(g);
    else if (g.seat) onSeat(g.seat);
  };

  return (
    <div className="flex flex-col gap-2.5 p-3">
      <h2 className="text-sm font-bold text-point">객석</h2>
      <p className="text-[11px] text-ink/60">
        좌석을 누르면 그 자리에서 무대를 봐요. 블록은 끌어서 옮기고, 앞의 노란 손잡이로 돌려요.
      </p>
      <p className="text-xs font-bold text-point">보는 자리: {seatLabel(venue, seat)}</p>
      <svg
        ref={svgRef}
        viewBox={vb}
        role="img"
        aria-label="좌석 지도"
        className="max-h-96 w-full touch-none rounded-md border-2 border-point bg-[#17171c] select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {stage.shape === "round" ? (
          <circle cx={0} cy={-d / 2} r={Math.min(w, d) / 2} fill="#3a3a40" />
        ) : (
          <>
            <rect x={-w / 2} y={-d} width={w} height={d} fill="#3a3a40" />
            {stage.shape === "thrust" && <rect x={-w / 4} y={0} width={w / 2} height={d * 0.4} fill="#3a3a40" />}
          </>
        )}
        <text x={0} y={-d / 2} textAnchor="middle" dominantBaseline="middle" fontSize={0.8} fill="#9a9aa6" fontWeight={700}>
          무대
        </text>
        {venue.blocks.map((b) => {
          const on = b.id === picked;
          const hx = b.x - Math.sin(b.rotationY) * HANDLE;
          const hz = b.z - Math.cos(b.rotationY) * HANDLE;
          return (
            <g key={b.id}>
              {blockSeats(b).map((s) => {
                const chosen = seat && seat.blockId === b.id && seat.row === s.row && seat.seat === s.seat;
                return (
                  <g key={`${s.row}-${s.seat}`} transform={`translate(${s.x} ${s.z}) rotate(${-s.rotationY * DEG})`}>
                    <rect
                      data-block={b.id}
                      data-row={s.row}
                      data-seat={s.seat}
                      x={-0.24}
                      y={-0.24}
                      width={0.48}
                      height={0.44}
                      rx={0.08}
                      fill={chosen ? "#ffd23f" : on ? "#c0404e" : "#6b1d24"}
                      className="cursor-pointer"
                    >
                      <title>{`${b.name} ${s.row}열 ${s.seat}번`}</title>
                    </rect>
                  </g>
                );
              })}
              {on && (
                <>
                  <line x1={b.x} y1={b.z} x2={hx} y2={hz} stroke="#ffd23f" strokeWidth={0.06} strokeDasharray="0.15 0.1" />
                  <circle data-block={b.id} data-rotate="1" cx={hx} cy={hz} r={0.35} fill="#ffd23f" className="cursor-grab">
                    <title>끌어서 돌리기</title>
                  </circle>
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={venue.blocks.length >= LIMITS.blocks}
          title={venue.blocks.length >= LIMITS.blocks ? `블록은 최대 ${LIMITS.blocks}개예요` : undefined}
          onClick={() => {
            onBegin();
            const next = addBlock(store.get());
            store.set(next);
            setPicked(next.venue.blocks.at(-1)?.id ?? null);
          }}
          className={BUTTON}>
          <Plus aria-hidden className="size-4" /> 블록 추가
        </button>
        <button type="button" onClick={() => { onBegin(); edit(resetVenue); setPicked(null); }} className={BUTTON}
          title="무대 형태에 맞는 기본 객석으로 되돌려요">
          <RotateCcw aria-hidden className="size-4" /> 기본 배치로
        </button>
      </div>

      {block ? (
        <>
          <hr className="border-point/20" />
          <p className={PANEL_TITLE}>블록</p>
          <TextField label="이름" value={block.name} maxLength={20} onBegin={onBegin}
            onChange={(name) => edit((s) => updateBlock(s, block.id, { name }))} />
          <Slider label="줄 수" value={block.rows} min={1} max={20} step={1} format={(v) => `${v}줄`} onBegin={onBegin}
            onChange={(rows) => edit((s) => updateBlock(s, block.id, { rows }))} />
          <Slider label="줄마다 좌석" value={block.seatsPerRow} min={1} max={40} step={1} format={(v) => `${v}석`} onBegin={onBegin}
            onChange={(seatsPerRow) => edit((s) => updateBlock(s, block.id, { seatsPerRow }))} />
          <Slider label="단차" value={block.rake} min={0} max={0.5} step={0.01} format={(v) => `${Math.round(v * 100)}cm`}
            onBegin={onBegin} onChange={(rake) => edit((s) => updateBlock(s, block.id, { rake }))} />
          <Slider label="휘어짐" value={block.curve} min={0} max={120} step={1} format={(v) => `${Math.round(v)}°`}
            onBegin={onBegin} onChange={(curve) => edit((s) => updateBlock(s, block.id, { curve }))} />
          <Slider label="방향" value={Math.round(block.rotationY * DEG)} min={-180} max={180} step={5}
            format={(v) => `${v}°`} onBegin={onBegin}
            onChange={(v) => edit((s) => updateBlock(s, block.id, { rotationY: v / DEG }))} />
          <button type="button" className={`${BUTTON} self-start`}
            onClick={() => { onBegin(); edit((s) => removeBlock(s, block.id)); setPicked(null); }}>
            <Trash2 aria-hidden className="size-4" /> 블록 삭제
          </button>
        </>
      ) : (
        <p className="text-[11px] text-ink/60">블록을 누르면 줄 수·좌석 수·단차·휘어짐을 고칠 수 있어요.</p>
      )}
    </div>
  );
}
