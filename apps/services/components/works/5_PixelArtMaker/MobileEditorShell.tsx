"use client";

import { Layers, Menu, Play, Redo2, Save, Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ToolMeta } from "./DrawToolbar";
import { COMPACT_SCROLLBAR, FLOATING_PANEL } from "./panelStyles";
import PenEraserIcon from "./PenEraserIcon";
import { Tool } from "./types";

export type MobileMoreItem =
  | { id: string; label: string; kind: "action"; onSelect: () => void }
  | {
      id: string;
      label: string;
      kind: "detail";
      // 렌더 프롭 — "레퍼런스" 항목이 이미지를 조정 모드로 고르는 순간
      // 데스크톱(narrow 아이콘열)처럼 팝오버를 닫아 캔버스의 조정 손잡이가
      // 보이게 해야 해서, 콘텐츠 쪽에서 팝오버를 닫을 수 있는 함수를
      // 받는다(단순 ReactNode면 이걸 할 수 없다). 안 쓰는 항목(파일/편집/
      // 불러오기/내보내기)은 인자를 무시한다.
      content: (closeAll: () => void) => React.ReactNode;
    };

export type MobileEditorShellProps = {
  hasActiveTab: boolean; // false면 "열린 파일 없음" 빈 상태를 보여준다
  fileName: string;
  fileNameReadOnly: boolean; // 배경화면 탭이면 데스크톱 제목표시줄과 동일하게 편집 불가
  onRenameFile: (name: string) => void;
  onExit: () => void;
  onSave: () => void;
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // 레이어/프레임 모드 선택 — 이 셸에서는 상단 바가 이 선택 UI를 담당한다
  // (데스크톱은 레이어 패널 자체에 있다). 하단 독의 세 번째 아이콘도 이
  // 값에 따라 "레이어"/"프레임"으로 라벨·아이콘이 바뀐다.
  layerMode: "layers" | "frames";
  onLayerModeChange: (mode: "layers" | "frames") => void;
  canvas: React.ReactNode;
  // 캔버스 뒤에 깔리는 배경색 — 데스크톱은 캔버스·툴바를 감싸는 행 전체에
  // 이 색을 깐다(ColorWheel에서 바꿀 수 있는 설정). 모바일도 같은 자리
  // (캔버스 래퍼)에 똑같이 적용해야 설정이 반영된다.
  canvasBgColor: string;
  // 캔버스 위 상단 중앙에 잠깐 떠 있는 배율 배지 — 핀치 줌 중이거나 좌하단
  // +/- 버튼을 막 눌렀을 때만 true(Editor.tsx가 계산해 내려준다). 좌하단에
  // 항상 떠 있던 배율 숫자를 모바일에서는 이 배지로 대체했다.
  zoomBadgeVisible: boolean;
  canvasZoom: number;
  // 지금 활성 도구 — 상단 모드 도구 줄의 활성 표시, 그리기 도구 그리드 안
  // 선택 표시 둘 다에 필요하다.
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  // 하단 독 맨 앞 "펜/지우개" 토글 버튼 — 이비스페인트처럼 펜·지우개를 한
  // 번 탭으로 오간다(그리기 도구 그리드를 열지 않아도 되는 지름길). 펜도
  // 지우개도 아닌 다른 도구가 활성일 때 누르면 펜으로 바뀐다. 아이콘
  // (PenEraserIcon)은 상태와 무관하게 항상 고정이고, 라벨·강조색만 지금
  // 활성 도구에 따라 바뀐다 — 선택할 때마다 아이콘이 다른 모양으로
  // 바뀌면 헷갈린다는 피드백으로, 아이콘을 바꾸는 대신 색으로만 구분한다.
  onToggleEraser: () => void;
  // 캔버스 위 상단 우측에 떠 있는 모드 도구 줄 — 선택·올가미·이동·자동
  // 선택 4개, 탭하면 즉시 전환된다(ibisPaint처럼 다시 탭해도 옵션이 열리지
  // 않는다 — 옵션은 항상 아래 optionsSections에 떠 있으므로 따로 열 필요가
  // 없다).
  modeTools: ToolMeta[];
  // 하단 독의 "그리기 도구" 버튼에 보여줄 아이콘 — 지금 활성 도구가 그리기
  // 도구 8개 중 하나면 그 아이콘, 아니면(모드 도구가 활성이면) 고정 펜슬
  // 아이콘(Editor.tsx가 계산해 내려준다).
  drawToolButtonIcon: ToolMeta["icon"];
  // "그리기 도구" 팝오버에 그려 넣을 8개 도구 그리드 — moreItems의 detail
  // 항목과 같은 render-prop 패턴(골라서 팝오버를 닫는 동작까지 콘텐츠
  // 쪽에서 하므로 콜백을 받는다).
  drawToolsPanel: (closeAll: () => void) => React.ReactNode;
  // 지금 활성 도구의 하위 옵션 섹션(buildSecondarySections 결과, Editor.tsx가
  // 계산) — 하단 메인 줄 바로 위에 상시 노출되는 strip 하나로 모아 그린다.
  // 빈 배열이면 strip 자체가 안 보인다(텍스트 도구처럼 옵션이 없는 도구).
  optionsSections: { key: string; node: React.ReactNode }[];
  // 하단 독의 "색상" 탭 아이콘을 팔레트 모양 대신 지금 활성 색상 스와치로
  // 보여주기 위한 값 — 다른 드로잉 앱들처럼 탭을 열지 않아도 지금 어떤
  // 색을 쓰고 있는지 한눈에 보이게 한다.
  activeColorHex: string;
  colorPanel: React.ReactNode;
  layerPanel: React.ReactNode;
  moreItems: MobileMoreItem[];
  onNewTab: () => void;
  onOpenExisting: () => void;
};

