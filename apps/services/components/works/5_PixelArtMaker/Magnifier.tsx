"use client";

import { createPortal } from "react-dom";

// 스포이트 도구 공통 확대경 — 메인 캔버스와 레퍼런스 창 양쪽에서 커서 주변
// 픽셀을 확대해 보여준다. 각 호출부는 자신의 색상 소스(픽셀 그리드 vs
// 이미지 캔버스)에서 커서 중심의 grid만 뽑아 넘기고, 이 컴포넌트는 그 grid를
// 그리는 순수 표시만 담당한다.

export const MAGNIFIER_RADIUS = 4;
const CELL_SIZE = 12;
// 스포이트 커서 자체가 지름 8px짜리 원(반지름 4, cursors.ts의
// CURSOR_EYEDROPPER 참고) 표시를 갖고 있다 — 그만큼만 띄워야 커서 도형과
// 확대경 사이에 빈 틈이 남지 않는다.
const CURSOR_OFFSET = 4;

// row/col 길이는 항상 2*MAGNIFIER_RADIUS+1 — 중심(MAGNIFIER_RADIUS, MAGNIFIER_RADIUS)이
// 커서가 가리키는 실제 픽셀이다. null은 캔버스 밖이거나(레퍼런스 창) 투명한
// 픽셀(메인 캔버스)을 뜻한다.
export type MagnifierGrid = (string | null)[][];

export default function Magnifier({
  screenX,
  screenY,
  grid,
  centerHex,
}: {
  screenX: number;
  screenY: number;
  grid: MagnifierGrid;
  centerHex: string | null;
}) {
  const cells = grid.length;
  const size = cells * CELL_SIZE;
  const center = Math.floor(cells / 2);

  // 에디터 창 자신에게 scale 트랜지션(transform)이 걸려 있어, 그 자손에서
  // position:fixed를 쓰면 뷰포트가 아니라 그 트랜스폼 조상 자신의 상자가
  // 기준이 되어 화면 좌표(screenX/Y)와 실제로 그려지는 위치가 어긋난다 —
  // document.body에 곧바로 포털로 그려 항상 진짜 뷰포트 좌표를 쓰게 한다.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-999 flex flex-col items-center gap-1 bg-white p-1.5 shadow-2xl"
      style={{ left: screenX + CURSOR_OFFSET, top: screenY + CURSOR_OFFSET }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: size,
          height: size,
          backgroundImage:
            "repeating-conic-gradient(#ddd 0% 25%, #f3f3f3 0% 50%)",
          backgroundSize: "8px 8px",
        }}
      >
        {grid.map((row, ry) =>
          row.map((hex, rx) => (
            <div
              key={`${ry}-${rx}`}
              className="absolute"
              style={{
                left: rx * CELL_SIZE,
                top: ry * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: hex ?? "transparent",
              }}
            />
          )),
        )}
        {/* 커서가 실제로 가리키는 중심 칸 강조 */}
        <div
          className="pointer-events-none absolute border-2 border-violet-500"
          style={{
            left: center * CELL_SIZE,
            top: center * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
        />
      </div>
      <span className="font-mono text-[10px] text-gray-600">
        {centerHex ? centerHex.toUpperCase() : "—"}
      </span>
    </div>,
    document.body,
  );
}
