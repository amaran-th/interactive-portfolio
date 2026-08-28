"use client";

import { useCallback, useRef } from "react";
import { CURSOR_POINTING } from "./cursors";

// 그라데이션 방향 다이얼 — 도형/그라데이션 도구와 텍스트 도구 양쪽에서 같은
// 조작으로 각도를 고른다. 다이얼 중심에서 포인터까지의 각도를 구해 그대로
// 그라데이션 방향으로 삼는다 — atan2(dy,dx)는 CSS의 rotate()와 같은 방향
// 규약(0deg가 오른쪽, 시계 방향 증가)을 쓰므로 별도 변환 없이 렌더링에도
// 그대로 재사용할 수 있다.
export default function GradientDial({
  angleDeg,
  onAngleChange,
}: {
  angleDeg: number;
  onAngleChange: (deg: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const applyPoint = useCallback(
    (clientX: number, clientY: number) => {
      const dial = dialRef.current;
      if (!dial) return;
      const rect = dial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
      onAngleChange(Math.round((angle + 360) % 360));
    },
    [onAngleChange],
  );

  const handleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      dialRef.current?.setPointerCapture(e.pointerId);
      applyPoint(e.clientX, e.clientY);
    },
    [applyPoint],
  );
  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      applyPoint(e.clientX, e.clientY);
    },
    [applyPoint],
  );
  const handleUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      ref={dialRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      className="relative h-7 w-7 shrink-0 touch-none rounded-full bg-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
      style={{ cursor: CURSOR_POINTING }}
    >
      <div className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400" />
      <div
        className="absolute top-1/2 left-1/2 h-0.5 w-2.5 origin-left -translate-y-1/2 bg-violet-500"
        style={{ transform: `rotate(${angleDeg}deg)` }}
      />
      <div
        className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_0_1.5px_#ffffff]"
        style={{
          left: `calc(50% + ${Math.cos((angleDeg * Math.PI) / 180) * 11}px)`,
          top: `calc(50% + ${Math.sin((angleDeg * Math.PI) / 180) * 11}px)`,
        }}
      />
    </div>
  );
}
