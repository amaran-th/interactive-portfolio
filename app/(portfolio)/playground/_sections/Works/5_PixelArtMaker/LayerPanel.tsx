"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers as LayersIcon,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import FileThumbnail from "./FileThumbnail";
import { MAX_LAYERS } from "./types";

export default function LayerPanel({
  layers,
  activeLayerId,
  width,
  height,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMergeDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onToggleVisible,
  onToggleLocked,
  onOpacityChange,
  onOpacityDragEnd,
  onFlatten,
}: {
  // 아래→위 순서(가장 아래가 0번)로 저장된 레이어 배열 — 데이터 모델과
  // Editor의 useCanvasHistory가 쓰는 순서를 그대로 따른다.
  layers: PixelLayer[];
  activeLayerId: string;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMergeDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  // 슬라이더를 드래그하는 동안 onOpacityChange가 연속으로 불려도 실행취소
  // 항목 하나로 묶이도록(Editor가 코얼레싱한다), 포인터를 떼거나 포커스가
  // 빠져나가는 순간 "이 드래그는 끝났다"고 알려준다 — 이게 없으면 같은
  // 레이어를 다시 드래그해도 이전 드래그의 연장으로 오인될 수 있다.
  onOpacityDragEnd: () => void;
  onFlatten: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
  const activeLayer = layers[activeIndex] ?? layers[layers.length - 1];
  // 화면에는 위에서부터(최상단 먼저) 보여준다 — 배열 자체는 아래→위 순서.
  const topToBottom = [...layers].reverse();

  const commitRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white shadow-md">
      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-1.5">
          <LayersIcon className="h-3.5 w-3.5" />
          레이어
        </span>
        <button
          onClick={onFlatten}
          disabled={layers.length <= 1}
          title="모든 레이어를 하나로 평탄화"
          className="text-[10px] font-normal text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          평탄화
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {topToBottom.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${
                isActive ? "bg-violet-50" : "hover:bg-gray-50"
              }`}
            >
              <FileThumbnail width={width} height={height} pixels={layer.pixels} />
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(layer.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 border border-violet-300 px-1 text-xs text-gray-700 outline-none"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(layer.id);
                    setEditingName(layer.name);
                  }}
                  className="min-w-0 flex-1 truncate text-xs text-gray-700"
                  title={layer.name}
                >
                  {layer.name}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLocked(layer.id);
                }}
                title={layer.locked ? "잠금 해제" : "잠그기"}
                className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                  layer.locked
                    ? "text-gray-700"
                    : "text-gray-300 hover:text-gray-600"
                }`}
              >
                {layer.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
                title={layer.visible ? "숨기기" : "보이기"}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800"
              >
                {layer.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-3 py-2">
        <label className="flex items-center gap-2 text-[10px] text-gray-500">
          투명도
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(activeLayer.opacity * 100)}
            onChange={(e) =>
              onOpacityChange(activeLayer.id, Number(e.target.value) / 100)
            }
            onPointerUp={onOpacityDragEnd}
            onBlur={onOpacityDragEnd}
            className="flex-1"
          />
          <span className="w-7 shrink-0 text-right">
            {Math.round(activeLayer.opacity * 100)}%
          </span>
        </label>
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-2 py-1.5">
        <button
          onClick={onAdd}
          disabled={layers.length >= MAX_LAYERS}
          title="레이어 추가"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDuplicate(activeLayerId)}
          disabled={layers.length >= MAX_LAYERS}
          title="레이어 복제"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(activeLayerId)}
          disabled={layers.length <= 1}
          title="레이어 삭제"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMergeDown(activeLayerId)}
          disabled={activeIndex <= 0}
          title="아래 레이어와 병합"
          className="flex h-7 w-7 items-center justify-center text-[10px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          병합
        </button>
        <button
          onClick={() => onMoveUp(activeLayerId)}
          disabled={activeIndex < 0 || activeIndex >= layers.length - 1}
          title="위로 이동"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMoveDown(activeLayerId)}
          disabled={activeIndex <= 0}
          title="아래로 이동"
          className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
