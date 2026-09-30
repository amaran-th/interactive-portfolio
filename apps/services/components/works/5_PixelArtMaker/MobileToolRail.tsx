"use client";

import { useEffect, useRef, useState } from "react";
import { Paintbrush, Plus } from "lucide-react";
import { FLOATING_PANEL } from "./panelStyles";
import { Tool } from "./types";

type ToolMeta = {
  tool: Tool;
  icon: typeof Paintbrush;
  label: string;
  key: string;
};

function RailButton({
  active,
  onClick,
  title,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: typeof Paintbrush;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-violet-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// 캔버스 왼쪽에 항상 떠 있는 세로 도구 열 — 팝오버를 열지 않고 탭 한 번으로
// 도구를 바꾸는 드로잉 앱(ibisPaint·미디방페인트 등) 관례를 따른다. 도구별
// 하위 옵션(브러시 크기·채우기 모드 등) 계산은 DrawToolbar.tsx가 그대로
// 맡고, 이 컴포넌트는 그 결과물(optionsContent)을 열 오른쪽 플라이아웃에
// 그리기만 한다 — 옵션 계산 로직을 여기서 새로 만들지 않는다.
export default function MobileToolRail({
  primaryTools,
  moreTools,
  tool,
  onToolChange,
  optionsContent,
}: {
  primaryTools: ToolMeta[];
  moreTools: ToolMeta[];
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  optionsContent: React.ReactNode;
}) {
  const [openFlyout, setOpenFlyout] = useState<"tool" | "more" | null>(null);

  // 도구가 바뀌면(세로 열이든 "+" 그리드든) 그 도구의 옵션을 자동으로 연다 —
  // 옵션이 없는 도구(예: 텍스트, optionsContent가 null)면 닫는다. 첫 마운트
  // 에는 실행하지 않는다(편집기를 열자마자 플라이아웃이 뜨는 건 원치 않는다).
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // tool이 바뀔 때만 반응해야 한다 — optionsContent가 다른 이유로 바뀌는
    // 경우(같은 도구를 쓰는 중 그라데이션 단계 수를 조정하는 등)에는 이미
    // 열려 있는 플라이아웃을 새로 열거나 닫지 않는다. optionsContent는 그
    // 시점의 최신 값을 읽기만 하므로 의존성 배열에서 의도적으로 뺀다.
    setOpenFlyout(optionsContent !== null ? "tool" : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const selectTool = (t: Tool) => {
    if (t === tool) {
      if (optionsContent === null) return;
      setOpenFlyout((cur) => (cur === "tool" ? null : "tool"));
      return;
    }
    onToolChange(t);
  };

  return (
    <>
      {openFlyout !== null && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setOpenFlyout(null)}
        />
      )}
      <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
        <div
          className={`flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto p-1.5 ${FLOATING_PANEL}`}
        >
          {primaryTools.map(({ tool: t, icon, label, key }) => (
            <RailButton
              key={t}
              active={tool === t}
              onClick={() => selectTool(t)}
              title={`${label} (${key})`}
              icon={icon}
            />
          ))}
          <div className="h-px bg-gray-200" />
          <RailButton
            active={openFlyout === "more" || moreTools.some((m) => m.tool === tool)}
            onClick={() =>
              setOpenFlyout((cur) => (cur === "more" ? null : "more"))
            }
            title="도형·텍스트·그라데이션 도구 더보기"
            icon={Plus}
          />
        </div>
        {openFlyout === "tool" && optionsContent && (
          <div className={`absolute left-full top-0 ml-2 ${FLOATING_PANEL}`}>
            {optionsContent}
          </div>
        )}
        {openFlyout === "more" && (
          <div
            className={`absolute left-full top-0 ml-2 grid grid-cols-3 gap-1.5 p-1.5 ${FLOATING_PANEL}`}
          >
            {moreTools.map(({ tool: t, icon, label, key }) => (
              <RailButton
                key={t}
                active={tool === t}
                onClick={() => selectTool(t)}
                title={`${label} (${key})`}
                icon={icon}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
