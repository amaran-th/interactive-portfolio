"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPixelArt, listPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import ColorWheel from "./ColorWheel";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import ImportPanel from "./ImportPanel";
import NewCanvasDialog from "./NewCanvasDialog";
import PixelCanvas from "./PixelCanvas";
import ResizeCanvasDialog from "./ResizeCanvasDialog";
import Toolbar from "./Toolbar";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import { createGrid, getPixel, resizeGrid } from "./pixelGrid";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import { CANVAS_PRESETS, MAX_PALETTE_COLORS, MirrorMode, Tool } from "./types";
import { getWallpaper, saveWallpaper, WALLPAPER_ID, WALLPAPER_NAME } from "./wallpaper";

// choice: "편집기" 런처로 들어와 무엇을 할지 고르는 단계
// size: 새 캔버스 크기를 고르는 단계
// existing: 저장된 작품 중 하나를 골라 여는 단계
// ready: 실제 편집 화면
type StartStep = "choice" | "size" | "existing" | "ready";

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
function resolveInitialDoc(docId: string | null): { doc: PixelArt; found: boolean } {
  if (docId === WALLPAPER_ID) return { doc: getWallpaper(), found: true };
  if (docId) {
    const existing = getPixelArt(docId);
    if (existing) return { doc: existing, found: true };
  }
  return { doc: blankDoc(CANVAS_PRESETS[0].width, CANVAS_PRESETS[0].height), found: false };
}

function resolveInitialStep(found: boolean, startMode: "direct" | "choice"): StartStep {
  if (found) return "ready";
  return startMode === "choice" ? "choice" : "size";
}

