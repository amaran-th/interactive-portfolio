"use client";

// 좌석을 구역·열·번호로 직접 고르고, 방향 단추(또는 객석 시점의 방향키)로 옆·앞·뒤 자리로 옮긴다.
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus } from "lucide-react";
import type { Stage, Venue } from "./show";
import { type SeatRef, type SeatStep, blockSeats, clampSeat, stepSeat, venueBlocks } from "./venue";
import { LABEL } from "./ui";

const STEP_BUTTON =
  "flex size-7 items-center justify-center rounded-md border-2 border-point bg-white text-point hover:bg-shade disabled:opacity-40";

function Counter({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={LABEL}>
        {label} <span className="font-normal text-ink/50">(1~{max})</span>
      </span>
      <span className="flex items-center gap-1">
        <button type="button" className={STEP_BUTTON} aria-label={`${label} 하나 줄이기`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
          <Minus aria-hidden className="size-3.5" />
        </button>
        <input type="number" inputMode="numeric" min={1} max={max} value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 1) onChange(v);
          }}
          className="w-12 rounded-md border border-point/40 bg-white/80 px-1 py-1 text-center text-xs tabular-nums text-ink" />
        <button type="button" className={STEP_BUTTON} aria-label={`${label} 하나 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus aria-hidden className="size-3.5" />
        </button>
      </span>
    </label>
  );
}

export default function SeatSelect({ stage, venue, seat, onSeat }: { stage: Stage; venue: Venue; seat: SeatRef | null; onSeat: (ref: SeatRef) => void }) {
  const blocks = venueBlocks(stage, venue);
  const block = seat && blocks.find((b) => b.id === seat.blockId);
  if (!seat || !block) return null;
  const pick = (ref: SeatRef) => {
    const r = clampSeat(stage, venue, ref);
    if (r) onSeat(r);
  };
  const step = (dir: SeatStep) => onSeat(stepSeat(stage, venue, seat, dir));
  const arrow = (dir: SeatStep, label: string, Icon: typeof ArrowUp) => (
    <button type="button" className={STEP_BUTTON} aria-label={label} title={label} onClick={() => step(dir)}>
      <Icon aria-hidden className="size-4" />
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className={LABEL}>구역</span>
        <select value={block.id} onChange={(e) => pick({ ...seat, blockId: e.target.value })}
          className="rounded-md border border-point/40 bg-white/80 px-2 py-1 text-xs text-ink">
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <Counter label="열" value={seat.row} max={block.rows} onChange={(row) => pick({ ...seat, row })} />
        <Counter label="번" value={seat.seat} max={blockSeats(block).filter((s) => s.row === seat.row).length} onChange={(n) => pick({ ...seat, seat: n })} />
      </div>
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-0.5">
          <span />
          {arrow("front", "앞줄로", ArrowUp)}
          <span />
          {arrow("left", "왼쪽 자리로", ArrowLeft)}
          {arrow("back", "뒷줄로", ArrowDown)}
          {arrow("right", "오른쪽 자리로", ArrowRight)}
        </div>
      </div>
    </div>
  );
}
