"use client";

// 젤 색 고르기. 흔히 쓰는 젤 14가지 견본과 직접 고르는 색 칸.
import { GELS } from "./show";
import { COLOR_INPUT, FIELD_LABEL } from "./ui";

type Props = { value: string; onBegin: () => void; onChange: (color: string) => void };

export default function GelPicker({ value, onBegin, onChange }: Props) {
  const current = GELS.find((g) => g.color === value);
  const pick = (color: string) => {
    if (color === value) return;
    onBegin();
    onChange(color);
  };
  return (
    <div className="flex items-start gap-2">
      <span className={`${FIELD_LABEL} pt-1`}>젤</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
              className="h-6 rounded border border-white/10 aria-pressed:border-point aria-pressed:ring-2 aria-pressed:ring-point/40"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onFocus={onBegin}
            onClick={onBegin}
            onChange={(e) => onChange(e.target.value)}
            className={COLOR_INPUT}
            aria-label="젤 색 직접 고르기"
          />
          <span className="min-w-0 truncate text-[11px] text-ink/70">{current ? current.name : "직접 고른 색"}</span>
        </div>
      </div>
    </div>
  );
}
