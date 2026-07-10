"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import NewCanvasDialog from "./NewCanvasDialog";
import PalettePanel from "./PalettePanel";
import PixelCanvas from "./PixelCanvas";
import Toolbar from "./Toolbar";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import { createGrid, getPixel } from "./pixelGrid";
import { MirrorMode, Tool } from "./types";

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

export default function Editor({
  docId,
  onDirtyChange,
  onExit,
}: {
  docId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
}) {
  const [doc, setDoc] = useState<PixelArt | null>(() => (docId ? getPixelArt(docId) ?? null : null));
  const [needsSize, setNeedsSize] = useState(docId === null && !doc);
  const [tool, setTool] = useState<Tool>("pencil");
  const [mirror, setMirror] = useState<MirrorMode>("none");
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [name, setName] = useState(doc?.name ?? "제목 없음");

  const history = useCanvasHistory(doc?.pixels ?? []);
  const selection = useSelection();

  useEffect(() => {
    onDirtyChange(history.canUndo);
  }, [history.canUndo, onDirtyChange]);

  const handleCreate = useCallback(
    (width: number, height: number) => {
      const fresh = blankDoc(width, height);
      setDoc(fresh);
      setName(fresh.name);
      history.reset(fresh.pixels);
      setNeedsSize(false);
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
    if (!doc) return;
    const toSave: PixelArt = { ...doc, name, pixels: history.present };
    savePixelArt(toSave);
    setDoc(toSave);
    history.reset(toSave.pixels);
  }, [doc, name, history]);

  useKeyboardShortcuts({
    onToolChange: setTool,
    onUndo: history.undo,
    onRedo: history.redo,
    onCopy: () => doc && selection.copy(history.present, doc.width),
    onPaste: () => {
      if (!doc) return;
      const next = selection.paste(history.present, doc.width, doc.height, 0, 0);
      history.push(next);
    },
    onMirrorToggle: setMirror,
  });

  const palette = useMemo(() => doc?.palette ?? [], [doc]);

  const handleAddColor = useCallback((hex: string) => {
    setDoc((d) => (d ? { ...d, palette: [...d.palette, hex] } : d));
  }, []);

  const handleRemoveColor = useCallback((index: number) => {
    setDoc((d) => (d ? { ...d, palette: d.palette.filter((_, i) => i !== index) } : d));
  }, []);

  const handlePickColor = useCallback((colorIndex: number) => {
    setActiveColorIndex(colorIndex);
  }, []);

  if (needsSize || !doc) {
    return (
      <NewCanvasDialog
        onSelect={handleCreate}
        onCancel={onExit}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button onClick={onExit} className="rounded-full p-2 text-gray-500 hover:bg-white/8 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
        />
        <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-950">
          <Save className="h-3.5 w-3.5" /> 저장
        </button>
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
          <PalettePanel
            palette={palette}
            activeColorIndex={activeColorIndex}
            onSelect={setActiveColorIndex}
            onAddColor={handleAddColor}
            onRemoveColor={handleRemoveColor}
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
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
