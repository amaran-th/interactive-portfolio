"use client";

import { Layers, Menu, Palette, PenTool, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FLOATING_PANEL } from "./panelStyles";

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
  onRenameFile: (name: string) => void;
  onExit: () => void;
  onSave: () => void;
  saveError: boolean;
  showSavedNotice: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canvas: React.ReactNode;
  toolPanel: React.ReactNode;
  colorPanel: React.ReactNode;
  layerPanel: React.ReactNode;
  moreItems: MobileMoreItem[];
  onNewTab: () => void;
  onOpenExisting: () => void;
};

type PopoverKind = "tools" | "color" | "layers" | "more" | null;

export default function MobileEditorShell({
  hasActiveTab,
  fileName,
  onRenameFile,
  onExit,
  onSave,
  saveError,
  showSavedNotice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canvas,
  toolPanel,
  colorPanel,
  layerPanel,
  moreItems,
  onNewTab,
  onOpenExisting,
}: MobileEditorShellProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [moreDetail, setMoreDetail] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpenPopover(null);
    setMoreDetail(null);
  };

  const toggle = (kind: Exclude<PopoverKind, null>) => {
    setOpenPopover((cur) => (cur === kind ? null : kind));
    setMoreDetail(null);
  };

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
  if (openPopover === "tools") popoverContent = toolPanel;
  else if (openPopover === "color") popoverContent = colorPanel;
  else if (openPopover === "layers") popoverContent = layerPanel;
  else if (openPopover === "more") {
    popoverContent = activeMoreItem ? (
      <div>
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
            className="flex items-center justify-between py-3 text-left text-sm text-gray-800"
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 상단 바 */}
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
        <button
          onClick={onSave}
          title="저장"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="되돌리기"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 disabled:opacity-30"
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="다시실행"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 disabled:opacity-30"
        >
          ↪
        </button>
      </div>

      {/* 캔버스 */}
      <div className="relative min-h-0 flex-1">{canvas}</div>

      {/* 하단 독 + 그 위 팝오버 — Editor.tsx:3399의 FLOATING_PANEL 패턴 그대로 */}
      <div ref={dockRef} className="relative">
        {openPopover && (
          <div
            className={`absolute bottom-full left-2 right-2 z-40 mb-2 flex max-h-[60vh] flex-col overflow-y-auto ${FLOATING_PANEL}`}
          >
            {popoverContent}
          </div>
        )}
        <div className="flex items-center justify-around border-t border-gray-200 bg-white py-1.5">
          <button
            onClick={() => toggle("tools")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "tools" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <PenTool className="h-5 w-5" />
            도구
          </button>
          <button
            onClick={() => toggle("color")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "color" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Palette className="h-5 w-5" />
            색상
          </button>
          <button
            onClick={() => toggle("layers")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "layers" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Layers className="h-5 w-5" />
            레이어
          </button>
          <button
            onClick={() => toggle("more")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              openPopover === "more" ? "text-violet-600" : "text-gray-500"
            }`}
          >
            <Menu className="h-5 w-5" />
            더보기
          </button>
        </div>
      </div>
    </div>
  );
}
