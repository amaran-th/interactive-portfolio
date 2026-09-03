"use client";

import { CircleHelp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CURSOR_POINTING } from "./cursors";

const TIP_WIDTH = 224; // w-56
const MARGIN = 8; // 뷰포트 가장자리에서 최소한 이만큼 띄운다.

// 옵션 라벨 옆에 붙이는 "?" 도움말 아이콘 — hover하면 설명 말풍선이 뜬다.
// 말풍선은 좁은 사이드 패널의 overflow에 잘리지 않도록 document.body로 포털하고,
// 뷰포트 밖으로 나가지 않게 가로는 화면 안으로 클램프, 세로는 위 공간이 모자라면
// 아이콘 아래로 뒤집는다. 스타일은 서비스의 violet 계열 — 경고(amber)와 짝을
// 이루는 정보/도움말 톤.
export default function HelpTip({ text }: { text: string }) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });

  useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return;
    const tip = tipRef.current.getBoundingClientRect();
    const cx = anchor.left + anchor.width / 2;
    const left = Math.min(
      Math.max(cx - tip.width / 2, MARGIN),
      window.innerWidth - tip.width - MARGIN,
    );
    // 기본은 아이콘 위. 위 공간이 모자라면 아래로.
    const above = anchor.top - MARGIN - tip.height;
    const top = above >= MARGIN ? above : anchor.bottom + MARGIN;
    setStyle({ top, left });
  }, [anchor, text]);

  return (
    <span
      ref={iconRef}
      onMouseEnter={() =>
        setAnchor(iconRef.current?.getBoundingClientRect() ?? null)
      }
      onMouseLeave={() => setAnchor(null)}
      // <label> 안에 들어가는 경우가 있어, 클릭이 라벨의 연결 컨트롤(슬라이더
      // 등)로 새지 않게 막는다.
      onClick={(e) => e.preventDefault()}
      // cursor-help(OS 물음표 커서)은 편집기 커스텀 커서를 깨뜨린다 — 다른
      // 인터랙션 요소와 같은 포인팅 커서로 맞춘다.
      style={{ cursor: CURSOR_POINTING }}
      className={`inline-flex shrink-0 align-middle transition-colors ${
        anchor ? "text-violet-500" : "text-gray-400 hover:text-violet-500"
      }`}
      aria-label={text}
    >
      <CircleHelp className="h-3.5 w-3.5" />
      {anchor &&
        createPortal(
          <span
            ref={tipRef}
            style={{ top: style.top, left: style.left, width: TIP_WIDTH }}
            className="pointer-events-none fixed z-100 border-l-2 border-violet-400 bg-white px-2.5 py-1.5 text-[11px] font-normal leading-snug text-gray-600 shadow-lg ring-1 ring-violet-200/70"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
