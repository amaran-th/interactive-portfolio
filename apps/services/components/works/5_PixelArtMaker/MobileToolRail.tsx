"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  buttonRef,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: typeof Paintbrush;
  // 이 버튼의 화면 위치를 재서 그 높이에 옵션 플라이아웃을 맞추기 위한 ref.
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
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

// "+" 버튼은 어떤 Tool에도 속하지 않으므로 버튼 ref 맵에서 별도 키를 쓴다.
const MORE_BUTTON_KEY = "__more__";

// 세로 도구 열 — 팝오버를 열지 않고 탭 한 번으로 도구를 바꾸는 드로잉 앱
// (ibisPaint·미디방페인트 등) 관례를 따른다. 도구별 하위 옵션(브러시 크기·
// 채우기 모드 등) 계산은 DrawToolbar.tsx가 그대로 맡고, 이 컴포넌트는 그
// 결과물(optionsContent)을 그리기만 한다 — 옵션 계산 로직을 여기서 새로
// 만들지 않는다.
//
// 도구 열 자체는 캔버스 위에 뜨는 오버레이가 아니라, MobileEditorShell이
// 마련해 둔 실제 레이아웃 칸(railSlot)에 포털로 들어간다 — 그래야 캔버스가
// 그 폭만큼 줄어들어 밀려나고, 도구 열이 캔버스 일부를 "가려서 못 그리는"
// 문제 자체가 생기지 않는다(반투명하게 하거나 드래그로 옮기는 식의 땜질은
// 입력 자체를 막는 문제를 안 풀어서 폐기했다). "+" 목록·옵션 패널은 반대로
// 자리를 차지하면 안 되므로(열고 닫을 때마다 캔버스가 또 밀리면 안 된다)
// 그대로 오버레이로 띄운다.
//
// "+" 목록과 옵션 패널은 서로 독립된 상태(moreOpen/optionsOpen)다 — "+"로
// 고른 도구(직선·사각형 등)의 옵션을 열어도 "+" 목록 자체는 계속 보여야
// 하므로, 옵션이 열렸다고 목록을 닫지 않는다. 옵션 패널은 항상 "지금
// 보이는" 아이콘 열 바로 오른쪽에 붙는다 — 기본 도구면 도구 열(=캔버스
// 왼쪽 가장자리) 오른쪽에, "+"로 고른 도구면 "+" 목록 오른쪽에.
export default function MobileToolRail({
  primaryTools,
  moreTools,
  tool,
  onToolChange,
  optionsContent,
  railSlot,
}: {
  primaryTools: ToolMeta[];
  moreTools: ToolMeta[];
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  optionsContent: React.ReactNode;
  // MobileEditorShell이 캔버스 옆에 마련해 둔 레이아웃 칸의 실제 DOM 노드 —
  // 콜백 ref로 상태에 담아야 마운트된 다음 렌더에서 전달되므로 처음 한두
  // 렌더는 null일 수 있다(그동안은 포털을 그리지 않는다).
  railSlot: HTMLDivElement | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [optionsTop, setOptionsTop] = useState(0);
  const [moreTop, setMoreTop] = useState(0);

  const isMoreTool = moreTools.some((m) => m.tool === tool);

  // 옵션 패널의 세로 중심을 지금 활성 도구의 아이콘 버튼과 맞춘다 — 기본
  // 도구면 도구 열 안의 버튼, "+"로 고른 도구면 "+" 목록 안의 버튼을 쓴다
  // (둘 다 같은 buttonRefs 맵에 tool을 키로 등록돼 있다). 도구 열이
  // railSlot(실제 레이아웃 칸)과 옵션 패널이 뜨는 캔버스 래퍼는 같은 높이의
  // 형제 요소라 위쪽 기준이 같으므로, 도구 열 쪽에서 잰 offsetTop을 캔버스
  // 래퍼 기준 top 값으로 그대로 써도 된다.
  useLayoutEffect(() => {
    if (!optionsOpen) return;
    const btn = buttonRefs.current.get(tool);
    if (!btn) return;
    setOptionsTop(btn.offsetTop + btn.offsetHeight / 2);
  }, [optionsOpen, tool]);

  // "+" 목록 패널 자체의 세로 중심은 "+" 버튼과 맞춘다 — 옵션 패널과는
  // 별개 계산이다(위는 활성 도구 기준, 이건 "+" 버튼 기준).
  useLayoutEffect(() => {
    if (!moreOpen) return;
    const btn = buttonRefs.current.get(MORE_BUTTON_KEY);
    if (!btn) return;
    setMoreTop(btn.offsetTop + btn.offsetHeight / 2);
  }, [moreOpen]);

  // 도구를 고르는 첫 탭은 선택만 하고 옵션을 자동으로 열지 않는다 — 옵션
  // 패널이 캔버스 일부를 가리므로, 도구를 바꾸자마자 뜨면 방금 바꾼 도구로
  // 그리려는 자리를 오히려 가릴 수 있다. 이미 활성인 도구를 한 번 더
  // 탭해야(아래 t === tool 분기) 그제서야 옵션이 열린다.
  const selectTool = (t: Tool) => {
    if (t === tool) {
      if (optionsContent === null) return;
      setOptionsOpen((o) => !o);
      return;
    }
    onToolChange(t);
    setOptionsOpen(false);
    setMoreOpen(false);
  };

  // "+" 목록 안에서 고를 때는 다른 도구 열 버튼과 달리 목록을 닫지 않는다 —
  // 직선·사각형·원·텍스트·그라데이션을 번갈아 써볼 때마다 "+"를 다시 열 필요가
  // 없게.
  const selectFromMore = (t: Tool) => {
    if (t === tool) {
      if (optionsContent === null) return;
      setOptionsOpen((o) => !o);
      return;
    }
    onToolChange(t);
    setOptionsOpen(false);
  };

  const closeAll = () => {
    setMoreOpen(false);
    setOptionsOpen(false);
  };

  // 옵션 패널은 두 군데서 재사용되는데, 그 둘의 기준점(positioned ancestor)이
  // 다르다 — 기본 도구용(anchorLeftFull=false)은 도구 열이 포털로 빠져나가
  // 이 컴포넌트 자신의 루트에서 바로 그려지므로, 가장 가까운 positioned
  // 조상이 캔버스 래퍼 자신이라 그 왼쪽 가장자리(left-0)가 곧 도구 열
  // 오른쪽이다 — 도구 열과 캔버스 래퍼 사이는 이미 MobileEditorShell의
  // 레이아웃 간격(gap-2)이 있으므로 여기선 추가 마진을 두지 않는다. "+"
  // 목록용(anchorLeftFull=true)은 "+" 목록 패널과 같은 래퍼 안에 나란히
  // 들어가므로, left-0을 쓰면 "+" 목록 패널과 같은 자리에서 시작해
  // 겹쳐버린다 — left-full을 써야 그 래퍼의 실제 폭(="+" 목록 패널의 폭,
  // 옵션 패널 자신은 absolute라 폭 계산에서 빠진다) 만큼 오른쪽으로 밀려
  // "+" 목록 바로 옆에 붙는다. 이쪽은 별도 레이아웃 간격이 없으므로 작게
  // 마진을 둔다.
  //
  // 너비는 w-max(내용에 맞춤)로 두면 안 된다 — secondarySections 안의
  // 각 섹션(DrawToolbar.tsx, desktop과 공유)은 줄바꿈 가능한
  // flex-wrap 묶음인데, w-max는 "줄바꿈 없이 한 줄로 쭉 늘어놓았을 때의
  // 폭"을 기준으로 삼는다 — 그 폭이 max-width보다 크면 패널은 결국
  // max-width 값 그대로 렌더링되고, 그 안에서 줄바꿈된 각 줄은 실제로
  // 필요한 폭보다 훨씬 좁아 줄마다 어색한 빈 공간이 남는다. 그렇다고
  // w-min(내용물 중 가장 넓은 한 덩어리 기준)을 쓰면 반대로 거의 모든
  // 묶음이 한 줄에 하나씩만 들어가 지나치게 세로로 늘어진다. 고정 폭을
  // 줘서 작은 묶음 2~3개는 같은 줄에 묶이고, 가장 넓은 덩어리만 자기
  // 줄을 차지하는 "적당한" 줄바꿈 지점을 직접 고른다.
  const renderOptionsPanel = (anchorLeftFull: boolean) =>
    optionsOpen && optionsContent ? (
      <div
        style={{ top: optionsTop }}
        className={`absolute ${anchorLeftFull ? "left-full ml-1" : "left-0"} z-20 max-h-[50vh] w-[220px] -translate-y-1/2 overflow-x-auto overflow-y-auto ${FLOATING_PANEL}`}
      >
        {optionsContent}
      </div>
    ) : null;

  const railPanel = (
    <div
      className={`flex max-h-full flex-col gap-1.5 overflow-y-auto p-1.5 ${FLOATING_PANEL}`}
    >
      {primaryTools.map(({ tool: t, icon, label, key }) => (
        <RailButton
          key={t}
          buttonRef={(el) => {
            if (el) buttonRefs.current.set(t, el);
            else buttonRefs.current.delete(t);
          }}
          active={tool === t}
          onClick={() => selectTool(t)}
          title={`${label} (${key})`}
          icon={icon}
        />
      ))}
      <div className="h-px bg-gray-200" />
      <RailButton
        buttonRef={(el) => {
          if (el) buttonRefs.current.set(MORE_BUTTON_KEY, el);
          else buttonRefs.current.delete(MORE_BUTTON_KEY);
        }}
        active={moreOpen || isMoreTool}
        onClick={() => {
          // 기본 도구의 옵션 패널은 "+" 목록과 같은 자리(left-0)에 뜨므로
          // "+"를 열 때 같이 떠 있으면 겹친다 — "+"를 누르면(열든 닫든)
          // 옵션 패널은 항상 닫는다.
          setMoreOpen((o) => !o);
          setOptionsOpen(false);
        }}
        title="도형·텍스트·그라데이션 도구 더보기"
        icon={Plus}
      />
    </div>
  );

  return (
    <>
      {/* 도구 열은 더 이상 여기(캔버스 래퍼) 안에 그리지 않고 railSlot으로
          포털한다 — railSlot이 아직 없으면(첫 렌더) 잠깐 아무것도 그리지
          않는다. */}
      {railSlot && createPortal(railPanel, railSlot)}
      {(moreOpen || optionsOpen) && (
        <div className="absolute inset-0 z-10" onClick={closeAll} />
      )}
      {/* 기본 도구(도구 열에 직접 보이는 도구)의 옵션은 캔버스 왼쪽
          가장자리(= 도구 열 바로 오른쪽)에 붙는다. */}
      {!isMoreTool && renderOptionsPanel(false)}
      {moreOpen && (
        <div
          style={{ top: moreTop }}
          className="absolute left-0 z-20 ml-2 -translate-y-1/2"
        >
          <div
            className={`flex w-max flex-col gap-1.5 p-1.5 ${FLOATING_PANEL}`}
          >
            {moreTools.map(({ tool: t, icon, label, key }) => (
              <RailButton
                key={t}
                buttonRef={(el) => {
                  if (el) buttonRefs.current.set(t, el);
                  else buttonRefs.current.delete(t);
                }}
                active={tool === t}
                onClick={() => selectFromMore(t)}
                title={`${label} (${key})`}
                icon={icon}
              />
            ))}
          </div>
          {/* "+"로 고른 도구의 옵션은 "+" 목록 자체를 닫지 않고 그 바로
              오른쪽에 붙는다 — 세 번째 열처럼 이어져 보인다. */}
          {isMoreTool && renderOptionsPanel(true)}
        </div>
      )}
    </>
  );
}
