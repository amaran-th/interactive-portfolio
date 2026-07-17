"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Accordion({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    // 이 아코디언들이 나란히 쌓인 사이드바(flex-col)가 창 높이보다 좁을 때,
    // 내용이 긴 섹션(이미지 불러오기의 미리보기·팔레트 등) 하나가 무한정
    // 늘어나 사이드바 전체가 넘치고 그 아래 섹션·버튼까지 화면 밖으로
    // 잘려나갔다. flex-grow는 주지 않는다 — 내용이 짧을 때까지 남는 공간을
    // 억지로 채우면(예: 이미지를 아직 안 불러온 상태) 빈 여백만 커진다.
    // 열려 있을 때는 기본값(flex: 0 1 auto)대로 내용 크기만큼만 차지하되,
    // min-h-0으로 "내용 크기 밑으로는 못 줄어든다"는 플렉스 기본 제약만
    // 풀어준다 — 그래야 내용이 실제로 넘칠 때만 자기 몫 이상으로 안 커지고
    // 그 안에서 스크롤된다. 접혀 있을 때는 반대로 shrink-0을 줘 절대 줄어들지
    // 않게 한다 — 옆(또는 위) 아코디언이 아무리 커도 접힌 헤더 한 줄 높이는
    // 항상 보장돼야 한다(안 그러면 다른 섹션이 늘어날 때 접힌 줄이 찌그러졌다).
    <div
      className={`flex min-h-0 flex-col bg-white shadow-md ${open ? "" : "shrink-0"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
      >
        {title}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
