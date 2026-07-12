"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import ColorWheel from "./ColorWheel";
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
    const toSave: PixelArt = { ...doc, name, pixels: history.present };
    savePixelArt(toSave);
    setDoc(toSave);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
  }, [doc, name, history]);

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

  return (
    <div
      className={`absolute inset-0 z-20 flex h-full flex-col bg-white text-gray-900 shadow-2xl transition-all duration-200 ease-out ${
        mounted && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3">
        <button onClick={onExit} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setHasMetaEdits(true);
          }}
          className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none"
        />
        <button onClick={handleSave} className="flex items-center gap-1.5 bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600">
          <Save className="h-3.5 w-3.5" /> 저장
        </button>
        <div className="flex gap-1">
          <button onClick={() => exportAsPNG({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            PNG
          </button>
          <button onClick={() => exportAsSVG({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            SVG
          </button>
          <button onClick={() => exportAsJSON({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            JSON
          </button>
          <button
            onClick={() => exportAsJPG({ ...doc, pixels: history.present })}
            title="JPG는 손실 압축이라 팔레트 색상 경계가 흐려질 수 있습니다"
            className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
          >
            JPG
          </button>
        </div>
      </div>
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
