"use client";

// 객석: 극장 템플릿 수치와 위에서 본 좌석 지도. 블록 위치·방향은 템플릿 규칙이 정하므로 지도는 보기 전용이고,
// 좌석을 누르면 그 자리에서 무대를 본다.
import { RotateCcw } from "lucide-react";
import { Segmented, Slider } from "./fields";
import { VENUE_KINDS_FOR, VENUE_LABELS, type VenueKind, type VenueTemplate, defaultTemplate, updateTemplate } from "./show";
import type { Store } from "./store";
import { BUTTON, PANEL_TITLE } from "./ui";
import { useShow } from "./useShow";
import { type SeatRef, blockSeats, seatLabel, venueBlocks, venueBox } from "./venue";

type Props = { store: Store; seat: SeatRef | null; onSeat: (ref: SeatRef) => void; onBegin: () => void };

const DEG = 180 / Math.PI;

export function SeatMapView({ store, seat, onSeat }: Omit<Props, "onBegin">) {
  const venue = useShow(store, (s) => s.venue);
  const stage = useShow(store, (s) => s.stage);
  const box = venueBox(stage, venue);
  const { width: w, depth: d } = stage;
  const blocks = venueBlocks(stage, venue);
  return (
    <svg
      viewBox={`${box.minX} ${box.minZ} ${box.maxX - box.minX} ${box.maxZ - box.minZ}`}
      role="img"
      aria-label="좌석 지도"
      className="max-h-80 w-full rounded-md border-2 border-point bg-[#17171c] select-none"
      onClick={(e) => {
        const el = (e.target as Element).closest<SVGElement>("[data-pick]");
        if (el) onSeat({ blockId: el.dataset.block!, row: Number(el.dataset.row), seat: Number(el.dataset.seat) });
      }}
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
      {blocks.map((b) => (
        // 발코니는 1층 위에 겹치므로 반투명하게 그린다.
        <g key={b.id} opacity={b.elevation > 0 ? 0.55 : 1}>
          {blockSeats(b).map((s) => {
            const chosen = seat && seat.blockId === b.id && seat.row === s.row && seat.seat === s.seat;
            return (
              <g key={`${s.row}-${s.seat}`} transform={`translate(${s.x} ${s.z}) rotate(${-s.rotationY * DEG})`}>
                <rect
                  data-pick=""
                  data-block={b.id}
                  data-row={s.row}
                  data-seat={s.seat}
                  x={-0.24}
                  y={-0.24}
                  width={0.48}
                  height={0.44}
                  rx={0.08}
                  fill={chosen ? "#ffd23f" : b.elevation > 0 ? "#a0404e" : "#6b1d24"}
                  className="cursor-pointer"
                >
                  <title>{`${b.name} ${s.row}열 ${s.seat}번`}</title>
                </rect>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

export default function SeatMap({ store, seat, onSeat, onBegin }: Props) {
  const venue = useShow(store, (s) => s.venue);
  const stage = useShow(store, (s) => s.stage);
  const t = venue.template;
  const kinds = VENUE_KINDS_FOR[stage.shape];
  const set = (patch: Partial<VenueTemplate>) => store.set(updateTemplate(store.get(), patch));
  const slider = (key: keyof VenueTemplate, label: string, min: number, max: number, step: number, format: (v: number) => string) => (
    <Slider label={label} value={t[key] as number} min={min} max={max} step={step} format={format} onBegin={onBegin}
      onChange={(v) => set({ [key]: v })} />
  );
  return (
    <div className="flex flex-col gap-2.5">
      {kinds.length > 1 ? (
        <Segmented<VenueKind> label="극장 종류" value={t.kind} options={kinds.map((k) => ({ value: k, label: VENUE_LABELS[k] }))}
          onPick={(kind) => { onBegin(); set({ kind }); }} />
      ) : (
        <p className="text-[11px] text-ink/70">객석 종류: {VENUE_LABELS[t.kind]}</p>
      )}
      {slider("rows", t.kind === "grand" ? "1층 줄 수" : "줄 수", 4, 25, 1, (v) => `${v}줄`)}
      {slider("width", t.kind === "arena" ? "면마다 좌석(최대)" : "가운데 첫 줄 좌석", 6, 30, 1, (v) => `${v}석`)}
      {t.kind !== "arena" && slider("widen", "뒷줄로 늘어나는 좌석", 0, 1, 0.1, (v) => (v === 0 ? "없음" : `줄마다 ${v.toFixed(1)}석`))}
      {slider("rake", "단차", 0.1, 0.5, 0.01, (v) => `${Math.round(v * 100)}cm`)}
      {slider("aisle", "통로 폭", 1, 2, 0.1, (v) => `${v.toFixed(1)}m`)}
      {slider("gap", "무대와 첫 줄 사이", 1, 4, 0.1, (v) => `${v.toFixed(1)}m`)}
      {t.kind === "grand" && slider("balconyRows", "발코니 줄 수", 3, 10, 1, (v) => `${v}줄`)}
      <button type="button" className={`${BUTTON} self-start`} title="이 무대 형태의 기본 객석으로 되돌려요"
        onClick={() => { onBegin(); store.set({ ...store.get(), venue: { template: defaultTemplate(stage.shape) } }); }}>
        <RotateCcw aria-hidden className="size-4" /> 기본 객석으로
      </button>
      <hr className="border-point/20" />
      <p className={PANEL_TITLE}>좌석 지도</p>
      <p className="text-[11px] text-ink/60">좌석을 누르면 그 자리에서 무대를 봐요.</p>
      <p className="text-xs font-bold text-point">보는 자리: {seatLabel(stage, venue, seat)}</p>
      <SeatMapView store={store} seat={seat} onSeat={onSeat} />
    </div>
  );
}
