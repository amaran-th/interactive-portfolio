"use client";

// 젤 색 고르기. 흔히 쓰는 젤 14가지 견본과 직접 고르는 색 칸.
import { GELS } from "./show";
import { LABEL } from "./ui";

type Props = { value: string; onBegin: () => void; onChange: (color: string) => void };

export default function GelPicker({ value, onBegin, onChange }: Props) {
  const current = GELS.find((g) => g.color === value);
  const pick = (color: string) => {
    if (color === value) return;
    onBegin();
    onChange(color);
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="flex justify-between">
        <span className={LABEL}>젤</span>
        <span className="text-[11px] text-ink/70">{current ? current.name : "직접 고른 색"}</span>
      </span>
      <div role="group" aria-label="젤 색" className="grid grid-cols-7 gap-1">
        {GELS.map((g) => (
          <button
            key={g.color}
            type="button"
            title={g.name}
            aria-label={g.name}
            aria-pressed={g.color === value}
            onClick={() => pick(g.color)}
            style={{ backgroundColor: g.color }}
            className="h-6 rounded border-2 border-point/30 aria-pressed:border-point aria-pressed:ring-2 aria-pressed:ring-point/40"
          />
        ))}
      </div>
      <label className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink/70">직접 고르기</span>
        <input
          type="color"
          value={value}
          onFocus={onBegin}
          onClick={onBegin}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border-2 border-point"
        />
      </label>
    </div>
  );
}
