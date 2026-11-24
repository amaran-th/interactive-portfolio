"use client";

// 속성 패널 입력 칸. 조작을 시작할 때 onBegin(실행 취소 지점·재생 멈춤)을 부른다.
import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
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
  presets,
  onBegin,
  onChange,
}: Begin & { label: string; value: string; presets?: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className={LABEL}>{label}</span>
      {presets && (
        <span className="ml-auto flex gap-1">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`${label} ${c}`}
              aria-pressed={c === value.toLowerCase()}
              style={{ backgroundColor: c }}
              onClick={(e) => {
                e.preventDefault();
                onBegin();
                onChange(c);
              }}
              className="size-5 rounded-full border border-point/40 aria-pressed:ring-2 aria-pressed:ring-point"
            />
          ))}
        </span>
      )}
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

/**
 * 숫자 칸. 칸에 직접 입력하고 Enter·칸을 떠날 때 확정한다(입력 중에는 저장하지 않는다).
 * 라벨을 좌우로 끌면 값이 바뀐다(Shift를 누르면 10배). ↑↓ 키로 한 칸씩 바꾼다.
 */
export function NumberField({
  label,
  title,
  value,
  min,
  max,
  step,
  digits = 2,
  unit,
  onBegin,
  onChange,
}: Begin & {
  label: string;
  title?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  digits?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ x: number; v: number; moved: boolean } | null>(null);
  const fit = (v: number) => {
    const c = Math.min(max, Math.max(min, v));
    return Number((Math.round(c / step) * step).toFixed(digits));
  };
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(",", "."));
    setDraft(null);
    if (draft.trim() !== "" && Number.isFinite(n) && fit(n) !== value) onChange(fit(n));
  };
  return (
    <div className="flex min-w-0 items-center gap-1">
      <label
        htmlFor={id}
        title={title ? `${title} — 좌우로 끌어 바꾸기` : "좌우로 끌어 바꾸기"}
        className={`${LABEL} shrink-0 cursor-ew-resize touch-none select-none`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault(); // 포커스·글자 선택을 옮기지 않는다
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub.current = { x: e.clientX, v: value, moved: false };
        }}
        onPointerMove={(e) => {
          const s = scrub.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (!s.moved) {
            if (Math.abs(dx) < 3) return;
            s.moved = true;
            onBegin();
          }
          const next = fit(s.v + Math.round(dx / 3) * step * (e.shiftKey ? 10 : 1));
          if (next !== value) onChange(next);
        }}
        onPointerUp={(e) => {
          const s = scrub.current;
          scrub.current = null;
          if (s && !s.moved) document.getElementById(id)?.focus();
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          scrub.current = null;
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={title ?? label}
        value={draft ?? value.toFixed(digits)}
        onFocus={(e) => {
          onBegin();
          setDraft(value.toFixed(digits));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const base = draft !== null && Number.isFinite(Number(draft)) ? Number(draft) : value;
            const next = fit(base + (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1));
            setDraft(next.toFixed(digits));
            onChange(next);
          }
        }}
        className="w-full min-w-0 rounded-md border border-point/40 bg-black/25 px-1.5 py-0.5 text-right text-xs tabular-nums text-ink focus:border-point focus:outline-none"
      />
      {unit && <span className="shrink-0 text-[11px] text-ink/60">{unit}</span>}
    </div>
  );
}

type Axis = { min: number; max: number; title: string };

/** X/Y/Z 숫자 칸 세 개(미터). */
export function Vec3Field({
  label,
  value,
  axes,
  step = 0.05,
  onBegin,
  onChange,
}: Begin & {
  label: string;
  value: { x: number; y: number; z: number };
  axes: { x: Axis; y: Axis; z: Axis };
  step?: number;
  onChange: (v: { x: number; y: number; z: number }) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL}>{label}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {(["x", "y", "z"] as const).map((k) => (
          <NumberField key={k} label={k.toUpperCase()} title={axes[k].title} value={value[k]} min={axes[k].min} max={axes[k].max}
            step={step} onBegin={onBegin} onChange={(v) => onChange({ ...value, [k]: v })} />
        ))}
      </div>
    </div>
  );
}

/** 접히는 구역. 머리줄을 누르면 접고 편다. */
export function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-point/15">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-point hover:bg-point/5"
        >
          {title}
          <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      </h3>
      {open && <div className="flex flex-col gap-2.5 px-3 pb-3">{children}</div>}
    </section>
  );
}
