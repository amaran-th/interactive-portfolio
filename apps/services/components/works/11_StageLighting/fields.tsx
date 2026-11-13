"use client";

// 속성 패널 입력 칸. 조작을 시작할 때 onBegin(실행 취소 지점·재생 멈춤)을 부른다.
import { LABEL, SEGMENT } from "./ui";

type Begin = { onBegin: () => void };

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onBegin,
  onChange,
}: Begin & {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="flex justify-between">
        <span className={LABEL}>{label}</span>
        <span className="text-[11px] tabular-nums text-ink/70">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onBegin}
        onKeyDown={onBegin}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-point"
      />
    </label>
  );
}

export function ColorField({
  label,
  value,
  onBegin,
  onChange,
}: Begin & { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className={LABEL}>{label}</span>
      <input
        type="color"
        value={value}
        onFocus={onBegin}
        onClick={onBegin}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-10 cursor-pointer rounded border-2 border-point"
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  maxLength,
  onBegin,
  onChange,
}: Begin & { label: string; value: string; maxLength: number; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={LABEL}>{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onFocus={onBegin}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border-2 border-point px-2 py-1 text-xs text-ink"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL}>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => o.value !== value && onPick(o.value)}
            className={SEGMENT}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
