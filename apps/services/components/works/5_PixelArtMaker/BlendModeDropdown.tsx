"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BlendMode } from "../_shared/assetLibrary";

const MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
];

// 블렌드 모드 선택기 — 네이티브 <select> 대신 커스텀 목록이라, 항목에
// 마우스를 올리면 그 모드를 레이어에 임시로 적용해 미리 볼 수 있다. 목록에서
// 벗어나거나 Escape·바깥 클릭으로 닫으면 열기 전 값으로 되돌린다. 항목을
// 클릭해야 확정된다.
export default function BlendModeDropdown({
  value,
  onPreview,
  onCommit,
}: {
  value: BlendMode;
  onPreview: (mode: BlendMode) => void;
  onCommit: (mode: BlendMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // 열었을 때의 확정값 — hover 미리보기 후 취소 시 이 값으로 되돌린다.
  // hover 미리보기가 부모의 blendMode(=value prop)를 바꾸므로, 여는 순간
  // 딱 한 번만 스냅샷한다. 효과 안에서 잡으면 미리보기 값에 덮어써진다.
  const committedRef = useRef(value);

  const toggle = () => {
    if (!open) committedRef.current = value;
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const restore = () => onPreview(committedRef.current);
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        restore();
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        restore();
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onPreview]);

  const label = MODES.find((m) => m.value === value)?.label ?? "Normal";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1 bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600 hover:bg-gray-200"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          onMouseLeave={() => onPreview(committedRef.current)}
          className="absolute right-0 top-full z-40 mt-1 flex w-32 flex-col bg-white py-1 shadow-xl"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onMouseEnter={() => onPreview(m.value)}
              onClick={() => {
                onCommit(m.value);
                committedRef.current = m.value;
                setOpen(false);
              }}
              className={`px-2 py-1 text-left text-[10px] hover:bg-violet-50 ${
                m.value === value
                  ? "font-semibold text-violet-700"
                  : "text-gray-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
