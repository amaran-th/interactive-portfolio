"use client";

import { Minus, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPixelArt,
  listPixelArt,
  PixelArt,
  savePixelArt,
  uid,
} from "../_shared/assetLibrary";
import ColorWheel from "./ColorWheel";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import ExportPanel from "./ExportPanel";
import {
  exportAsJPG,
  exportAsJSON,
  exportAsPNG,
  exportAsSVG,
} from "./exportPixelArt";
import ImportPanel from "./ImportPanel";
import NewCanvasDialog from "./NewCanvasDialog";
import PixelCanvas from "./PixelCanvas";
import { createGrid, getPixel, resizeGrid } from "./pixelGrid";
import ResizeCanvasDialog from "./ResizeCanvasDialog";
import Toolbar from "./Toolbar";
import { CANVAS_PRESETS, MirrorMode, Tool } from "./types";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import {
  getWallpaper,
  saveWallpaper,
  WALLPAPER_ID,
  WALLPAPER_NAME,
} from "./wallpaper";

// 클립스튜디오처럼 여러 파일을 탭으로 동시에 열어둘 수 있다. 활성 탭의 실제
// 편집 상태(doc/history/이름/hasMetaEdits)만 살아있는 hook 상태로 유지하고,
// 비활성 탭은 이 스냅샷 형태로만 보관한다(전환 시 되돌리기 스택은 초기화되지만
// 그림 내용은 그대로 보존된다).
type Tab = { doc: PixelArt; hasMetaEdits: boolean };

// 새 캔버스의 기본 팔레트 — 흰색·검은색과 색상환을 고르게 덮는 원색 8개, 총 10개.
const DEFAULT_PALETTE = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#ff8800",
  "#ffee00",
  "#22cc44",
  "#00bcd4",
  "#2266ff",
  "#8833ee",
  "#ee3399",
];

function blankDoc(width: number, height: number): PixelArt {
  return {
    id: uid(),
    name: "제목 없음",
    width,
    height,
    palette: [...DEFAULT_PALETTE],
    pixels: createGrid(width, height),
    createdAt: Date.now(),
  };
}

function resolveInitialDoc(docId: string | null): {
  doc: PixelArt;
  found: boolean;
} {
  if (docId === WALLPAPER_ID) return { doc: getWallpaper(), found: true };
  if (docId) {
    const existing = getPixelArt(docId);
    if (existing) return { doc: existing, found: true };
  }
  return {
    doc: blankDoc(CANVAS_PRESETS[0].width, CANVAS_PRESETS[0].height),
    found: false,
  };
}