type PopoverKind = "tools" | "color" | "layers" | "more" | null;

const POPOVER_MARGIN = 8; // 화면 가장자리에서 최소로 띄우는 여백 — mb-2와 같은 0.5rem

export default function MobileEditorShell({
  hasActiveTab,
  fileName,
  fileNameReadOnly,
  onRenameFile,
  onExit,
  onSave,
  saveError,
  showSavedNotice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layerMode,
  onLayerModeChange,
  canvas,
  canvasBgColor,
  zoomBadgeVisible,
  canvasZoom,
  tool,
  onToolChange,
  onToggleEraser,
  modeTools,
  drawToolButtonIcon,
  drawToolsPanel,
  optionsSections,
  activeColorHex,
  colorPanel,
  layerPanel,
  moreItems,
  onNewTab,
  onOpenExisting,
}: MobileEditorShellProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [moreDetail, setMoreDetail] = useState<string | null>(null);
  const [popoverLeft, setPopoverLeft] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const layersBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const btnRefFor = (kind: Exclude<PopoverKind, null>) =>
    kind === "tools"
      ? toolsBtnRef
      : kind === "color"
        ? colorBtnRef
        : kind === "layers"
          ? layersBtnRef
          : moreBtnRef;

  const closeAll = () => {
    setOpenPopover(null);
    setMoreDetail(null);
  };

  const toggle = (kind: Exclude<PopoverKind, null>) => {
    setOpenPopover((cur) => (cur === kind ? null : kind));
    setMoreDetail(null);
  };

  // 팝오버는 자신을 연 독 아이콘 바로 위(가운데)에 뜬다 — 4개 아이콘이 늘
  // 같은 자리에 있지 않고, 팝오버 폭도 종류마다 다르므로(레이어/프레임만
  // 고정 폭, 나머지는 내용에 맞춘 폭) 매번 팝오버 자신의 실제 렌더 폭과
  // 그 아이콘의 실제 위치를 재서 dockRef 기준 left를 계산한다
  // (ContextMenu·PaletteModal 등 이 편집기의 다른 팝업들과 같은
  // "컨테이너 기준 rect 계산" 패턴).
  useLayoutEffect(() => {
    if (!openPopover) return;
    const place = () => {
      const btn = btnRefFor(openPopover).current;
      const dock = dockRef.current;
      const popover = popoverRef.current;
      if (!btn || !dock || !popover) return;
      const btnRect = btn.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const popoverWidth = popover.getBoundingClientRect().width;
      const btnCenter = btnRect.left - dockRect.left + btnRect.width / 2;
      const maxLeft = dockRect.width - popoverWidth - POPOVER_MARGIN;
      const left = Math.max(
        POPOVER_MARGIN,
        Math.min(btnCenter - popoverWidth / 2, Math.max(maxLeft, POPOVER_MARGIN)),
      );
      setPopoverLeft(left);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [openPopover, moreDetail]);

  // 독(팝오버 + 하단 아이콘 바) 바깥을 누르면 닫는다 — ContextMenu.tsx와
  // 같은 mousedown 패턴. 독 자체(아이콘 버튼 포함)는 ref 안에 있으므로
  // 아이콘을 다시 눌러 토글하는 동작과 충돌하지 않는다.
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openPopover]);

  if (!hasActiveTab) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        {/* 데스크톱 제목표시줄과 동일하게, 열린 파일이 없어도 나가기 버튼은
            남겨둔다 — 없으면 갤러리로 돌아갈 방법이 없는 막다른 화면이 된다. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2 py-1.5">
          <button
            onClick={onExit}
            title="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
          >
            ‹
          </button>
          <span className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-gray-400">
            편집기
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-gray-50 text-center">
          <p className="text-sm text-gray-400">열린 파일이 없습니다</p>
          <p className="text-xs text-gray-300">
            <button
              onClick={onNewTab}
              className="text-violet-500 underline underline-offset-2"
            >
              새로 만들기
            </button>
            {" 또는 "}
            <button
              onClick={onOpenExisting}
              className="text-violet-500 underline underline-offset-2"
            >
              열기
            </button>
          </p>
        </div>
      </div>
    );
  }

  const activeMoreItem = moreItems.find(
    (m): m is Extract<MobileMoreItem, { kind: "detail" }> =>
      m.kind === "detail" && m.id === moreDetail,
  );

  let popoverContent: React.ReactNode = null;
  if (openPopover === "tools") popoverContent = drawToolsPanel(closeAll);
  else if (openPopover === "color") popoverContent = colorPanel;
  else if (openPopover === "layers") popoverContent = layerPanel;
  else if (openPopover === "more") {
    popoverContent = activeMoreItem ? (
      <div className="p-3">
        <button
          onClick={() => setMoreDetail(null)}
          className="mb-2 flex items-center gap-1 text-xs text-violet-600"
        >
          ‹ 목록으로
        </button>
        {activeMoreItem.content(closeAll)}
      </div>
    ) : (
      <div className="flex flex-col divide-y divide-gray-100">
        {moreItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.kind === "action") {
                item.onSelect();
                closeAll();
              } else {
                setMoreDetail(item.id);
              }
            }}
            className="flex items-center justify-between px-3 py-3 text-left text-sm text-gray-800"
          >
            {item.label}
            {item.kind === "detail" && (
              <span className="text-gray-300">›</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  const DrawToolIcon = drawToolButtonIcon;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 상단 바 — 되돌리기/다시실행은 엄지가 닿기 먼 자리라는 피드백으로
          여기서 빼고 캔버스 위 좌상단 오버레이로 옮겼다(아래 캔버스 래퍼). */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-2 py-1.5">
        <button
          onClick={onExit}
          title="닫기"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          ‹
        </button>
        <input
          value={fileName}
          readOnly={fileNameReadOnly}
          onChange={(e) => onRenameFile(e.target.value)}
          className="min-w-0 flex-1 truncate border-none bg-transparent px-1 text-sm font-semibold text-gray-900 outline-none"
        />
        {saveError && (
          <span className="shrink-0 text-[10px] font-semibold text-red-500">
            저장 실패
          </span>
        )}
        {!saveError && showSavedNotice && (
          <span className="shrink-0 text-[10px] font-semibold text-green-600">
            저장됨
          </span>
        )}
        {/* 레이어/프레임 모드 선택 — 데스크톱에서는 레이어 패널 안에 있는
            토글을 여기(상단 바)로 옮겼다. 버튼 두 개 대신 하나로 눌러
            전환하는 토글 버튼 하나로 둔다 — 지금 모드의 아이콘을 보여주고
            누르면 반대 모드로 바뀐다(하단 독의 표시와 항상 같은 아이콘). */}
        <button
          onClick={() =>
            onLayerModeChange(layerMode === "layers" ? "frames" : "layers")
          }
          title={
            layerMode === "layers" ? "프레임 모드로 전환" : "레이어 모드로 전환"
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-violet-50 text-violet-600"
        >
          {layerMode === "frames" ? (
            <Play className="h-4 w-4" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onSave}
          title="저장"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          <Save className="h-4 w-4" />
        </button>
      </div>

      {/* 캔버스 — 상단 좌측에 되돌리기/다시실행, 상단 우측에 모드 도구 줄,
          하단 중앙에 상시 노출 옵션 strip을 전부 오버레이로 띄운다. 기존
          줌 컨트롤(canvasArea 안, bottom-2 left-2)과 같은 "relative 래퍼
          안에 absolute" 관례를 그대로 따른다. 캔버스를 가리지 않도록 각
          오버레이의 바깥 래퍼는 pointer-events-none으로 두고, 실제 컨트롤이
          있는 안쪽 패널에만 pointer-events-auto를 되돌려 그 자리만 탭을
          가로채게 한다 — 패널 바깥(빈 캔버스)은 그대로 탭해서 그릴 수 있다. */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden p-2"
        style={{ backgroundColor: canvasBgColor }}
      >
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {canvas}
          <div className="pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="되돌리기"
              className={`pointer-events-auto flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30 ${FLOATING_PANEL}`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="다시실행"
              className={`pointer-events-auto flex h-8 w-8 items-center justify-center text-gray-600 disabled:opacity-30 ${FLOATING_PANEL}`}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
            {modeTools.map(({ tool: t, icon: Icon, label, key }) => (
              <button
                key={t}
                onClick={() => onToolChange(t)}
                title={`${label} (${key})`}
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center ring-1 ring-gray-300 shadow-xl shadow-gray-900/15 ${
                  tool === t ? "bg-violet-500 text-white" : "bg-white text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {/* 배율 배지 — 핀치 줌 중이거나 좌하단 +/- 버튼을 막 눌렀을 때만
              잠깐 보인다(zoomBadgeVisible, Editor.tsx 계산). 좌하단에 항상
              떠 있던 배율 숫자를 모바일에서는 이걸로 대체했다. */}
          {zoomBadgeVisible && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white tabular-nums">
              {Math.round(canvasZoom * 10) / 10}x
            </div>
          )}
          {/* 상시 노출 옵션 strip — 도구를 다시 탭해야 열리던 기존(세로 열)
              방식과 달리, 하단에 항상 떠 있는다. 섹션 계산
              (buildSecondarySections) 자체는 desktop과 완전히 동일하게
              공유하고, 패널 하나에 가로로(넘치면 줄바꿈) 모으는 감싸는
              방식과 캔버스 위에 오버레이로 띄우는 위치만 여기 전용이다.
              옵션이 없는 도구(텍스트)는 배열이 비어 있어 strip 자체가
              렌더되지 않아 캔버스 하단이 그만큼 그대로 드러난다. */}
          {optionsSections.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center px-2">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-start justify-center gap-2 bg-white/70 p-2 ring-1 ring-gray-300 shadow-xl shadow-gray-900/15">
                {optionsSections.map(({ key, node }) => (
                  <div key={key}>{node}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 독 + 그 위 팝오버 — 기존 FLOATING_PANEL 패턴 그대로. 그리기
          도구가 첫 번째 자리로 새로 들어오고, 레이어/프레임만 내용량 차이가
          커서 최소 높이 + 고정 폭을 주고, 나머지(그리기 도구/색상/더보기)는
          내용 크기 그대로 두되 화면 밖으로 넘치지 않게 최대 높이만 잡는다. */}
      <div ref={dockRef} className="relative">
        {openPopover && (
          <div
            ref={popoverRef}
            style={{ left: popoverLeft }}
            className={`absolute bottom-full z-40 mb-2 flex max-w-[calc(100vw-1rem)] flex-col overflow-y-auto ${
              openPopover === "layers"
                ? "min-h-[280px] max-h-[65vh] w-72"
                : openPopover === "more"
                  ? "max-h-[70vh] w-64"
                  : "max-h-[70vh]"
            } ${FLOATING_PANEL} ${COMPACT_SCROLLBAR}`}
          >
            {popoverContent}
          </div>
        )}
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            onClick={onToggleEraser}
            title={tool === "eraser" ? "지우개" : "펜"}
            className="flex h-10 w-10 items-center justify-center text-gray-500"
          >
            <PenEraserIcon className="h-5 w-5" />
          </button>
          <button
            ref={toolsBtnRef}
            onClick={() => toggle("tools")}
            title="그리기 도구"
            className={`flex h-10 w-10 items-center justify-center ${
              openPopover === "tools" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <DrawToolIcon className="h-5 w-5" />
          </button>
          <button
            ref={colorBtnRef}
            onClick={() => toggle("color")}
            title="색상"
            className={`flex h-10 w-10 items-center justify-center ${
              openPopover === "color" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <span
              className="h-5 w-5 rounded-full ring-1 ring-inset ring-gray-300"
              style={{ backgroundColor: activeColorHex }}
            />
          </button>
          <button
            ref={layersBtnRef}
            onClick={() => toggle("layers")}
            title={layerMode === "frames" ? "프레임" : "레이어"}
            className={`flex h-10 w-10 items-center justify-center ${
              openPopover === "layers" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            {layerMode === "frames" ? (
              <Play className="h-5 w-5" />
            ) : (
              <Layers className="h-5 w-5" />
            )}
          </button>
          <button
            ref={moreBtnRef}
            onClick={() => toggle("more")}
            title="더보기"
            className={`flex h-10 w-10 items-center justify-center ${
              openPopover === "more" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