export default function Editor({
  docId,
  startMode = "direct",
  onDirtyChange,
  onExit,
  closing,
}: {
  docId: string | null;
  startMode?: "direct" | "choice";
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
  closing: boolean;
}) {
  const [initial] = useState(() => resolveInitialDoc(docId));
  const [doc, setDoc] = useState<PixelArt>(initial.doc);
  const [step, setStep] = useState<StartStep>(() => resolveInitialStep(initial.found, startMode));
  const [wantsAutoImport, setWantsAutoImport] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  const [mirror, setMirror] = useState<MirrorMode>("none");
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [brushSize, setBrushSize] = useState(1);
  const [name, setName] = useState(initial.doc.name);
  const [hasMetaEdits, setHasMetaEdits] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [resizingCanvas, setResizingCanvas] = useState(false);
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
    (width: number, height: number, newName: string) => {
      const fresh = { ...blankDoc(width, height), name: newName };
      setDoc(fresh);
      setName(fresh.name);
      history.reset(fresh.pixels);
      setStep("ready");
      setHasMetaEdits(false);
    },
    [history],
  );

  // "편집기" 런처의 "기존 픽셀 수정하기" 단계에서 목록의 항목을 고르면, 아직 아무것도
  // 그리지 않은 상태이므로(선택 화면 단계라 history/doc이 비어있는 draft뿐) 같은
  // 마운트 안에서 안전하게 doc/이름/히스토리를 그 항목 것으로 다시 채운다.
  const handleOpenExisting = useCallback(
    (art: PixelArt) => {
      setDoc(art);
      setName(art.name);
      history.reset(art.pixels);
      setActiveColorIndex(0);
      setStep("ready");
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

  // 다른 이름으로 저장 — 원본(배경화면이라도)은 건드리지 않고 새 id로 일반
  // 픽셀아트 목록에 별도 항목을 만든 뒤, 이후 편집은 그 새 사본을 대상으로 한다.
  const handleSaveAs = useCallback(() => {
    const newName = window.prompt("다른 이름으로 저장", isWallpaper ? WALLPAPER_NAME : name);
    if (!newName) return;
    const toSave: PixelArt = { ...doc, id: uid(), name: newName, pixels: history.present, createdAt: Date.now() };
    savePixelArt(toSave);
    setDoc(toSave);
    setName(newName);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
  }, [doc, name, history, isWallpaper]);

  // 캔버스 크기 수정 — 그림을 다시 늘리거나 줄이지 않고 경계만 바꾼다(왼쪽 위
  // 기준으로 자르거나 투명하게 늘림). 팔레트·이름 등 다른 속성은 그대로 둔다.
  const handleResizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      const resized = resizeGrid(history.present, doc.width, doc.height, newWidth, newHeight);
      setDoc((d) => ({ ...d, width: newWidth, height: newHeight }));
      history.reset(resized);
      setResizingCanvas(false);
      setHasMetaEdits(true);
    },
    [doc.width, doc.height, history],
  );

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

  // 캔버스에서 지금 실제로 쓰이고 있는 팔레트 인덱스 집합 — history.present가
  // 바뀔 때만(그림을 그리거나 되돌릴 때) 다시 계산되고, 색상환을 드래그하는
  // 동안에는 다시 계산되지 않는다(그림 자체는 안 바뀌므로).
  const usedColorIndices = useMemo(() => new Set(history.present), [history.present]);

  // 색상환을 조작하면 원칙적으로 현재 활성 팔레트 스와치의 값을 실시간으로 갱신한다
  // (새 색을 "추가"하는 게 아니라 지금 선택된 색을 "수정"하는 것이 기본 동작) — 단,
  // 그 스와치로 이미 칠해진 픽셀이 하나라도 있으면 그 픽셀들까지 몰래 같이 바뀌어
  // 버리므로, 이 경우에는 기존 스와치를 그대로 두고 새 스와치를 만들어 활성 색상을
  // 그쪽으로 옮긴다. 아직 아무것도 칠하지 않은 스와치를 다듬는 동안에는 계속
  // 제자리에서 수정되고(핸들이 여러 번 호출돼도 새로 만든 스와치는 아직 미사용
  // 상태이므로 다시 분기되지 않는다), 팔레트가 가득 찼을 때는 분기할 자리가 없어
  // 어쩔 수 없이 기존 동작(제자리 수정)으로 되돌아간다.
  const handleChangeActiveColor = useCallback(
    (hex: string) => {
      if (usedColorIndices.has(activeColorIndex) && palette.length < MAX_PALETTE_COLORS) {
        const newIndex = palette.length;
        setDoc((d) => ({ ...d, palette: [...d.palette, hex] }));
        setActiveColorIndex(newIndex);
        setHasMetaEdits(true);
        return;
      }
      setDoc((d) => {
        const nextPalette = d.palette.slice();
        nextPalette[activeColorIndex] = hex;
        return { ...d, palette: nextPalette };
      });
      setHasMetaEdits(true);
    },
    [activeColorIndex, usedColorIndices, palette.length],
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
          { label: "다른 이름으로 저장", onClick: handleSaveAs },
          { label: "PNG로 내보내기", onClick: () => exportAsPNG({ ...doc, pixels: history.present }) },
          { label: "SVG로 내보내기", onClick: () => exportAsSVG({ ...doc, pixels: history.present }) },
          { label: "JSON으로 내보내기", onClick: () => exportAsJSON({ ...doc, pixels: history.present }) },
          {
            label: "JPG로 내보내기 (손실 압축)",
            onClick: () => exportAsJPG({ ...doc, pixels: history.present }),
          },
        ],
      });
    },
    [doc, history, handleSave, handleSaveAs],
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
          { label: "캔버스 크기 수정", onClick: () => setResizingCanvas(true) },
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
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            onSave={handleSave}
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
            autoOpen={wantsAutoImport}
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
            showGrid={showGrid}
            brushSize={brushSize}
            onSelectionChange={selection.setMask}
            onStrokeEnd={handleStrokeEnd}
            onPickColor={handlePickColor}
          />
        </div>
      </div>

      {/* "편집기" 런처: 무엇을 할지 고르는 첫 단계 */}
      {step === "choice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">편집기</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep("size")}
                className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
              >
                새로 만들기
              </button>
              <button
                onClick={() => setStep("existing")}
                className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
              >
                기존 픽셀 수정하기
              </button>
              <button
                onClick={() => {
                  setWantsAutoImport(true);
                  setStep("ready");
                }}
                className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
              >
                이미지로 불러오기
              </button>
            </div>
            <button onClick={onExit} className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 저장된 작품 중 하나를 골라 연다 */}
      {step === "existing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex max-h-96 w-72 flex-col bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">기존 픽셀 수정하기</h2>
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
                    {art.name} <span className="text-gray-400">({art.width}×{art.height})</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep("choice")} className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
              뒤로
            </button>
          </div>
        </div>
      )}

      {/* 새 캔버스 크기 선택 — 화면 전체를 대체하는 별도 화면이 아니라 편집창 자체
          위에 뜨는 모달이다(바로 뒤에 draft 캔버스가 보인다). "편집기" 런처를 거쳐
          왔으면 취소 시 선택 화면으로 되돌아가고, 데스크탑의 "새로 만들기" 바로가기로
          왔으면(startMode가 "choice"가 아님) 취소 시 편집창을 완전히 닫는다. */}
      {step === "size" && (
        <NewCanvasDialog
          onSelect={handleCreate}
          onImportImage={() => {
            setWantsAutoImport(true);
            setStep("ready");
          }}
          onCancel={() => (startMode === "choice" ? setStep("choice") : onExit())}
        />
      )}

      {resizingCanvas && (
        <ResizeCanvasDialog
          width={doc.width}
          height={doc.height}
          onConfirm={handleResizeCanvas}
          onCancel={() => setResizingCanvas(false)}
        />
      )}
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