export default function Editor({
  docId,
  startMode = "empty",
  onDirtyChange,
  onExit,
  closing,
}: {
  docId: string | null;
  // newCanvas: 편집창을 열자마자 새 캔버스 크기 선택 모달을 띄운다(데스크탑의
  // "새로 만들기" 바로가기). empty: 탭 없이 빈 화면으로 연다("편집기" 아이콘).
  // docId가 있으면(기존 파일을 직접 연 경우) 둘 다 무시되고 그 파일이 탭 하나로 열린다.
  startMode?: "newCanvas" | "empty";
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
  closing: boolean;
}) {
  const [initial] = useState(() => resolveInitialDoc(docId));
  const [tabs, setTabs] = useState<Tab[]>(() =>
    initial.found ? [{ doc: initial.doc, hasMetaEdits: false }] : [],
  );
  const [activeTabIndex, setActiveTabIndex] = useState(() =>
    initial.found ? 0 : -1,
  );
  const [doc, setDoc] = useState<PixelArt>(initial.doc);
  const [name, setName] = useState(initial.doc.name);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [hasMetaEdits, setHasMetaEdits] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  const [mirror, setMirror] = useState<MirrorMode>("none");
  const [showGrid, setShowGrid] = useState(true);
  const [brushSize, setBrushSize] = useState(1);
  const [filledShapes, setFilledShapes] = useState(false);
  // PixelCanvas가 Ctrl+스크롤로 자체 관리하는 확대 배율 — 뷰포트 좌측 하단에
  // 표시만 하기 위해 값을 그대로 올려받는다.
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [menuAnchor, setMenuAnchor] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  // 편집창 루트에 transform(scale)이 걸려 있어 position:fixed인 ContextMenu의
  // 좌표 기준점이 뷰포트가 아니라 이 루트가 된다 — 메뉴 좌표를 뷰포트 기준이
  // 아니라 이 루트 기준 상대좌표로 계산해야 편집창이 letterbox로 작아지거나
  // 가운데 정렬돼도 메뉴가 버튼 바로 아래에 정확히 뜬다.
  const rootRef = useRef<HTMLDivElement>(null);
  const [resizingCanvas, setResizingCanvas] = useState(false);
  const [showNewCanvasDialog, setShowNewCanvasDialog] = useState(
    !initial.found && startMode === "newCanvas",
  );
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [wantsAutoImport, setWantsAutoImport] = useState(false);
  const [pendingCloseTabIndex, setPendingCloseTabIndex] = useState<
    number | null
  >(null);
  const [pendingExit, setPendingExit] = useState(false);
  // localStorage 용량 초과 등으로 저장이 실패해도 이 앱은 토스트 UI가 없어
  // 조용히 묻히기 쉽다 — 제목표시줄에 잠깐 빨간 문구로 알려준다.
  const [saveError, setSaveError] = useState(false);
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flagSaveError = useCallback(() => {
    setSaveError(true);
    if (saveErrorTimeoutRef.current) clearTimeout(saveErrorTimeoutRef.current);
    saveErrorTimeoutRef.current = setTimeout(() => setSaveError(false), 4000);
  }, []);
  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current) clearTimeout(saveErrorTimeoutRef.current);
    };
  }, []);
  const isWallpaper = doc.id === WALLPAPER_ID;
  // 편집창이 데스크탑 위에 떠오르며 열리는 애니메이션 — 마운트 직후 한 프레임 뒤에
  // true로 바뀌면서 transition이 자연스럽게 재생된다(처음부터 true면 트랜지션 없이
  // 바로 켜진 상태로 나타난다).
  const [mounted, setMounted] = useState(false);

  const history = useCanvasHistory(initial.doc.pixels);
  const selection = useSelection();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 열린 모든 탭 중 하나라도 저장되지 않은 변경이 있으면 창을 닫을 때 경고한다.
  // 활성 탭은 라이브 상태(history.canUndo/hasMetaEdits)로, 비활성 탭은 마지막으로
  // 스냅샷에 저장해 둔 hasMetaEdits 플래그로 판단한다.
  useEffect(() => {
    const anyDirty = tabs.some((t, i) =>
      i === activeTabIndex ? history.canUndo || hasMetaEdits : t.hasMetaEdits,
    );
    onDirtyChange(anyDirty);
  }, [tabs, activeTabIndex, history.canUndo, hasMetaEdits, onDirtyChange]);

  // 다른 탭으로 전환하거나 탭을 닫기 전에, 지금 활성 탭의 라이브 편집 상태를
  // tabs 배열의 스냅샷으로 반영한다 — 안 그러면 방금까지 그리던 내용을 잃는다.
  // 되돌리기 스택(history)까지는 스냅샷에 담지 않으므로 이후 그 탭으로 돌아오면
  // 되돌리기 이력은 비어 있다(그림 내용 자체는 그대로 보존).
  const syncActiveTabSnapshot = useCallback(
    (list: Tab[]): Tab[] => {
      if (activeTabIndex < 0) return list;
      return list.map((t, i) =>
        i === activeTabIndex
          ? {
              doc: { ...doc, name, pixels: history.present },
              hasMetaEdits: hasMetaEdits || history.canUndo,
            }
          : t,
      );
    },
    [activeTabIndex, doc, name, history, hasMetaEdits],
  );

  const loadTab = useCallback(
    (tab: Tab, index: number) => {
      setDoc(tab.doc);
      setName(tab.doc.name);
      history.reset(tab.doc.pixels);
      setActiveColorIndex(0);
      setHasMetaEdits(tab.hasMetaEdits);
      setActiveTabIndex(index);
    },
    [history],
  );

  const switchToTab = useCallback(
    (index: number) => {
      if (index === activeTabIndex || index < 0 || index >= tabs.length) return;
      const synced = syncActiveTabSnapshot(tabs);
      setTabs(synced);
      loadTab(synced[index], index);
    },
    [activeTabIndex, tabs, syncActiveTabSnapshot, loadTab],
  );

  const openNewTab = useCallback(
    (newDoc: PixelArt, options?: { autoImport?: boolean }) => {
      const synced = syncActiveTabSnapshot(tabs);
      const newIndex = synced.length;
      setTabs([...synced, { doc: newDoc, hasMetaEdits: false }]);
      loadTab({ doc: newDoc, hasMetaEdits: false }, newIndex);
      setWantsAutoImport(!!options?.autoImport);
    },
    [tabs, syncActiveTabSnapshot, loadTab],
  );

  const closeTab = useCallback(
    (index: number) => {
      const remaining = tabs.filter((_, i) => i !== index);
      setTabs(remaining);
      if (index === activeTabIndex) {
        if (remaining.length === 0) {
          setActiveTabIndex(-1);
        } else {
          const nextIndex = Math.min(index, remaining.length - 1);
          loadTab(remaining[nextIndex], nextIndex);
        }
      } else if (index < activeTabIndex) {
        setActiveTabIndex((i) => i - 1);
      }
    },
    [tabs, activeTabIndex, loadTab],
  );

  const handleCreate = useCallback(
    (width: number, height: number, newName: string) => {
      const fresh = { ...blankDoc(width, height), name: newName };
      openNewTab(fresh);
      setShowNewCanvasDialog(false);
    },
    [openNewTab],
  );

  // 이미 열려 있는 탭이면 새로 추가하지 않고 그 탭으로 전환한다.
  const handleOpenExisting = useCallback(
    (art: PixelArt) => {
      const existingIndex = tabs.findIndex((t) => t.doc.id === art.id);
      if (existingIndex >= 0) {
        if (existingIndex !== activeTabIndex) switchToTab(existingIndex);
      } else {
        openNewTab(art);
      }
      setShowOpenDialog(false);
    },
    [tabs, activeTabIndex, switchToTab, openNewTab],
  );

  const handleStrokeEnd = useCallback(
    (next: number[]) => {
      history.push(next);
    },
    [history],
  );

  // 실행취소로 되돌릴 수 있으므로(다른 파괴적 동작들과 같은 관례) 별도 확인 없이
  // 바로 전체를 투명하게 지운다.
  const handleClearCanvas = useCallback(() => {
    history.push(createGrid(doc.width, doc.height));
  }, [history, doc.width, doc.height]);

  const handleSave = useCallback(() => {
    if (activeTabIndex < 0) return;
    // 배경화면은 이름이 고정("배경화면")이고 일반 픽셀아트 목록이 아닌
    // 별도 저장소(wallpaper.ts)에 저장된다.
    const toSave: PixelArt = {
      ...doc,
      name: isWallpaper ? WALLPAPER_NAME : name,
      pixels: history.present,
    };
    const ok = isWallpaper ? saveWallpaper(toSave) : savePixelArt(toSave);
    if (!ok) {
      flagSaveError();
      return;
    }
    setDoc(toSave);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
  }, [activeTabIndex, doc, name, history, isWallpaper, flagSaveError]);

  // 다른 이름으로 저장 — 원본(배경화면이라도)은 건드리지 않고 새 id로 일반
  // 픽셀아트 목록에 별도 항목을 만든 뒤, 이후 편집은 그 새 사본을 대상으로 한다.
  const handleSaveAs = useCallback(() => {
    if (activeTabIndex < 0) return;
    const newName = window.prompt(
      "다른 이름으로 저장",
      isWallpaper ? WALLPAPER_NAME : name,
    );
    if (!newName) return;
    const toSave: PixelArt = {
      ...doc,
      id: uid(),
      name: newName,
      pixels: history.present,
      createdAt: Date.now(),
    };
    const ok = savePixelArt(toSave);
    if (!ok) {
      flagSaveError();
      return;
    }
    setDoc(toSave);
    setName(newName);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
    setTabs((prev) =>
      prev.map((t, i) =>
        i === activeTabIndex ? { doc: toSave, hasMetaEdits: false } : t,
      ),
    );
  }, [activeTabIndex, doc, name, history, isWallpaper, flagSaveError]);

  // 캔버스 크기 수정 — 그림을 다시 늘리거나 줄이지 않고 경계만 바꾼다(왼쪽 위
  // 기준으로 자르거나 투명하게 늘림). 팔레트·이름 등 다른 속성은 그대로 둔다.
  const handleResizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      const resized = resizeGrid(
        history.present,
        doc.width,
        doc.height,
        newWidth,
        newHeight,
      );
      setDoc((d) => ({ ...d, width: newWidth, height: newHeight }));
      history.reset(resized);
      setResizingCanvas(false);
      setHasMetaEdits(true);
    },
    [doc.width, doc.height, history],
  );

  // 활성 탭은 라이브 상태(history.canUndo/hasMetaEdits)로, 비활성 탭은 마지막
  // 전환 시점에 스냅샷에 저장해 둔 hasMetaEdits로 저장되지 않은 변경이 있는지 본다.
  const isTabDirty = useCallback(
    (index: number) =>
      index === activeTabIndex
        ? history.canUndo || hasMetaEdits
        : (tabs[index]?.hasMetaEdits ?? false),
    [activeTabIndex, history.canUndo, hasMetaEdits, tabs],
  );

  // 탭을 직접 닫을 때(X 클릭)는 즉시 닫지 않고, 저장되지 않은 변경이 있으면
  // 클립스튜디오처럼 저장/저장 안 함/취소를 먼저 묻는다.
  const requestCloseTab = useCallback(
    (index: number) => {
      if (isTabDirty(index)) setPendingCloseTabIndex(index);
      else closeTab(index);
    },
    [isTabDirty, closeTab],
  );

  // 비활성 탭은 doc/history가 스냅샷으로만 존재하므로, 활성 탭의 handleSave와
  // 별도로 스냅샷을 직접 저장하는 경로가 필요하다.
  const saveTabSnapshot = useCallback(
    (tab: Tab) => {
      const isWp = tab.doc.id === WALLPAPER_ID;
      const toSave: PixelArt = isWp
        ? { ...tab.doc, name: WALLPAPER_NAME }
        : tab.doc;
      const ok = isWp ? saveWallpaper(toSave) : savePixelArt(toSave);
      if (!ok) flagSaveError();
    },
    [flagSaveError],
  );

  const handleCloseSave = useCallback(() => {
    if (pendingCloseTabIndex === null) return;
    const index = pendingCloseTabIndex;
    if (index === activeTabIndex) handleSave();
    else saveTabSnapshot(tabs[index]);
    setPendingCloseTabIndex(null);
    closeTab(index);
  }, [
    pendingCloseTabIndex,
    activeTabIndex,
    tabs,
    saveTabSnapshot,
    closeTab,
    handleSave,
  ]);

  const handleCloseDiscard = useCallback(() => {
    if (pendingCloseTabIndex === null) return;
    const index = pendingCloseTabIndex;
    setPendingCloseTabIndex(null);
    closeTab(index);
  }, [pendingCloseTabIndex, closeTab]);

  // 제목표시줄의 닫기(X) — 열린 탭 중 하나라도 저장되지 않은 변경이 있으면
  // 편집창 전체를 닫기 전에 한 번 더 확인한다(브라우저 beforeunload 경고와는
  // 별개로, 이 앱 안에서 편집창만 닫는 경우를 잡아준다).
  const handleExitClick = useCallback(() => {
    const anyDirty = tabs.some((_, i) => isTabDirty(i));
    if (anyDirty) setPendingExit(true);
    else onExit();
  }, [tabs, isTabDirty, onExit]);

  useKeyboardShortcuts({
    onToolChange: setTool,
    onUndo: history.undo,
    onRedo: history.redo,
    onCopy: () => selection.copy(history.present, doc.width),
    onPaste: () => {
      const next = selection.paste(
        history.present,
        doc.width,
        doc.height,
        0,
        0,
      );
      history.push(next);
    },
    onMirrorToggle: setMirror,
    onSave: handleSave,
  });

  const palette = doc.palette;

  const handleAddColor = useCallback(
    (hex: string) => {
      const newIndex = palette.length;
      setDoc((d) => ({ ...d, palette: [...d.palette, hex] }));
      setActiveColorIndex(newIndex);
      setHasMetaEdits(true);
    },
    [palette],
  );

  const handleRemoveColor = useCallback(
    (index: number) => {
      setDoc((d) => ({
        ...d,
        palette: d.palette.filter((_, i) => i !== index),
      }));
      // 제거된 색보다 뒤에 있던 활성 인덱스는 한 칸씩 당겨오고, 배열 끝을 넘어가면
      // 새 마지막 인덱스로 당겨온다 — 그대로 두면 활성 인덱스가 배열 밖을 가리켜
      // 색상환이 엉뚱한 색(기본 검정)을 편집하는 상태가 됐다.
      setActiveColorIndex((ai) => {
        const newLength = palette.length - 1;
        if (newLength <= 0) return 0;
        if (index < ai) return ai - 1;
        return Math.min(ai, newLength - 1);
      });
      setHasMetaEdits(true);
    },
    [palette],
  );

  // 색상환을 조작하면 현재 활성 팔레트 스와치 자체의 값을 실시간으로 갱신한다
  // (새 색을 "추가"하는 게 아니라 지금 선택된 색을 "수정"하는 것이 기본 동작) —
  // 이미 그 색으로 칠한 픽셀이 있어도 함께 바뀐다. 한때 새 스와치로 분기시키는
  // 방식을 시도했지만 사용해보니 불편하다는 피드백을 받아 되돌렸다.
  const handleChangeActiveColor = useCallback(
    (hex: string) => {
      setDoc((d) => {
        const nextPalette = d.palette.slice();
        nextPalette[activeColorIndex] = hex;
        return { ...d, palette: nextPalette };
      });
      setHasMetaEdits(true);
    },
    [activeColorIndex],
  );

  const handlePickColor = useCallback((colorIndex: number) => {
    setActiveColorIndex(colorIndex);
  }, []);

  // 진짜 PC 프로그램의 창처럼 제목표시줄(이름+닫기)과 그 아래 파일/편집 메뉴 바를
  // 분리한다 — 저장·내보내기·실행취소 같은 동작은 더 이상 제목표시줄에 흩어진
  // 버튼이 아니라 메뉴 항목으로 모은다. ContextMenu를 버튼 아래쪽에 앵커해 재사용한다.
  const openFileMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect();
      const noActiveTab = activeTabIndex < 0;
      setMenuAnchor({
        x: rect.left - (rootRect?.left ?? 0),
        y: rect.bottom - (rootRect?.top ?? 0),
        items: [
          { label: "새로 만들기", onClick: () => setShowNewCanvasDialog(true) },
          { label: "열기", onClick: () => setShowOpenDialog(true) },
          { label: "저장", onClick: handleSave, disabled: noActiveTab },
          {
            label: "다른 이름으로 저장",
            onClick: handleSaveAs,
            disabled: noActiveTab,
          },
          {
            label: "내보내기",
            disabled: noActiveTab,
            submenu: [
              {
                label: "PNG",
                onClick: () => exportAsPNG({ ...doc, pixels: history.present }),
              },
              {
                label: "SVG",
                onClick: () => exportAsSVG({ ...doc, pixels: history.present }),
              },
              {
                label: "JSON",
                onClick: () =>
                  exportAsJSON({ ...doc, pixels: history.present }),
              },
              {
                label: "JPG (손실 압축)",
                onClick: () => exportAsJPG({ ...doc, pixels: history.present }),
              },
            ],
          },
        ],
      });
    },
    [doc, history, handleSave, handleSaveAs, activeTabIndex],
  );

  const openEditMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect();
      const noActiveTab = activeTabIndex < 0;
      setMenuAnchor({
        x: rect.left - (rootRect?.left ?? 0),
        y: rect.bottom - (rootRect?.top ?? 0),
        items: [
          {
            label: "실행취소",
            onClick: history.undo,
            disabled: noActiveTab || !history.canUndo,
          },
          {
            label: "다시실행",
            onClick: history.redo,
            disabled: noActiveTab || !history.canRedo,
          },
          {
            label: "복사",
            onClick: () => selection.copy(history.present, doc.width),
            disabled: noActiveTab,
          },
          {
            label: "캔버스 크기 수정",
            onClick: () => setResizingCanvas(true),
            disabled: noActiveTab,
          },
          {
            label: "붙여넣기",
            onClick: () => {
              const next = selection.paste(
                history.present,
                doc.width,
                doc.height,
                0,
                0,
              );
              history.push(next);
            },
            disabled: noActiveTab,
          },
        ],
      });
    },
    [doc, history, selection, activeTabIndex],
  );

  return (
    <div
      ref={rootRef}
      className={`relative flex h-full w-full flex-col bg-white text-gray-900 transition-all duration-200 ease-out ${
        mounted && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      {/* 제목표시줄 — 메뉴 바·캔버스 영역의 무채색 배경과 구분되도록 바이올렛 톤을 준다. */}
      <div className="flex items-center gap-2 bg-violet-100 px-3 py-2">
        {activeTabIndex >= 0 ? (
          <input
            value={isWallpaper ? WALLPAPER_NAME : name}
            readOnly={isWallpaper}
            onChange={(e) => {
              if (isWallpaper) return;
              setName(e.target.value);
              setHasMetaEdits(true);
            }}
            className={`flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none ${isWallpaper ? "cursor-default" : ""}`}
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-gray-400">
            편집기
          </span>
        )}
        {saveError && <span className="text-[10px] font-semibold text-red-500">저장 실패</span>}
        {activeTabIndex >= 0 && (
          <button
            onClick={handleSave}
            title="저장"
            className="flex h-6 w-6 items-center justify-center bg-violet-500 text-white hover:bg-violet-600"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleExitClick}
          title="닫기"
          className="flex h-6 w-6 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 메뉴 바 */}
      <div className="flex items-center gap-0.5 bg-white px-2 py-1 shadow-sm">
        <button
          onClick={openFileMenu}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          파일
        </button>
        <button
          onClick={openEditMenu}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          편집
        </button>
      </div>

      {/* 탭 바 — 클립스튜디오처럼 여러 파일을 동시에 열어두고 전환한다 */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-0.5 overflow-x-auto bg-gray-50 px-2 py-1 shadow-sm">
          {tabs.map((tab, i) => (
            <div
              key={tab.doc.id}
              onClick={() => switchToTab(i)}
              className={`group flex shrink-0 cursor-pointer items-center gap-1.5 px-2.5 py-1 text-xs ${
                i === activeTabIndex
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className="max-w-[100px] truncate">
                {i === activeTabIndex ? name : tab.doc.name}
              </span>
              {/* 클립스튜디오처럼: 저장되지 않은 변경이 있으면 닫기(X) 대신 원형
                  점을 보여주고, 탭에 마우스를 올렸을 때만 X로 바뀌어 닫을 수 있다. */}
              {isTabDirty(i) ? (
                <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gray-500 group-hover:hidden"
                    title="저장되지 않은 변경 사항"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestCloseTab(i);
                    }}
                    className="hidden h-3.5 w-3.5 items-center justify-center text-gray-400 hover:text-gray-900 group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestCloseTab(i);
                  }}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400 hover:text-gray-900"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {menuAnchor && (
        <ContextMenu
          x={menuAnchor.x}
          y={menuAnchor.y}
          items={menuAnchor.items}
          onClose={() => setMenuAnchor(null)}
        />
      )}

      {activeTabIndex >= 0 ? (
        <div className="flex flex-1 gap-4 overflow-auto p-4">
          <div className="flex w-56 shrink-0 flex-col gap-3">
            <Toolbar
              tool={tool}
              onToolChange={setTool}
              mirror={mirror}
              onMirrorChange={setMirror}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={history.undo}
              onRedo={history.redo}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((g) => !g)}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              filledShapes={filledShapes}
              onToggleFilledShapes={() => setFilledShapes((f) => !f)}
              onClearCanvas={handleClearCanvas}
            />
            <ColorWheel
              palette={palette}
              activeColorIndex={activeColorIndex}
              onSelect={setActiveColorIndex}
              onChangeActiveColor={handleChangeActiveColor}
              onAddColor={handleAddColor}
              onRemoveColor={handleRemoveColor}
              tool={tool}
              onToolChange={setTool}
            />
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            <PixelCanvas
              width={doc.width}
              height={doc.height}
              palette={palette}
              pixels={history.present}
              tool={tool}
              mirror={mirror}
              activeColorIndex={activeColorIndex}
              selectionMask={selection.mask}
              showGrid={showGrid}
              brushSize={brushSize}
              filledShapes={filledShapes}
              onSelectionChange={selection.setMask}
              onStrokeEnd={handleStrokeEnd}
              onPickColor={handlePickColor}
              zoom={canvasZoom}
              onZoomChange={setCanvasZoom}
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
              <button
                onClick={() => setCanvasZoom((z) => Math.max(1, z - 1))}
                disabled={canvasZoom <= 1}
                title="축소"
                className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">{canvasZoom}x</div>
              <button
                onClick={() => setCanvasZoom((z) => Math.min(8, z + 1))}
                disabled={canvasZoom >= 8}
                title="확대"
                className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex w-60 shrink-0 flex-col gap-3">
            <ExportPanel doc={{ ...doc, pixels: history.present }} />
            <ImportPanel
              autoOpen={wantsAutoImport}
              onConfirm={(imported) => {
                // wantsAutoImport가 true인 경우는 "새로 만들기 → 이미지로
                // 불러오기"로 방금 만든, 아직 아무것도 그리지 않은 빈 캔버스다 —
                // 그 자리에 그대로 불러온 이미지 크기로 채운다.
                if (wantsAutoImport) {
                  setDoc((d) => ({
                    ...d,
                    width: imported.width,
                    height: imported.height,
                    palette: imported.palette,
                  }));
                  history.reset(imported.pixels);
                  setHasMetaEdits(true);
                  setWantsAutoImport(false);
                  return;
                }
                // 그 외에는 지금 열려 있던(이미 그려뒀을 수 있는) 캔버스를 건드리지
                // 않고, 불러온 이미지를 새 탭으로 연다 — 이미지 불러오기가 편집
                // 중인 캔버스의 크기를 바꾸지 않아야 한다.
                openNewTab({
                  id: uid(),
                  name: "제목 없음",
                  width: imported.width,
                  height: imported.height,
                  palette: imported.palette,
                  pixels: imported.pixels,
                  createdAt: Date.now(),
                });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-gray-400">열린 파일이 없습니다</p>
          <p className="text-xs text-gray-300">
            <button
              onClick={() => setShowNewCanvasDialog(true)}
              className="text-violet-400 underline underline-offset-2 hover:text-violet-500"
            >
              새로 만들기
            </button>
            {" 또는 "}
            <button
              onClick={() => setShowOpenDialog(true)}
              className="text-violet-400 underline underline-offset-2 hover:text-violet-500"
            >
              열기
            </button>
            를 선택하세요
          </p>
        </div>
      )}

      {showNewCanvasDialog && (
        <NewCanvasDialog
          onSelect={handleCreate}
          onImportImage={() => {
            const fresh = blankDoc(
              CANVAS_PRESETS[0].width,
              CANVAS_PRESETS[0].height,
            );
            openNewTab(fresh, { autoImport: true });
            setShowNewCanvasDialog(false);
          }}
          onCancel={() => setShowNewCanvasDialog(false)}
        />
      )}

      {showOpenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex max-h-96 w-72 flex-col bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">열기</h2>
            {listPixelArt().length === 0 ? (
              <p className="text-xs text-gray-400">저장된 작품이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-1 overflow-auto">
                {listPixelArt().map((art) => (
                  <button
                    key={art.id}
                    onClick={() => handleOpenExisting(art)}
                    className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
                  >
                    {art.name}{" "}
                    <span className="text-gray-400">
                      ({art.width}×{art.height})
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowOpenDialog(false)}
              className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {resizingCanvas && (
        <ResizeCanvasDialog
          width={doc.width}
          height={doc.height}
          onConfirm={handleResizeCanvas}
          onCancel={() => setResizingCanvas(false)}
        />
      )}

      {/* 탭을 닫을 때 저장되지 않은 변경이 있으면 저장/저장 안 함/취소를 묻는다
          (클립스튜디오처럼). ConfirmDialog는 버튼이 2개뿐이라 여기서는 직접 만든다. */}
      {pendingCloseTabIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 bg-white p-4 shadow-xl">
            <p className="mb-4 text-sm text-gray-900">
              &ldquo;
              {pendingCloseTabIndex === activeTabIndex
                ? name
                : tabs[pendingCloseTabIndex]?.doc.name}
              &rdquo;에 저장되지 않은 변경 사항이 있습니다. 저장할까요?
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleCloseSave}
                className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
              >
                저장
              </button>
              <button
                onClick={handleCloseDiscard}
                className="bg-gray-100 py-2 text-xs text-gray-700 hover:bg-gray-200"
              >
                저장 안 함
              </button>
              <button
                onClick={() => setPendingCloseTabIndex(null)}
                className="py-2 text-xs text-gray-400 hover:text-gray-900"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 편집창 전체를 닫을 때도(제목표시줄 X) 열린 탭 중 저장되지 않은 게 있으면
          한 번 더 확인한다. */}
      {pendingExit && (
        <ConfirmDialog
          message="저장되지 않은 변경 사항이 있습니다. 닫으시겠습니까?"
          onConfirm={() => {
            setPendingExit(false);
            onExit();
          }}
          onCancel={() => setPendingExit(false)}
        />
      )}
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
