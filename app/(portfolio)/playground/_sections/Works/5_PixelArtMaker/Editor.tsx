"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import ColorWheel from "./ColorWheel";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import ImportPanel from "./ImportPanel";
import NewCanvasDialog from "./NewCanvasDialog";
import PixelCanvas from "./PixelCanvas";
import Toolbar from "./Toolbar";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import { createGrid, getPixel } from "./pixelGrid";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import { CANVAS_PRESETS, MirrorMode, Tool } from "./types";
import { getWallpaper, saveWallpaper, WALLPAPER_ID, WALLPAPER_NAME } from "./wallpaper";

function blankDoc(width: number, height: number): PixelArt {
  return {
    id: uid(),
    name: "제목 없음",
    width,
    height,
    palette: ["#ffffff", "#000000"],
    pixels: createGrid(width, height),
    createdAt: Date.now(),
  };
}

// 크기 선택 전에도 편집창 자체(툴바·캔버스 영역)가 그 뒤에 보여야
// 크기 선택 다이얼로그가 "편집창 위에 뜬 모달"처럼 느껴진다 — 그래서
// 아직 크기를 고르지 않았어도 임시 draft 캔버스를 미리 만들어 둔다.
function resolveInitialDoc(docId: string | null): { doc: PixelArt; needsSize: boolean } {
  if (docId === WALLPAPER_ID) return { doc: getWallpaper(), needsSize: false };
  if (docId) {
    const existing = getPixelArt(docId);
    if (existing) return { doc: existing, needsSize: false };
  }
  return { doc: blankDoc(CANVAS_PRESETS[0].width, CANVAS_PRESETS[0].height), needsSize: true };
}

export default function Editor({
  docId,
  onDirtyChange,
  onExit,
  closing,
}: {
  docId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
  closing: boolean;
}) {
  const [initial] = useState(() => resolveInitialDoc(docId));
  const [doc, setDoc] = useState<PixelArt>(initial.doc);
  const [needsSize, setNeedsSize] = useState(initial.needsSize);
  const [tool, setTool] = useState<Tool>("pencil");
  const [mirror, setMirror] = useState<MirrorMode>("none");
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [name, setName] = useState(initial.doc.name);
  const [hasMetaEdits, setHasMetaEdits] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
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

  useEffect(() => {
    onDirtyChange(history.canUndo || hasMetaEdits);
  }, [history.canUndo, hasMetaEdits, onDirtyChange]);

  const handleCreate = useCallback(
    (width: number, height: number) => {
      const fresh = blankDoc(width, height);
      setDoc(fresh);
      setName(fresh.name);
      history.reset(fresh.pixels);
      setNeedsSize(false);
      setHasMetaEdits(false);
    },
    [history],
  );

  const handleStrokeEnd = useCallback(
    (next: number[]) => {
      history.push(next);
    },
    [history],
  );

  const handleSave = useCallback(() => {
    // 배경화면은 이름이 고정("배경화면")이고 일반 픽셀아트 목록이 아닌
    // 별도 저장소(wallpaper.ts)에 저장된다.
    const toSave: PixelArt = { ...doc, name: isWallpaper ? WALLPAPER_NAME : name, pixels: history.present };
    if (isWallpaper) saveWallpaper(toSave);
    else savePixelArt(toSave);
    setDoc(toSave);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
  }, [doc, name, history, isWallpaper]);

  useKeyboardShortcuts({
    onToolChange: setTool,
    onUndo: history.undo,
    onRedo: history.redo,
    onCopy: () => selection.copy(history.present, doc.width),
    onPaste: () => {
      const next = selection.paste(history.present, doc.width, doc.height, 0, 0);
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
      setDoc((d) => ({ ...d, palette: d.palette.filter((_, i) => i !== index) }));
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
  // (새 색을 "추가"하는 게 아니라 지금 선택된 색을 "수정"하는 것이 기본 동작).
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
      setMenuAnchor({
        x: rect.left,
        y: rect.bottom,
        items: [
          { label: "저장", onClick: handleSave },
          { label: "PNG로 내보내기", onClick: () => exportAsPNG({ ...doc, pixels: history.present }) },
          { label: "SVG로 내보내기", onClick: () => exportAsSVG({ ...doc, pixels: history.present }) },
          { label: "JSON으로 내보내기", onClick: () => exportAsJSON({ ...doc, pixels: history.present }) },
          {
            label: "JPG로 내보내기 (손실 압축)",
            onClick: () => exportAsJPG({ ...doc, pixels: history.present }),
          },
          { label: "닫기", onClick: onExit },
        ],
      });
    },
    [doc, history, handleSave, onExit],
  );

  const openEditMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuAnchor({
        x: rect.left,
        y: rect.bottom,
        items: [
          { label: "실행취소", onClick: history.undo, disabled: !history.canUndo },
          { label: "다시실행", onClick: history.redo, disabled: !history.canRedo },
          { label: "복사", onClick: () => selection.copy(history.present, doc.width) },
          {
            label: "붙여넣기",
            onClick: () => {
              const next = selection.paste(history.present, doc.width, doc.height, 0, 0);
              history.push(next);
            },
          },
        ],
      });
    },
    [doc, history, selection],
  );

  return (
    <div
      className={`absolute inset-0 z-20 flex h-full flex-col bg-white text-gray-900 shadow-2xl transition-all duration-200 ease-out ${
        mounted && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      {/* 제목표시줄 */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
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
        <button
          onClick={onExit}
          title="닫기"
          className="flex h-6 w-6 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 메뉴 바 */}
      <div className="flex items-center gap-0.5 bg-white px-2 py-1 shadow-sm">
        <button onClick={openFileMenu} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
          파일
        </button>
        <button onClick={openEditMenu} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
          편집
        </button>
      </div>

      {menuAnchor && (
        <ContextMenu x={menuAnchor.x} y={menuAnchor.y} items={menuAnchor.items} onClose={() => setMenuAnchor(null)} />
      )}
      <div className="flex flex-1 gap-4 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            mirror={mirror}
            onMirrorChange={setMirror}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
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
          <ImportPanel
            onConfirm={(imported) => {
              setDoc((d) => ({ ...d, width: imported.width, height: imported.height, palette: imported.palette }));
              history.reset(imported.pixels);
              setHasMetaEdits(true);
            }}
          />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <PixelCanvas
            width={doc.width}
            height={doc.height}
            palette={palette}
            pixels={history.present}
            tool={tool}
            mirror={mirror}
            activeColorIndex={activeColorIndex}
            selectionMask={selection.mask}
            onSelectionChange={selection.setMask}
            onStrokeEnd={handleStrokeEnd}
            onPickColor={handlePickColor}
          />
        </div>
      </div>

      {/* 새 캔버스 크기 선택 — 화면 전체를 대체하는 별도 화면이 아니라
          편집창 자체 위에 뜨는 모달이다(바로 뒤에 draft 캔버스가 보인다). */}
      {needsSize && <NewCanvasDialog onSelect={handleCreate} onCancel={onExit} />}
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
