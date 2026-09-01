"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHECKER_STYLE } from "./ColorPicker";

// 클립스튜디오식 불투명도 슬라이더 — 트랙 자체가 체크무늬 위에 "왼쪽 투명 →
// 오른쪽 불투명" 그라데이션이라, 슬라이더 모양만 봐도 지금 얼마나 비치는지
// 감이 온다. 별도 "투명도" 라벨 없이 이것 하나로 뜻이 전달된다. 오른쪽
// 숫자칸에 % 값을 직접 입력할 수도 있다.
export default function OpacitySlider({
  value,
  onChange,
  onChangeEnd,
  disabled,
}: {
  // 0~1
  value: number;
  onChange: (v: number) => void;
  onChangeEnd?: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const apply = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
    },
    [onChange],
  );

  const pct = Math.round(value * 100);

  const commitDraft = () => {
    const n = Number(draft);
    if (Number.isFinite(n)) {
      onChange(Math.max(0, Math.min(1, Math.round(n) / 100)));
      onChangeEnd?.();
    }
    setEditing(false);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div
        ref={trackRef}
        onPointerDown={
          disabled
            ? undefined
            : (e) => {
                draggingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                apply(e.clientX);
              }
        }
        onPointerMove={
          disabled
            ? undefined
            : (e) => {
                if (draggingRef.current) apply(e.clientX);
              }
        }
        onPointerUp={
          disabled
            ? undefined
            : (e) => {
                draggingRef.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
                onChangeEnd?.();
              }
        }
        onPointerCancel={() => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          onChangeEnd?.();
        }}
        className={`relative h-4 min-w-0 flex-1 touch-none ${
          disabled ? "opacity-40" : "cursor-pointer"
        }`}
        // 체크무늬 위에 "왼쪽 투명 → 오른쪽 불투명" 그라데이션을 한 요소에서
        // 겹쳐 깐다. 테두리는 두지 않는다(왼쪽 끝에 검은 선처럼 보였다).
        // 그라데이션은 96%에서 이미 완전 불투명이라 오른쪽 끝에 체크무늬가
        // 비치지 않는다.
        style={{
          backgroundImage: `linear-gradient(to right, rgba(55,65,81,0), rgba(55,65,81,1) 96%), ${CHECKER_STYLE.backgroundImage}`,
          backgroundSize: `100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px`,
          backgroundPosition: `0 0, ${CHECKER_STYLE.backgroundPosition}`,
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-2 -translate-y-1/2 border border-gray-600 bg-white shadow"
          // 양 끝에서 손잡이가 트랙 밖으로 튀어나가지 않게, translateX 대신
          // left를 손잡이 폭만큼 안쪽으로 보간한다.
          style={{ left: `calc(${value * 100}% - ${value * 8}px)` }}
        />
      </div>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-7 shrink-0 border border-gray-200 px-0.5 text-right text-[10px] text-gray-700 tabular-nums outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDraft(String(pct));
            setEditing(true);
          }}
          title="클릭해 값 직접 입력"
          className="w-7 shrink-0 text-right text-[10px] text-gray-500 tabular-nums hover:text-gray-800 disabled:opacity-40"
        >
          {pct}%
        </button>
      )}
    </div>
  );
}
